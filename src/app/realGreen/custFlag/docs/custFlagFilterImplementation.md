# Customer Flag Filter — Implementation

## Split-Track Checklist

**Human owns**: slice state, selectors, `centralSelectors.ts` wiring
**AI owns**: `custFlagFilterSelect.ts`, `useSelectedCustFlags.ts`

---

## Task List

### Y1 — `custFlagSlice.ts`: Add `selectedFlagIds` state + action

Add `selectedFlagIds: number[]` to `CustFlagState` and a `setSelectedFlagIds` reducer.

```typescript
// In CustFlagState:
DONE selectedFlagIds: number[];

// In initialState:
DONE selectedFlagIds: [],

// In reducers:
DONE setSelectedFlagIds: (state, action: PayloadAction<number[]>) => {
  state.selectedFlagIds = action.payload;
},
```

Export the new action via `custFlagActions`:
```typescript
DONE export const custFlagActions = { ...custFlagSlice.actions, loadFlagIdCustIds };
```

(`setSelectedFlagIds` is now part of `custFlagSlice.actions` automatically.)

---

### Y2 — `custFlagSelect.ts`: Add `selectSelectedFlagIds`

```typescript DONE
const selectSelectedFlagIds = (state: AppState) => state.custFlag.selectedFlagIds;

export const custFlagSelect = {
  flagIdsInState: selectFlagIdsInState,
  custIdFlagIds: selectCustIdFlagIds,
  selectedFlagIds: selectSelectedFlagIds,   // ← add this
};
```

---

### Y3 — `centralSelectors.ts`: Wire flag filter into `selectCustomers`

Add `custFlagSelect.selectedFlagIds` as the last input to `selectCustomers`. Add the filter
after the `customers` array is built, before returning.

**New input** (append to the inputs array):
```typescript
custFlagSelect.selectedFlagIds,
```

**New parameter** (append to the destructured params):
```typescript
selectedFlagIds,
```

**Filter** (replace the bare `return customers;` at the end of the selector body):
```typescript
if (selectedFlagIds.length === 0) return customers;
return customers.filter((customer) =>
  customer.flags.some((f) => selectedFlagIds.includes(f.flagId)),
);
```

> Note: `customer.flags` is already hydrated at this point via `hydrateFlags` — no new joins
> needed.

---

### A1 — `custFlagFilterSelect.ts` (new file) — *depends on Y2*

**File:** `src/app/realGreen/custFlag/_lib/custFlagFilterSelect.ts`

Creates the reusable factory and pure utility functions. No Redux state coupling — the factory
accepts any `selectFlagIds` selector as a parameter.

```typescript
import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";

/**
 * Factory that creates a memoized { customers, programs, services } selector set
 * filtered by the provided flagIds selector. Each call produces an independent
 * memoized instance — call at module level, never inside a component.
 *
 * Use this when a feature needs its own flag filter independent of the global
 * custFlagSlice.selectedFlagIds (the rare case).
 */
export function makeCustFlagFilterSelectors(
  selectFlagIds: (state: AppState) => number[],
) {
  const selectFilteredCustomers = createSelector(
    [centralSelect.customers, selectFlagIds],
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

  return {
    customers: selectFilteredCustomers,
    programs: selectFilteredPrograms,
    services: selectFilteredServices,
  };
}

/** Pure utilities — operate on a single Customer, no memoization concerns. */
export const custFlagFilter = {
  hasAnyFlagIds: (customer: Customer, flagIds: number[]) =>
    customer.flags.some((f) => flagIds.includes(f.flagId)),

  hasAllFlagIds: (customer: Customer, flagIds: number[]) =>
    flagIds.every((id) => customer.flags.some((f) => f.flagId === id)),

  hasNoFlagIds: (customer: Customer, flagIds: number[]) =>
    !customer.flags.some((f) => flagIds.includes(f.flagId)),
};
```

---

### A2 — `useSelectedCustFlags.ts` (new file) — *depends on Y1, Y2*

**File:** `src/app/realGreen/custFlag/_lib/useSelectedCustFlags.ts`

Watches `selectedFlagIds` in state and dispatches `loadFlagIdCustIds` for any flags not yet
loaded. Call this from any feature that uses the global flag filter.

```typescript
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { custFlagSelect } from "@/app/realGreen/custFlag/_lib/custFlagSelect";
import { custFlagActions } from "@/app/realGreen/custFlag/_lib/custFlagSlice";

export function useSelectedCustFlags() {
  const dispatch = useAppDispatch();
  const selectedFlagIds = useSelector(custFlagSelect.selectedFlagIds);
  const flagIdsInState = useSelector(custFlagSelect.flagIdsInState);

  useEffect(() => {
    const flagsToLoad = selectedFlagIds.filter(
      (id) => !flagIdsInState.includes(id),
    );
    if (flagsToLoad.length === 0) return;
    dispatch(
      custFlagActions.loadFlagIdCustIds({
        params: {
          searches: flagsToLoad.map((id) => ({ flagID: id, statuses: ["9"] })),
        },
        config: { loadingMsg: "Loading customer flags..." },
      }),
    );
  }, [dispatch, selectedFlagIds, flagIdsInState]);
}
```

---

## Status Table

| Task | Owner | Status | Depends On |
|------|-------|--------|------------|
| Y1 — `custFlagSlice`: add `selectedFlagIds` + action | Human | ✅ | — |
| Y2 — `custFlagSelect`: add `selectSelectedFlagIds` | Human | ✅ | Y1 |
| Y3 — `centralSelectors`: wire flag filter | Human | ✅ | Y2 |
| A1 — `custFlagFilterSelect.ts` (new) | AI | ✅ | Y2 |
| A2 — `useSelectedCustFlags.ts` (new) | AI | ✅ | Y1, Y2 |

---

## Handoff Protocol

1. Complete Y1, Y2, Y3 in order (each depends on the previous)
2. Signal: **"Check my work on Y3"**
3. AI reviews all three Y-tasks, flags any issues
4. Once clean, AI implements A1 and A2
