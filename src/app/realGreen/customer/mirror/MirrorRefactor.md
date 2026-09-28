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

4. **Refresh thunks stay on the RealGreen pipeline.** `createRefreshCustomerThunk` is not
   migrated. Since a full mirror reload is ~5 seconds, per-customer refresh via the RealGreen
   API remains the right tool for mid-session single-customer updates. The hook's
   `refreshCustomer` function is left unchanged when migrating a context.

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

1. Add the context to the `PIPELINE` constant with `"mirror"`. The `createGetDocsThunk` helper
   reads this flag and automatically routes to `createGetCustDocsMirrorThunk`.
2. Update the corresponding hook to branch on `PIPELINE[context]` and dispatch with the correct
   param shape for each pipeline.
3. Keep the RealGreen path (search scheme) intact in the hook for easy rollback.
4. Keep the search scheme in `searchSchemes.ts` — do not delete it until the context is fully
   retired from RealGreen.

**No changes needed to:**
- The slice itself (`createCustomerSlice`)
- The registry entry in `customerSliceRegistry`
- `customerReducers.ts`
- `centralCustomerSlice`

#### Hook pattern A — `autoLoad` contexts (most contexts)

For contexts with a dedicated hook that uses `autoLoad` (e.g., `useActiveCustomers`,
`usePrintedCustomers`), branch on `PIPELINE[context]` in both `useEffect` and `refresh()`:

```typescript
if (PIPELINE.active === "mirror") {
  const plan = buildActiveCustomersPlan(season);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (dispatch as any)(activeCustomersGetDocs({ params: { plan } as any, config: { ... } as any }));
} else {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (dispatch as any)(activeCustomersGetDocs({ params: { schemeName: "activeCustomers", season } as any, config: { ... } as any }));
}
```

The `(dispatch as any)` cast is required because `printedCustomersGetDocs` has a union param
type (`{ plan } | { schemeName, season }`) that TypeScript cannot narrow through a runtime flag
check. This is the established pattern — scope the `any` to just the dispatch call.

#### Hook pattern B — `loadByServIds` contexts (byAssignment, priorityService)

For contexts dispatched inline from feature code with a dynamic list of `servIds`, create a
dedicated hook that exposes `loadByServIds(servIds, config?)`:

```typescript
// useByAssignmentCustomers.ts
export function useByAssignmentCustomers() {
  const dispatch = useAppDispatch();
  const season = useSelector(globalSettingsSelect.season);

  const loadByServIds = (servIds: number[], config?: LoadConfig) => {
    if (!season || !servIds.length) return;
    if (PIPELINE.byAssignment === "mirror") {
      const plan = buildByAssignmentPlan(season, servIds);
      (dispatch as any)(byAssignmentActions.getDocs({ params: { plan } as any, config: config as any }));
    } else {
      (dispatch as any)(byAssignmentActions.getDocs({ params: { schemeName: "byServIds", season, schemeParams: { servIds } } as any, config: config as any }));
    }
  };

  return { loadByServIds };
}
```

Callers replace their inline `dispatch(byAssignmentActions.getDocs(...))` with
`const { loadByServIds } = useByAssignmentCustomers()` and call `loadByServIds(servIds, config)`.

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
