# Merge Slice Plan

## Agent Instructions:
 - Any time we run into a decision, you will ask for my input.
 - For this conversation, we are only interested in modifying this file, and this file only.  
 - Our goal is to create a plan to upgrade centralCustomerSlice from a context "switcher", to a context "merger".
 - You will only modify this file one time per prompt.
 - My input will be prefixed with "Me: "
 - Upon acknowledging my input, you may remove it, and update the plan according to my input.

## Architecture: Aggregator Slice
`centralCustomerSlice` will act as the **Single Source of Truth** for the UI.
- **State**: It will hold the merged data and the configuration of which sources are active.
- **Responsibility**: It actively listens to source slices and updates its own state to reflect the merged view. Selectors will simply read from this slice, unaware of the merging complexity.

### 1. State Structure
- **activeContexts**: `CustomerContextMode[]` (List of currently visible slices).
- **Data Storage** (Normalized Objects):
    - `CustDocRecords`: `Record<number, CustomerDoc>`
    - `ProgDocRecords`: `Record<number, ProgramDoc>`
    - `ServDocRecords`: `Record<number, ServiceDoc>`
    - *Note: Naming chosen to highlight breaking changes in TypeScript.*

### 2. Actions
- `setContexts(modes: CustomerContextMode[])`: Replaces the active list.
- `toggleContext(mode: CustomerContextMode)`: Adds/Removes a mode.
- `syncData(...)`: Internal action to update the merged records.
- `resetCentralState()`: Clears all records.

## 3. Merging Strategy (Confirmed)
1.  **Trigger**: Recalculate/Update the merged state whenever:
    - The `activeContexts` list changes.
    - Data in any *active* source slice changes.
2.  **Mechanism**:
    - Use `Record<number, Doc>` for O(1) access and automatic deduplication by ID.
    - When a source emits data, if that source is active, we merge the data into the Records.
    - If `activeContexts` changes, we `resetCentralState` and then re-merge data from all currently active sources.

## 4. Listener Strategy: Dynamic Matchers (Confirmed)
We will use a **Thunk + Reducer Hybrid Approach**:
1.  **Thunk (`switchContexts`)**: Handles the initial load when switching contexts.
    - Dispatches `setContexts`.
    - Reads `rootState` to pull existing data from active slices.
    - Dispatches `syncData` to populate the central slice.
2.  **Reducer Matchers**: Handles real-time updates.
    - Listens for `upsert` actions from active source slices.
    - Merges new data into the central state immediately.

## 5. Downstream Refactoring Plan

### Selectors
The following selectors currently rely on the array structure (`customerDocs`, etc.) and will need to be updated to handle `CustDocRecords` (Normalized Objects).
*   `centralCustomerSelectors.ts` (Primary target)
*   Any component using `useSelector(selectCentralCustomers)` directly (though they should be using hooks).

**Refactoring Strategy**:
- Update `selectCentralCustomers` to return `Object.values(state.CustDocRecords)` to maintain backward compatibility for array-based UI components.
- Create new selectors `selectCentralCustomerMap` for O(1) lookups if needed.

### Hooks Architecture
We will decouple data fetching from context management.

1.  **Data Fetching Hooks** (`useActiveCustomers`, `usePrintedCustomers`, `useLastSeasonProduction`):
    - **Responsibility**: ONLY dispatch the API fetch action for their specific slice.
    - **Change**: Remove any logic that touches `centralCustomerSlice` or sets context. They just fetch data into their own slice.

2.  **Context Management Hook** (`useCustomerContext` - **NEW**):
    - **Responsibility**: Manages which slices are currently "merged" into the central view.
    - **API**:
        - `setContexts(modes: CustomerContextMode[])`: Dispatches the `switchContexts` thunk.
        - `toggleContext(mode)`: Dispatches a thunk to toggle and re-sync.
        - `activeContexts`: Selects the current list of active modes.

**Example Usage**:
```typescript
// In a Page or Container
const { setContexts } = useCustomerContext();
const { fetch: fetchActive } = useActiveCustomers();
const { fetch: fetchLastSeason } = useLastSeasonProduction();

useEffect(() => {
  // 1. Set the view to show both
  setContexts(['active', 'lastSeason']);
  
  // 2. Start fetching data (streams into source slices -> merges into central)
  fetchActive();
  fetchLastSeason();
}, []);
```

## Next Steps
1.  **Execute**: Create `centralCustomerSlice.ts` with the new state shape and actions.
2.  **Execute**: Create the `switchContexts` thunk.
3.  **Execute**: Refactor `centralCustomerSelectors.ts`.
4.  **Execute**: Create `useCustomerContext` hook.
5.  **Execute**: Update existing fetch hooks to remove context logic.

**Decision Point**:
Are you ready to begin the execution phase, starting with `centralCustomerSlice.ts`?
- Me: Yes. Start with centralCustomerSlice.ts.  Be sure to include the types for the state shape.
