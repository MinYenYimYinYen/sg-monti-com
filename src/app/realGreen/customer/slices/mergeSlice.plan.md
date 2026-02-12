# Merge Slice Plan - FINAL

## Architecture: Aggregator Slice
`centralCustomerSlice` will act as the **Single Source of Truth** for the UI.
- **State**: It will hold the merged data and the configuration of which sources are active.
- **Responsibility**: It actively listens to source slices and updates its own state to reflect the merged view. Selectors will simply read from this slice, unaware of the merging complexity.

### 1. State Structure (CONFIRMED)
- **activeContexts**: `CustomerContextMode[]` (List of currently active slices).
- **Data Storage** (Map Objects - Redux store has `serializableCheck: false`):
    - `CustDocMap`: `Map<number, CustomerDoc>`
    - `ProgDocMap`: `Map<number, ProgramDoc>`
    - `ServDocMap`: `Map<number, ServiceDoc>`
    - *Note: Using Maps for O(1) lookups, type safety, and simpler selector implementation.*

**Initial State**:
```typescript
const initialState: CentralCustomerState = {
  activeContexts: [],
  CustDocMap: new Map(),
  ProgDocMap: new Map(),
  ServDocMap: new Map(),
};
```

### 2. Actions (CONFIRMED)
- `setContexts(modes: CustomerContextMode[])`: Replaces the active list.
- `toggleContext(mode: CustomerContextMode)`: Adds/Removes a mode.
- `clearAllMaps()`: Internal action to clear all Maps.

### 3. Merging Strategy (CONFIRMED)
1.  **Trigger**: Recalculate/Update the merged state whenever:
    - The `activeContexts` list changes.
    - Data in any *active* source slice changes (via `receiveChunk` actions).

2.  **Mechanism**:
    - Use `Map<number, Doc>` for O(1) access and automatic deduplication by ID.
    - **Deduplication**: Happens during merge in the slice (not selectors).
    - **Conflict Resolution**: Last write wins (same ID → most recent merge overwrites).

3.  **Context Change Behavior** (Option C - Confirmed):
    - When `activeContexts` changes, **clear ALL Maps** and re-merge data from all currently active sources.
    - This ensures clean state and predictable behavior.

4.  **Fetch Start Behavior** (Option C - Confirmed):
    - When a fetch starts (`getCustDocs.pending`), clear ALL Maps if that context is active.
    - Flicker is acceptable since most use-cases start with no data loaded.
    - New streaming data will repopulate the Maps immediately.

5.  **Helper Function**: `mergeChunk(state, chunk)` handles Map updates:
    ```typescript
    const mergeChunk = (state: CentralCustomerState, chunk: StreamChunk) => {
      const { stepName, data } = chunk;
      if (stepName === "customers" && data.customerDocs) {
        data.customerDocs.forEach(doc => {
          state.CustDocMap.set(doc.custId, doc);
        });
      } else if (stepName === "programs" && data.programDocs) {
        data.programDocs.forEach(doc => {
          state.ProgDocMap.set(doc.progId, doc);
        });
      } else if (stepName === "services" && data.serviceDocs) {
        data.serviceDocs.forEach(doc => {
          state.ServDocMap.set(doc.servId, doc);
        });
      }
    };
    ```

## 4. Listener Strategy: Thunk + extraReducers (CONFIRMED)
**Thunk (`switchContexts`)**: Handles context changes and initial data sync.
- Dispatches `setContexts` to update `activeContexts`.
- Dispatches `clearAllMaps` to clear all Maps.
- Reads `rootState` to pull existing data from all active source slices.
- Merges data into Maps using `mergeChunk` helper.

**extraReducers**: Handles real-time streaming updates.
- Listens for `receiveChunk` actions from source slices (active, printed, lastSeasonProduction).
- If that source is in `activeContexts`, immediately merge data using `mergeChunk`.
- Listens for `getCustDocs.pending` from source slices.
- If that source is in `activeContexts`, clear all Maps.

## 5. Downstream Refactoring Plan (CONFIRMED)

### Selectors (`centralSelectors.ts`)
**Current State**: Selectors read arrays and use Grouper to build Maps, then hydrate.
**New State**: Selectors read Maps directly, convert to arrays, then hydrate.

