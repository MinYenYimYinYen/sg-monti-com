# Mirror Refactor Guide

This document is the agent's instruction set for migrating a customer context
from the RealGreen API pipeline to the mirror pipeline.

---

## Required Reading

Read **only** these files before starting. Do not open additional files without
asking the user first. Use MCP server lookups (`ide_find_class`, `ide_find_references`)
to peek at types without opening full files.

| File | Purpose |
|---|---|
| `src/app/realGreen/customer/mirror/MirrorQueryPlan.md` | Full mirror system docs — read this first |
| `src/app/realGreen/customer/mirror/MirrorTypes.ts` | Type reference for filters, steps, plans |
| `src/app/realGreen/customer/mirror/QueryBuilder.ts` | Builder API |
| `src/app/realGreen/customer/slices/customerSlices.ts` | Slice registry and context modes |
| `src/app/realGreen/customer/_lib/searchUtil/searchSchemes/searchSchemes.ts` | Existing search schemes (the thing being replaced) |

If you need more context beyond these files, **stop and ask the user** before reading anything else.

---

## Architecture Decisions (do not change these)

1. **Keep the slice architecture.** Each customer context (`"active"`, `"printed"`, etc.)
   keeps its own named slice, thunk, and registry entry. The ~5-second mirror load time
   is acceptable, and the existing architecture preserves state across navigation.

2. **Replace `createGetCustDocsThunk` with `createGetCustDocsMirrorThunk`** for the
   target context. The slice itself (`createCustomerSlice`) is unchanged.

3. **`runDeltaSync` is called automatically** by the mirror route before every query.
   No changes needed to sync infrastructure.

---

## Refactor Process

### Step 1 — Interview the user about the context

Before writing any code, ask the user these questions one at a time:

1. **Which context are we migrating?** (e.g., `"active"`, `"printed"`, `"lastSeasonProduction"`)
2. **What is the business intent of this context?** What data does it need and why?
3. **What filters does the current search scheme apply?** Walk through the scheme steps together.
4. **Are there opportunities to improve the query?** The mirror can filter on any field on
   `CustomerCore`, `ProgramCore`, or `ServiceCore`. Ask: are there fields the old scheme
   couldn't filter on that would make the query more precise or faster?
5. **What season(s) are needed?** Single season, multi-season, or all-time?
6. **What entity order makes sense?** The mirror can start from any entity — pick the most
   selective starting point (fewest results) to minimize downstream join sizes.

Do not proceed to Step 2 until the query intent is agreed upon.

### Step 2 — Build the QueryBuilder plan together

Present the proposed `QueryBuilder` chain to the user for review **before implementing**.
Show the full plan as a code block. Example structure:

```typescript
const plan = new QueryBuilder()
  .addCustomerStep(["entity", "provider"], {
    stepName: "...",
    source: "values",
    filters: [{ field: "status", operator: "eq", value: "9" }],
    provides: { custId: true },
  })
  .addProgramStep(["entity", "provider"], {
    stepName: "...",
    source: "step",
    fromStep: "...",
    joinKey: "custId",
    filters: [{ field: "season", operator: "eq", value: season }],
    provides: { progId: true },
  })
  .addServiceStep(["entity"], {
    stepName: "...",
    source: "step",
    fromStep: "...",
    joinKey: "progId",
    filters: [],
  })
  .build();
```

Confirm the plan with the user. Adjust until both agree it correctly captures the intent.

### Step 3 — Implement

In `customerSlices.ts`, for the target context:

1. Change `createGetCustDocsThunk(...)` to `createGetCustDocsMirrorThunk(...)`
2. Update the corresponding hook (`use[Context]Customers.ts`) to pass `{ params: { plan } }`
   instead of `{ params: { schemeName, season } }`
3. Remove the old search scheme from `searchSchemes.ts` if it is no longer used elsewhere

**No changes needed to:**
- The slice itself (`createCustomerSlice`)
- The registry entry in `customerSliceRegistry`
- `customerReducers.ts`
- `centralCustomerSlice`

### Step 4 — Verify

Run `npx tsc --noEmit` to confirm no type errors.
Test the context in the browser and confirm data loads correctly.

---

## Filter Field Reference

Filters are typed against the Core types. Use MCP `ide_find_class` to look up
available fields without opening the full files.

| Model | Core Type | Key fields |
|---|---|---|
| `"customer"` | `CustomerCore` | `custId`, `status`, `updated` |
| `"program"` | `ProgramCore` | `progId`, `custId`, `season`, `status`, `updated` |
| `"service"` | `ServiceCore` | `servId`, `progId`, `custId`, `season`, `status`, `servCodeId`, `updated` |

---

## Key Differences from RealGreen API

| Aspect | RealGreen API | Mirror |
|---|---|---|
| Data source | Live RealGreen API | Synced MongoDB (delta-synced before each query) |
| Pagination | Required (500 records/page, exponential batching) | None — single MongoDB query per step |
| Filter fields | Limited to RealGreen search API params | Any field on the Core type |
| Load time (active customers ~2,200) | ~38 seconds | ~5 seconds |
| Corrupted record handling | Binary search recovery mid-fetch | Not applicable (cleaned at sync time) |
| Starting entity | Constrained by scheme design | Any entity — pick the most selective |
| Multi-season queries | Requires separate scheme steps | Single filter with `"in"` or range operators |
