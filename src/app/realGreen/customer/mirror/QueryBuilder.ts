import {
  FiltersInput,
  JoinKey,
  MirrorQueryPlan,
  MirrorStep,
  MirrorStepSource,
  StepRole,
  CoreForModel,
} from "@/app/realGreen/customer/mirror/MirrorTypes";

// ---------------------------------------------------------------------------
// Step Config Types
// ---------------------------------------------------------------------------

/**
 * Config for a step that seeds its own filter values (no dependency on a previous step).
 */
type SeedStepConfig<M extends "customer" | "program" | "service"> = {
  stepName: string;
  source: "values";
  filters: FiltersInput<CoreForModel<M>>;
  provides?: Partial<Record<JoinKey, true>>;
};

/**
 * Config for a step that receives join values from a previous step.
 * Additional `filters` are AND'd with the join filter on the server.
 */
type DependentStepConfig<M extends "customer" | "program" | "service"> = {
  stepName: string;
  source: "step";
  fromStep: string;
  joinKey: JoinKey;
  filters: FiltersInput<CoreForModel<M>>;
  provides?: Partial<Record<JoinKey, true>>;
};

type StepConfig<M extends "customer" | "program" | "service"> =
  | SeedStepConfig<M>
  | DependentStepConfig<M>;

// ---------------------------------------------------------------------------
// QueryBuilder
// ---------------------------------------------------------------------------

/**
 * Fluent builder for constructing a `MirrorQueryPlan`.
 *
 * Each `addXxxStep` method is typed to the model's Core type, providing
 * autocomplete on `filters.field` and compile-time validation of field names.
 *
 * ---
 *
 * **Simple example — flat AND filters (most common):**
 * ```typescript
 * const plan = new QueryBuilder()
 *   .addServiceStep(["provider"], {
 *     stepName: "getPrintedServIds",
 *     source: "values",
 *     filters: [{ field: "status", operator: "eq", value: "$" }],
 *     provides: { custId: true },
 *   })
 *   .addCustomerStep(["entity", "provider"], {
 *     stepName: "getCustomers",
 *     source: "step",
 *     fromStep: "getPrintedServIds",
 *     joinKey: "custId",
 *     filters: [],
 *     provides: { custId: true },
 *   })
 *   .build();
 * ```
 *
 * ---
 *
 * **Complex example — OR inside AND:**
 *
 * Goal: services where `(status === "$" OR size > 100) AND season === 2026`
 *
 * ```typescript
 * const plan = new QueryBuilder()
 *   .addServiceStep(["entity"], {
 *     stepName: "filteredServices",
 *     source: "values",
 *     filters: {
 *       and: [
 *         {
 *           or: [
 *             { field: "status", operator: "eq",  value: "$" },
 *             { field: "size",   operator: "gt",  value: 100 },
 *           ],
 *         },
 *         { field: "season", operator: "eq", value: 2026 },
 *       ],
 *     },
 *   })
 *   .build();
 * ```
 *
 * The server translates this to:
 * `{ $and: [{ $or: [{ status: "$" }, { size: { $gt: 100 } }] }, { season: 2026 }] }`
 *
 * ---
 *
 * See MirrorQueryPlan.md for full documentation and examples.
 */
export class QueryBuilder {
  // Use unknown[] internally to avoid the generic variance issue when pushing
  // narrowly-typed MirrorStep<M> into a MirrorStep[] array. The build() method
  // returns the correctly-typed MirrorQueryPlan.
  private readonly steps: unknown[] = [];

  addCustomerStep(roles: StepRole[], config: StepConfig<"customer">): this {
    const source: MirrorStepSource =
      config.source === "step"
        ? { source: "step", fromStep: config.fromStep, joinKey: config.joinKey }
        : { source: "values" };

    this.steps.push({
      model: "customer",
      stepName: config.stepName,
      roles,
      filters: config.filters,
      provides: config.provides,
      ...source,
    });

    return this;
  }

  addProgramStep(roles: StepRole[], config: StepConfig<"program">): this {
    const source: MirrorStepSource =
      config.source === "step"
        ? { source: "step", fromStep: config.fromStep, joinKey: config.joinKey }
        : { source: "values" };

    this.steps.push({
      model: "program",
      stepName: config.stepName,
      roles,
      filters: config.filters,
      provides: config.provides,
      ...source,
    });

    return this;
  }

  addServiceStep(roles: StepRole[], config: StepConfig<"service">): this {
    const source: MirrorStepSource =
      config.source === "step"
        ? { source: "step", fromStep: config.fromStep, joinKey: config.joinKey }
        : { source: "values" };

    this.steps.push({
      model: "service",
      stepName: config.stepName,
      roles,
      filters: config.filters,
      provides: config.provides,
      ...source,
    });

    return this;
  }

  /** Returns the completed MirrorQueryPlan. */
  build(): MirrorQueryPlan {
    return this.steps as MirrorQueryPlan;
  }
}