**Refactoring Strategy**:
```typescript
// Base selectors (read Maps from state)
const selectCustDocMap = (state) => state.customer.central.CustDocMap;
const selectProgDocMap = (state) => state.customer.central.ProgDocMap;
const selectServDocMap = (state) => state.customer.central.ServDocMap;

// Array selectors (convert Maps to arrays)
const selectCustomerDocs = createSelector(
  [selectCustDocMap],
  (map) => Array.from(map.values())
);

// Then use Grouper on arrays to build relationship maps (same as before)
// Finally hydrate objects (same logic as before)

// Exported shape remains the same:
export const centralSelect = {
  context: selectActiveContexts,
  customers: selectCustomers,      // Customer[] (hydrated)
  programs: selectPrograms,         // Program[] (hydrated)
  services: selectServices,         // Service[] (hydrated)
  customerMap: selectCustomerMap,   // Map<number, Customer> (hydrated)
};
```

**Key Change**: Remove deduplication logic (now handled in slice).

### Hooks Architecture (CONFIRMED)

#### 1. Data Fetching Hooks (`useActiveCustomers`, `usePrintedCustomers`, `useLastSeasonProduction`)
**Retain autoLoad** functionality (declarative pattern).
**Remove** context management logic (`setCustomerContext`).
**Remove** manual memoization (`useCallback`).

```typescript
// Example: useActiveCustomers
export function useActiveCustomers({ autoLoad = false }) {
  const dispatch = useAppDispatch();
  const season = useSelector(globalSettingsSelect.season);

  useEffect(() => {
    if (!autoLoad || !season) return;
    dispatch(activeCustomersActions.getCustDocs({
      params: { schemeName: "activeCustomers", season },
      config: { staleTime: realGreenConst.paramTypesCacheTime },
    }));
  }, [autoLoad, dispatch, season]);

  const refresh = () => {
    if (!season) return;
    dispatch(activeCustomersActions.getCustDocs({
      params: { schemeName: "activeCustomers", season },
      config: { force: true },
    }));
  };

  return { refresh, canRefresh: !!season };
}
```

#### 2. Context Management Hook (`useCustomerContext` - **NEW**)
**Required param**: `contexts: CustomerContextMode[]` (type-safe union).
**Returns**: Imperative methods for dynamic context changes.

```typescript
type CustomerContextMode = 'active' | 'printed' | 'lastSeasonProduction';

export function useCustomerContext({
  contexts
}: {
  contexts: CustomerContextMode[]
}) {
  const dispatch = useAppDispatch();
  const activeContexts = useSelector(centralSelect.context);

  // Declarative: Set contexts on mount/change
  useEffect(() => {
    dispatch(centralCustomerActions.switchContexts(contexts));
  }, [dispatch, contexts]);

  // Imperative: Methods for dynamic changes
  const setContexts = (modes: CustomerContextMode[]) => {
    dispatch(centralCustomerActions.switchContexts(modes));
  };

  const toggleContext = (mode: CustomerContextMode) => {
    const newContexts = activeContexts.includes(mode)
      ? activeContexts.filter(c => c !== mode)
      : [...activeContexts, mode];
    dispatch(centralCustomerActions.switchContexts(newContexts));
  };

  return { setContexts, toggleContext, activeContexts };
}
```

**Example Usage**:
```typescript
// Declarative: Component declares contexts it needs
useCustomerContext({ contexts: ['active', 'printed'] });
useActiveCustomers({ autoLoad: true });
usePrintedCustomers({ autoLoad: true });

// Data automatically flows: source slices → central slice → selectors → UI
```

## 6. Implementation Checklist
1.  **Update SliceTypes.ts**: Add Map types, update `BaseCustomerState` (BREAKING CHANGE).
2.  **Refactor centralCustomerSlice.ts**:
    - Change state to Maps
    - Add `mergeChunk` helper
    - Update actions and reducers
    - Create `switchContexts` thunk
    - Update extraReducers for streaming and pending handlers
3.  **Refactor centralSelectors.ts**:
    - Read Maps instead of arrays
    - Convert Maps to arrays for hydration
    - Remove deduplication logic
    - Maintain exported shape
4.  **Create useCustomerContext hook**:
    - Required `contexts` param
    - Declarative effect + imperative methods
5.  **Update data fetching hooks**:
    - Remove context management
    - Retain autoLoad
    - Remove useCallback
6.  **Test in page.tsx**:
    - Use new hook API
    - Verify merged data
    - Test context toggling


