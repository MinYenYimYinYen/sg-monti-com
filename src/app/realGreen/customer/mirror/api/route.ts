import { NextResponse } from "next/server";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { CustomerMirrorContract } from "@/app/realGreen/customer/mirror/CustomerMirrorContract";
import {
  FilterCondition,
  FilterGroup,
  FilterNode,
  FiltersInput,
  JoinKey,
  MirrorQueryPlan,
  MirrorStep,
} from "@/app/realGreen/customer/mirror/MirrorTypes";
import { CustomerModel } from "@/app/realGreen/customer/models/CustomerModel";
import { ProgramModel } from "@/app/realGreen/customer/models/ProgramModel";
import { ServiceModel } from "@/app/realGreen/customer/models/ServiceModel";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";
import { StreamChunk } from "@/app/realGreen/customer/api/CustomerContract";
import { runDeltaSync } from "@/app/realGreen/customer/sync/runDeltaSync";

// ---------------------------------------------------------------------------
// Filter Translation
// ---------------------------------------------------------------------------

const OPERATOR_MAP: Record<string, string> = {
  eq:     "$eq",
  ne:     "$ne",
  in:     "$in",
  nin:    "$nin",
  gt:     "$gt",
  gte:    "$gte",
  lt:     "$lt",
  lte:    "$lte",
  exists: "$exists",
};

function isFilterGroup<TCore>(node: FilterNode<TCore>): node is FilterGroup<TCore> {
  return "and" in node || "or" in node;
}

function translateFilterNode<TCore>(node: FilterNode<TCore>): Record<string, unknown> {
  if (isFilterGroup(node)) {
    if ("and" in node) {
      return { $and: node.and.map(translateFilterNode) };
    }
    return { $or: node.or.map(translateFilterNode) };
  }

  // Leaf condition
  const condition = node as FilterCondition<TCore>;
  const mongoOp = OPERATOR_MAP[condition.operator];
  if (!mongoOp) throw new Error(`Unknown filter operator: ${condition.operator}`);
  return { [condition.field as string]: { [mongoOp]: condition.value } };
}

function translateFilters<TCore>(filters: FiltersInput<TCore>): Record<string, unknown> {
  if (Array.isArray(filters)) {
    // Flat array → AND all conditions
    if (filters.length === 0) return {};
    if (filters.length === 1) return translateFilterNode(filters[0] as FilterNode<TCore>);
    return { $and: filters.map((f) => translateFilterNode(f as FilterNode<TCore>)) };
  }
  return translateFilterNode(filters as FilterNode<TCore>);
}

// ---------------------------------------------------------------------------
// Provides Registry
// ---------------------------------------------------------------------------

type ProvidesRegistry = Map<string, Partial<Record<JoinKey, number[]>>>;

function extractProvides(
  docs: Record<string, unknown>[],
  provides: Partial<Record<JoinKey, true>>,
): Partial<Record<JoinKey, number[]>> {
  const result: Partial<Record<JoinKey, number[]>> = {};
  for (const key of Object.keys(provides) as JoinKey[]) {
    const values = docs
      .map((doc) => doc[key])
      .filter((v): v is number => typeof v === "number");
    result[key] = [...new Set(values)];
  }
  return result;
}

// ---------------------------------------------------------------------------
// Model Lookup
// ---------------------------------------------------------------------------

// The three models have different generic signatures that aren't mutually compatible
// as a union. We use a common lean query interface to avoid the union callability issue.
type LeanQueryable = {
  find(filter: Record<string, unknown>): { lean(): Promise<Record<string, unknown>[]> };
};

function getModel(model: MirrorStep["model"]): LeanQueryable {
  switch (model) {
    case "customer": return CustomerModel as unknown as LeanQueryable;
    case "program":  return ProgramModel as unknown as LeanQueryable;
    case "service":  return ServiceModel as unknown as LeanQueryable;
  }
}

