# MirrorQueryPlan

This document describes the `MirrorQueryPlan` type system and `QueryBuilder` class used to query our synced MongoDB collections (the "mirror" of RealGreen data) from the client side.

---

## Background

The mirror pipeline reads from our synced MongoDB collections (`CustomerModel`, `ProgramModel`, `ServiceModel`) instead of calling the RealGreen API. This eliminates pagination bottlenecks and enables precise, surgical queries against any field on any entity.

The challenge: the client cannot send functions to the server. The query logic must be expressed as a **serializable data structure** — a plain object array that the server can interpret and execute as MongoDB queries.

---

## Core Concept: The Query Plan

A `MirrorQueryPlan` is an ordered array of `MirrorStep` objects. Each step:
1. Queries one MongoDB collection (customer, program, or service)
2. Optionally receives join values from a previous step
3. Optionally exposes join values to subsequent steps
4. Optionally returns its results to the client

Steps execute sequentially. The server maintains a "provides registry" — a map of `stepName → { custId: number[], progId: number[], servId: number[] }` — that downstream steps can reference.

---

## Step Roles

A step can play any combination of two roles:

| Role | Meaning |
|---|---|
| `"provider"` | Exposes join key values from its results for downstream steps to use |
| `"entity"` | Its results are included in the streaming payload returned to the client |

A step with neither role is a "bridge" — it queries data to feed downstream steps but doesn't return results. This is valid but unusual.

---

## Filter System

Filters are expressed as a tree of `FilterNode` objects. The tree supports arbitrary nesting of AND/OR groups.

### Operators

```
"eq"     — field === value
"ne"     — field !== value
"in"     — field is in value[] (value must be an array)
"nin"    — field is not in value[]
"gt"     — field > value
"gte"    — field >= value
"lt"     — field < value
"lte"    — field <= value
"exists" — field exists (value: true/false)
```

### Filter Tree

```typescript
// A leaf condition
type FilterCondition<TCore> = {
  field: keyof TCore;
  operator: FilterOperator;
  value: unknown;
};

// A group of conditions combined with AND or OR
type FilterGroup<TCore> =
  | { and: FilterNode<TCore>[] }
  | { or:  FilterNode<TCore>[] };

// A node is either a leaf or a group
type FilterNode<TCore> = FilterCondition<TCore> | FilterGroup<TCore>;
```

### Convenience: Flat Array = AND

When all conditions are AND'd, you can pass a flat `FilterCondition[]` instead of a `FilterGroup`. The server treats a flat array as `{ and: [...] }`.

### Example: Complex Filter

`(status === "$" OR size > 100) AND season === 2026`

```typescript
filters: {
  and: [
    {
      or: [
        { field: "status", operator: "eq",  value: "$" },
        { field: "size",   operator: "gt",  value: 100 },
      ]
    },
    { field: "season", operator: "eq", value: 2026 },
  ]
}
```

---

## Step Source: Where Do Filter Values Come From?

Each step has a `source` discriminant:

| Source | Meaning |
|---|---|
| `"values"` | Filter values are hardcoded in the `filters` array (seed step) |
| `"step"` | Filter values come from a previous step's `provides` registry |

When `source: "step"`, the step also specifies:
- `fromStep: string` — the `stepName` of the source step
- `joinKey: JoinKey` — which join key to pull from the source step's provides registry, AND which field on this model to filter by

`joinKey` is always the same on both sides of the join (e.g., `"custId"` joins `service.custId` to `customer.custId`).

---

## `provides` — Exposing Join Keys

A step can expose join key values from its results for downstream steps:

```typescript
provides?: Partial<Record<JoinKey, true>>;
// e.g., { custId: true, progId: true }
```

After executing the step's query, the server extracts the specified fields from all result docs and stores them in the provides registry under `stepName`.

**Only join keys can be provided:** `"custId"`, `"progId"`, `"servId"`. These are the only fields used for cross-entity joins.

---

## Field Autocomplete

The `filters` field is typed against the **Core type** of the model:
- `model: "customer"` → `keyof CustomerCore`
- `model: "program"` → `keyof ProgramCore`
- `model: "service"` → `keyof ServiceCore`

This gives full autocomplete and type safety when writing filters. Wrong field names are caught at compile time.

---

## The `QueryBuilder` Class

