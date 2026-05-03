# Customer Flag Filter — Infrastructure Plan

## Goal

A global, reusable flag filter that sits at the `centralSelect` level. When `selectedFlagIds` is
non-empty, only customers who have at least one of those flags (OR logic) are returned by
`centralSelect.customers`. Their programs and services cascade naturally — no additional filter
logic is needed downstream.

This is foundational infrastructure. Flag filtering is a pervasive pattern in the legacy CRM this
app replaces. Getting the architecture right here pays dividends across the entire feature set.

---

## Desired Behaviors

- **Empty selection = no filter**: When `selectedFlagIds` is `[]`, all customers pass through
  unchanged. This is the default state.
- **OR logic**: A customer passes if they have *at least one* of the selected flags.
- **Cascade**: Filtering at the customer level automatically filters their programs and services —
  consistent with how the CRM works.
- **On-demand loading**: `custFlag` data (`flagId → custId[]`) is loaded only for the flags that
  are actually selected. The thunk already deduplicates, so re-selecting a previously loaded flag
  does not re-fetch.
- **Global by default**: `selectedFlagIds` lives in `custFlagSlice`. Any feature can dispatch
  `setSelectedFlagIds` to apply a global filter. Features that need an independent filter (rare)
  use the `makeCustFlagFilterSelectors` escape hatch.

---

## Data Sources

- `state.flag.flagDocs` — all `FlagDoc[]` (loaded via `useFlag`)
- `state.custFlag.flagIdCustIds` — `Map<number, FlagIdCustIds>` (loaded on demand via
  `loadFlagIdCustIds` thunk)
- `Customer.flags: Flag[]` — already hydrated in `centralSelect.selectCustomers` via
  `hydrateFlags`; no new joins needed

---

## State Changes

### `custFlagSlice.ts`

Add to `CustFlagState`:
```typescript
selectedFlagIds: number[];  // default: []
```

New action:
```typescript
setSelectedFlagIds: (state, action: PayloadAction<number[]>) => {
  state.selectedFlagIds = action.payload;
}
```

---

## Selector Changes

### `custFlagSelect.ts`

Add:
```typescript
const selectSelectedFlagIds = (state: AppState) => state.custFlag.selectedFlagIds;

export const custFlagSelect = {
  // ...existing
  selectedFlagIds: selectSelectedFlagIds,
};
```

### `centralSelectors.ts`

The filter is implemented as a **separate `selectFilteredCustomers` selector** that depends on
`selectCustomers` and `custFlagSelect.selectedFlagIds`, rather than being inlined into
`selectCustomers` itself. This keeps the expensive hydration build loop isolated from the filter
logic and makes the separation of concerns explicit.

```typescript
const selectFilteredCustomers = createSelector(
  [selectCustomers, custFlagSelect.selectedFlagIds],
  (customers, flagIds) => {
    if (flagIds.length === 0) return customers;
    return customers.filter((customer) =>
      customer.flags.some((f) => flagIds.includes(f.flagId)),
    );
  },
);

const selectFilteredPrograms = createSelector(
  [selectFilteredCustomers],
  (customers) => customers.flatMap((c) => c.programs),
);

const selectFilteredServices = createSelector(
  [selectFilteredPrograms],
  (programs) => programs.flatMap((p) => p.services),
);
```

`centralSelect.customers`, `.programs`, and `.services` all point to the filtered versions.
`centralSelect.customerMap` intentionally remains unfiltered — it is used for FK lookups and
should resolve any customer regardless of the current filter.

`Customer.flags` is already hydrated inside `selectCustomers`, so no additional joins are needed.

---

## New Files

### `custFlag/_lib/custFlagFilterSelect.ts`

Escape hatch for features that need an independent flag filter (different from the global
`selectedFlagIds`). Not used by the global filter path — provided for future flexibility.

```typescript
// Factory: creates a memoized { customers, programs, services } selector set
// parameterized by any flagIds selector.
export function makeCustFlagFilterSelectors(
  selectFlagIds: (state: AppState) => number[]
) {
  const selectFilteredCustomers = createSelector(
    [centralSelect.customers, selectFlagIds],
    (customers, flagIds) => {
      if (flagIds.length === 0) return customers;
      return customers.filter(c => c.flags.some(f => flagIds.includes(f.flagId)));
    }
  );

  const selectFilteredPrograms = createSelector(
    [selectFilteredCustomers],
    (customers) => customers.flatMap(c => c.programs)
  );

  const selectFilteredServices = createSelector(
    [selectFilteredPrograms],
    (programs) => programs.flatMap(p => p.services)
  );

  return {
    customers: selectFilteredCustomers,
    programs: selectFilteredPrograms,
    services: selectFilteredServices,
  };
}

// Pure utility functions — operate on a single Customer, no memoization concerns.
// Used inside selector filter callbacks.
export const custFlagFilter = {
  hasAnyFlagIds: (customer: Customer, flagIds: number[]) =>
    customer.flags.some(f => flagIds.includes(f.flagId)),

  hasAllFlagIds: (customer: Customer, flagIds: number[]) =>
    flagIds.every(id => customer.flags.some(f => f.flagId === id)),

  hasNoFlagIds: (customer: Customer, flagIds: number[]) =>
    !customer.flags.some(f => flagIds.includes(f.flagId)),
};
```

### `custFlag/_lib/useSelectedCustFlags.ts`

Watches `selectedFlagIds` in state and triggers `loadFlagIdCustIds` on demand. Called from any
feature that uses the global flag filter (e.g., `usePaceDeps`).

```typescript
export function useSelectedCustFlags() {
  const dispatch = useAppDispatch();
  const selectedFlagIds = useSelector(custFlagSelect.selectedFlagIds);
  const flagIdsInState = useSelector(custFlagSelect.flagIdsInState);

  useEffect(() => {
    const flagsToLoad = selectedFlagIds.filter(id => !flagIdsInState.includes(id));
    if (flagsToLoad.length === 0) return;
    dispatch(custFlagActions.loadFlagIdCustIds({
      params: {
        searches: flagsToLoad.map(id => ({ flagID: id, statuses: ["9"] })),
      },
      config: { loadingMsg: "Loading customer flags..." },
    }));
  }, [dispatch, selectedFlagIds, flagIdsInState]);
}
```

---

## Memoization Notes

- `selectCustomers` in `centralSelectors.ts` is already an expensive selector. Adding
  `selectedFlagIds` as an input means it re-runs when flag selection changes — this is expected
  and acceptable for a user-initiated filter action.
- The `makeCustFlagFilterSelectors` factory creates stable selector instances at module load time.
  Each call to the factory produces a new, independent memoized selector set. Do not call the
  factory inside a component or render function.
- `custFlagFilter` utilities are pure functions — no memoization concerns.

---

## File Map

| File | Change |
|---|---|
| `custFlag/_lib/custFlagSlice.ts` | Add `selectedFlagIds: number[]`, `setSelectedFlagIds` action |
| `custFlag/_lib/custFlagSelect.ts` | Add `selectSelectedFlagIds` |
| `customer/selectors/centralSelectors.ts` | Add `selectedFlagIds` input + filter to `selectCustomers` |
| `custFlag/_lib/custFlagFilterSelect.ts` | **New** — factory + pure utilities |
| `custFlag/_lib/useSelectedCustFlags.ts` | **New** — on-demand loader hook |
| `custFlag/docs/custFlagFilterPlan.md` | **New** — this document |
