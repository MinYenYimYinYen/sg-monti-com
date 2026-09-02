# Refresh Customer Implementation Plan

## Problem

The sanity layout (and other features) load all customer data via a large streaming search scheme (e.g., `fullSeasonServices`). After a user fixes a data issue in RealGreen and returns to the app, they need to refresh a single customer's data without re-running the entire scheme.

The existing `singleCustomer` scheme is not suitable because:
- It fetches all programs (no status filter) and all services (no status filter), which is inconsistent with the `fullSeasonServices` context.
- Using it would corrupt the central Maps with data that doesn't match the rest of the loaded dataset.

## Design Goals

1. **Scheme-agnostic**: The refresh mechanism works with any slice/scheme combination, not just `fullSeasonServices`.
2. **No optimizer pollution**: A single-customer refresh returns a tiny dataset. Writing those results back to the optimizer would corrupt the learned batch sizes and page counts for the next full load.
3. **Non-streaming**: The data volume for one customer is small enough to return in a single JSON response. Streaming adds unnecessary complexity.
4. **Consistent data shape**: The refreshed data must match the criteria of the original scheme (same status filters, same season, etc.) so the central Maps remain coherent.

## Architecture

### Server Side

#### New API Contract Operation

Add `refreshCustomer` to `CustomerContract`:

```typescript
refreshCustomer: {
  params: {
    schemeName: keyof typeof searchScheme;
    season: number;
    custId: number;
  };
  result: DataResponse<StreamChunkData>;
};
```

#### New Route Handler (`refreshCustomer`)

A new non-streaming handler in `route.ts` that:

1. Builds the scheme using the provided `schemeName` and `season` (same factory as the streaming route).
2. Runs each step sequentially with **fixed optimizer values** — never reads from or writes to the optimizer DB:
   - Pagination steps: `initialPageCount: 1`
   - Batch steps: `batchSize: 500` (large enough to cover any single customer's data in one call)
3. **Injects `custId` into every step's search criteria** before the RealGreen API call:
   - Customer step: adds `custIds: [custId]`
   - Program step: adds `custIds: [custId]` (in addition to any pipeline-derived `custIds`)
   - Service step: adds `custIds: [custId]` (in addition to any pipeline-derived `progIds`)
   
   This injection is universal — it works regardless of scheme step order. Even if a scheme starts with services and works backwards, the `custId` filter scopes every step to only that customer's data.
4. Collects all docs from all steps and returns them in a single `StreamChunkData` response (not streamed).

**Why inject at every step?**

Different schemes run steps in different orders (e.g., `printedCustomers` starts with services, not customers). Injecting `custId` at every step ensures the filter is always applied, regardless of which step runs first or what the pipeline contains. The RealGreen API supports `custIds` on all three entity types (`CustomerSearchRaw`, `ProgramSearchRaw`, `ServiceSearchRaw`), so this is always valid.

### Client Side

#### New Slice Action: `receiveBulk`

Add `receiveBulk(data: Partial<StreamChunkData>)` to `createCustomerSlice`. This merges all three doc arrays at once, replacing the existing docs for the refreshed customer:

```typescript
receiveBulk(state, action: PayloadAction<Partial<StreamChunkData>>) {
  // The removeCustomer action is dispatched first (see thunk below),
  // so we just push the new docs.
  if (action.payload.customerDocs) state.customerDocs.push(...action.payload.customerDocs);
  if (action.payload.programDocs) state.programDocs.push(...action.payload.programDocs);
  if (action.payload.serviceDocs) state.serviceDocs.push(...action.payload.serviceDocs);
}
```

The central slice mirrors `receiveBulk` via `extraReducers` (same pattern as `removeCustomer`).

#### New Thunk Factory: `createRefreshCustomerThunk`

```typescript
export const createRefreshCustomerThunk = (
  sliceName: string,
  slice: ReturnType<typeof createCustomerSlice>,
  schemeName: keyof typeof searchScheme,
) =>
  createStandardThunk<CustomerContract, "refreshCustomer">({
    typePrefix: `${sliceName}/refreshCustomer`,
    apiPath: "/realGreen/customer/api",
    opName: "refreshCustomer",
  });
```

The thunk is used in a hook that first dispatches `removeCustomer(custId)`, then dispatches the thunk, then on success dispatches `receiveBulk(result)`.

Each slice in `customerSlices.ts` gets a `refreshCustomer` thunk created alongside its `getDocs` thunk. The `schemeName` is baked in at creation time — this is the "scheme awareness" that makes the refresh congruent with the original load.

#### New Hook: `useRefreshCustomer`

```typescript
export function useRefreshCustomer(
  actions: CustomerSliceActions & { refreshCustomer: ..., receiveBulk: ... },
  schemeName: keyof typeof searchScheme,
) {
  const dispatch = useAppDispatch();
  const { season } = useSelector(globalSettingsSelect.settings);

  const refresh = async (custId: number) => {
    if (!season || !custId) return;
    dispatch(actions.removeCustomer(custId));
    const result = await dispatch(actions.refreshCustomer({
      params: { schemeName, season, custId },
      config: { showLoading: false },
    }));
    if (actions.refreshCustomer.fulfilled.match(result)) {
      dispatch(actions.receiveBulk(result.payload));
    }
  };

  return { refresh };
}
```

## Usage Example

```typescript
// In a component that needs to refresh a customer after a fix:
const { refresh } = useRefreshCustomer(
  fullSeasonServicesActions,
  "fullSeasonServices",
);

// On button click:
await refresh(customer.custId);
// The customer's data in the central Maps is now up-to-date.
```

## Files to Create/Modify

| File | Change |
|---|---|
| `api/CustomerContract.ts` | Add `refreshCustomer` operation |
| `api/route.ts` | Add `refreshCustomer` handler (non-streaming) |
| `slices/customerSlices.ts` | Add `receiveBulk` to `createCustomerSlice`; add `createRefreshCustomerThunk`; add `refreshCustomer` to each slice's actions |
| `slices/centralCustomerSlice.ts` | Mirror `receiveBulk` in `extraReducers` |
| `hooks/useRefreshCustomer.ts` | New hook |

## Key Invariants

- **Optimizer is never read or written** during a refresh. Fixed values are used inline.
- **`custId` is injected at every step** — scheme order does not matter.
- **`removeCustomer` always runs before `receiveBulk`** — the old data is evicted before new data arrives, preventing duplicates in the source slice arrays.
- **The central Maps update automatically** via the existing `extraReducers` pattern — no additional wiring needed beyond mirroring `receiveBulk`.