`QueryBuilder` provides a fluent dot-chain API for constructing `MirrorQueryPlan` arrays. It enforces model-specific field types at each step.

```typescript
const plan = new QueryBuilder()
  .addServiceStep(["provider"], {
    stepName: "getPrintedServIds",
    source: "values",
    filters: [{ field: "status", operator: "eq", value: "$" }],
    provides: { custId: true },
  })
  .addCustomerStep(["entity", "provider"], {
    stepName: "getCustomers",
    source: "step",
    fromStep: "getPrintedServIds",
    joinKey: "custId",
    filters: [],
    provides: { custId: true },
  })
  .addProgramStep(["entity", "provider"], {
    stepName: "getPrograms",
    source: "step",
    fromStep: "getCustomers",
    joinKey: "custId",
    filters: [],
    provides: { progId: true },
  })
  .addServiceStep(["entity"], {
    stepName: "getAllServices",
    source: "step",
    fromStep: "getPrograms",
    joinKey: "progId",
    filters: [],
  })
  .build();
```

### Methods

| Method | Description |
|---|---|
| `.addCustomerStep(roles, config)` | Adds a customer query step |
| `.addProgramStep(roles, config)` | Adds a program query step |
| `.addServiceStep(roles, config)` | Adds a service query step |
| `.build()` | Returns the completed `MirrorQueryPlan` |

---

## Server Execution

The server executes the plan sequentially:

1. For each step, determine filter values:
   - `source: "values"` → use hardcoded filter values directly
   - `source: "step"` → look up `provides[joinKey]` from the named step's registry entry; use as `{ [joinKey]: { $in: [...] } }`
2. Combine the join filter (if any) with the step's `filters` tree using `$and`
3. Execute the MongoDB query
4. If `provides` is set, extract those fields from results and store in the provides registry
5. If `"entity"` is in `roles`, stream the results back as a chunk

### Streaming

Results are streamed as NDJSON chunks using the same `StreamChunk` shape as the existing RealGreen pipeline:
```
{ stepName: "customers", data: { customerDocs: [...] } }
{ stepName: "programs",  data: { programDocs: [...] } }
{ stepName: "services",  data: { serviceDocs: [...] } }
```

The receiving slice's `receiveChunk` reducer handles these identically to search scheme results.

---

## Type Reference

```typescript
type MirrorModel = "customer" | "program" | "service";
type JoinKey = "custId" | "progId" | "servId";
type StepRole = "provider" | "entity";
type FilterOperator = "eq" | "ne" | "in" | "nin" | "gt" | "gte" | "lt" | "lte" | "exists";

type FilterCondition<TCore> = {
  field: keyof TCore;
  operator: FilterOperator;
  value: unknown;
};

type FilterGroup<TCore> =
  | { and: FilterNode<TCore>[] }
  | { or:  FilterNode<TCore>[] };

type FilterNode<TCore> = FilterCondition<TCore> | FilterGroup<TCore>;
type FiltersInput<TCore> = FilterCondition<TCore>[] | FilterNode<TCore>;

type MirrorStepSource =
  | { source: "values" }
  | { source: "step"; fromStep: string; joinKey: JoinKey };

type MirrorStep<M extends MirrorModel = MirrorModel> = {
  model: M;
  stepName: string;
  roles: StepRole[];
  filters: FiltersInput<CoreForModel<M>>;
  provides?: Partial<Record<JoinKey, true>>;
} & MirrorStepSource;

type MirrorQueryPlan = MirrorStep[];
```

---

## Files

```
src/app/realGreen/customer/mirror/
  MirrorQueryPlan.md        ← this document
  MirrorTypes.ts            ← all types above
  QueryBuilder.ts           ← QueryBuilder class
  CustomerMirrorContract.ts ← API contract (getMirrorCustomers op)
  api/
    route.ts                ← server-side plan executor
```

---

## Status

| Step | Status |
|---|---|
| Design + documentation | ✅ Done |
| `MirrorTypes.ts` | ⬜ Not started |
| `QueryBuilder.ts` | ⬜ Not started |
| Update `CustomerMirrorContract.ts` with plan params | ⬜ Not started |
| Implement server-side plan executor in `mirror/api/route.ts` | ⬜ Not started |
| Wire into corrupted records UI | ⬜ Not started (blocked on UI) |