function getChunkKey(model: MirrorStep["model"]): keyof StreamChunk["data"] {
  switch (model) {
    case "customer": return "customerDocs";
    case "program":  return "programDocs";
    case "service":  return "serviceDocs";
  }
}

// ---------------------------------------------------------------------------
// Plan Executor
// ---------------------------------------------------------------------------

async function executePlan(
  plan: MirrorQueryPlan,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController,
): Promise<void> {
  const registry: ProvidesRegistry = new Map();

  for (const step of plan) {
    // Build the MongoDB query
    let mongoQuery: Record<string, unknown> = {};

    if (step.source === "step") {
      // Get join values from the provides registry
      const sourceProvides = registry.get(step.fromStep);
      const joinValues = sourceProvides?.[step.joinKey];

      if (!joinValues || joinValues.length === 0) {
        console.warn(`[mirror] Step "${step.stepName}": fromStep "${step.fromStep}" provided no values for joinKey "${step.joinKey}" — skipping`);
        continue;
      }

      mongoQuery[step.joinKey] = { $in: joinValues };
    }

    // Merge additional filters
    const filterQuery = translateFilters(step.filters);
    if (Object.keys(filterQuery).length > 0) {
      if (Object.keys(mongoQuery).length > 0) {
        mongoQuery = { $and: [mongoQuery, filterQuery] };
      } else {
        mongoQuery = filterQuery;
      }
    }

    // Execute the query — cast through unknown to avoid Mongoose union callability issue
    const Model = getModel(step.model);
    const rawDocs = (await Model.find(mongoQuery).lean()) as unknown as Record<string, unknown>[];
    const docs = cleanMongoArray(rawDocs) as Record<string, unknown>[];

    console.log(`[mirror] Step "${step.stepName}" (${step.model}): ${docs.length} docs`);

    // Update provides registry
    if (step.provides && Object.keys(step.provides).length > 0) {
      registry.set(step.stepName, extractProvides(docs, step.provides));
    }

    // Stream entity chunk if this step returns results.
    // The chunk's stepName must be the canonical entity name ("customers" | "programs" | "services")
    // so that the receiveChunk reducer can route the data to the correct state array.
    // The plan step name (step.stepName) is internal to the server and used only for fromStep references.
    if (step.roles.includes("entity") && docs.length > 0) {
      const chunkKey = getChunkKey(step.model);
      const entityStepName =
        step.model === "customer" ? "customers" :
        step.model === "program"  ? "programs"  :
        "services";
      const chunk: StreamChunk = {
        stepName: entityStepName,
        data: { [chunkKey]: docs },
      };
      controller.enqueue(encoder.encode(JSON.stringify(chunk) + "\n"));
    }
  }
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

const handlers: HandlerMap<CustomerMirrorContract> = {
  getMirrorCustomers: {
    roles: ["admin", "office", "tech"],
    handler: async ({ plan }) => {
      console.log("[mirror] getMirrorCustomers handler triggered with plan steps:", plan.map(s => s.stepName));
      await connectToMongoDB();

      // Sync all three entity types from RealGreen before querying the mirror.
      // Uses delta sync (only records updated since last sync) so this is fast
      // on subsequent calls. Runs concurrently across all three entities.
      await runDeltaSync();

      const encoder = new TextEncoder();

      return new ReadableStream({
        async start(controller) {
          try {
            await executePlan(plan, encoder, controller);
            console.log("[mirror] executePlan complete, closing stream");
            controller.close();
          } catch (e) {
            console.error("[mirror] Plan execution error:", e);
            const errorChunk = {
              success: false,
              message: e instanceof Error ? e.message : "Unknown mirror error",
            };
            controller.enqueue(encoder.encode(JSON.stringify(errorChunk) + "\n"));
            controller.close();
          }
        },
      });
    },
  },
};

export const POST = createRpcHandler(handlers);

// Suppress unused import warning — NextResponse is used by createRpcHandler internally
void NextResponse;
