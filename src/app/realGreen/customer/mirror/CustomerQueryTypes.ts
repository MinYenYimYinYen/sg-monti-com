import { CustomerCore } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { ProgramCore } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { ServiceCore } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

// ---------------------------------------------------------------------------
// Entity Type + Join Key
// ---------------------------------------------------------------------------

/**
 * The three RealGreen entity types queryable through the customer query pipeline.
 * Named "CustomerEntityType" to align with the app's EntityType naming convention
 * and to distinguish from the sync/mirror infrastructure layer.
 */
export type CustomerEntityType = "customer" | "program" | "service";

/** The three fields used for cross-entity joins in the customer/program/service graph. */
export type JoinKey = "custId" | "progId" | "servId";

// ---------------------------------------------------------------------------
// Step Roles
// ---------------------------------------------------------------------------

/**
 * A step can play any combination of two roles:
 * - "provider": exposes join key values from its results for downstream steps
 * - "entity": its results are included in the streaming payload returned to the client
 *
 * A step with neither role is a "bridge" — it queries data to feed downstream
 * steps but doesn't return results. Valid but unusual.
 */
export type StepRole = "provider" | "entity";

// ---------------------------------------------------------------------------
// Filter System
// ---------------------------------------------------------------------------

export type FilterOperator =
  | "eq"     // field === value
  | "ne"     // field !== value
  | "in"     // field is in value[] (value must be an array)
  | "nin"    // field is not in value[]
  | "gt"     // field > value
  | "gte"    // field >= value
  | "lt"     // field < value
  | "lte"    // field <= value
  | "exists" // field exists (value: true/false)
  ;

/** A single filter condition on a specific field of the entity's Core type. */
export type FilterCondition<TCore> = {
  field: keyof TCore;
  operator: FilterOperator;
  value: unknown;
};

/**
 * A group of filter nodes combined with AND or OR.
 * Supports arbitrary nesting for complex query expressions.
 *
 * Example: (status === "$" OR size > 100) AND season === 2026
 * ```
 * { and: [
 *   { or: [
 *     { field: "status", operator: "eq", value: "$" },
 *     { field: "size",   operator: "gt", value: 100 },
 *   ]},
 *   { field: "season", operator: "eq", value: 2026 },
 * ]}
 * ```
 */
export type FilterGroup<TCore> =
  | { and: FilterNode<TCore>[] }
  | { or:  FilterNode<TCore>[] };

/** A filter node is either a leaf condition or a group of nodes. */
export type FilterNode<TCore> = FilterCondition<TCore> | FilterGroup<TCore>;

/**
 * Convenience input type: accepts either a flat array of conditions (auto-AND'd
 * by the server) or a full FilterNode tree for complex AND/OR expressions.
 */
export type FiltersInput<TCore> = FilterCondition<TCore>[] | FilterNode<TCore>;

// ---------------------------------------------------------------------------
// Query Step Source: Where Do Filter Values Come From?
// ---------------------------------------------------------------------------

/**
 * Discriminated union on `source`:
 * - "values": filter values are hardcoded in the `filters` array (seed step)
 * - "step": filter values come from a previous step's `provides` registry
 *
 * When `source: "step"`:
 * - `fromStep` — the `stepName` of the source step
 * - `joinKey` — which join key to pull from the source step's provides registry,
 *   AND which field on this entity to filter by (always the same on both sides)
 */
export type QueryStepSource =
  | { source: "values" }
  | { source: "step"; fromStep: string; joinKey: JoinKey };

// ---------------------------------------------------------------------------
// Core Type Map
// ---------------------------------------------------------------------------

/** Maps a CustomerEntityType to its corresponding Core type for field autocomplete. */
export type CoreForEntity<E extends CustomerEntityType> =
  E extends "customer" ? CustomerCore :
  E extends "program"  ? ProgramCore  :
  E extends "service"  ? ServiceCore  :
  never;

// ---------------------------------------------------------------------------
// Query Step
// ---------------------------------------------------------------------------

/**
 * A single step in a CustomerQueryPlan.
 *
 * The generic parameter `E` narrows `filters` to `keyof CoreForEntity<E>`,
 * providing autocomplete and compile-time field validation.
 *
 * `provides` declares which join keys to extract from this step's results
 * and make available to downstream steps via the server's provides registry.
 */
export type QueryStep<E extends CustomerEntityType = CustomerEntityType> = {
  model: E;
  stepName: string;
  roles: StepRole[];
  filters: FiltersInput<CoreForEntity<E>>;
  /** Which join keys to expose to downstream steps. */
  provides?: Partial<Record<JoinKey, true>>;
} & QueryStepSource;

// ---------------------------------------------------------------------------
// Customer Query Plan
// ---------------------------------------------------------------------------

/**
 * An ordered array of QueryStep objects that the server executes sequentially.
 *
 * The server maintains a "provides registry" — a map of stepName → extracted
 * join key values — that downstream steps reference via `source: "step"`.
 *
 * Build plans using the CustomerQueryBuilder class for type-safe autocomplete:
 * ```typescript
 * const plan = new CustomerQueryBuilder()
 *   .addServiceStep(["entity", "provider"], { ... })
 *   .addCustomerStep(["entity"], { ... })
 *   .build();
 * ```
 *
 * See MirrorQueryPlan.md for full documentation.
 */
export type CustomerQueryPlan = QueryStep[];
