# Architecture: Redux, Traffic Control & Global UI

This project uses a **"Smart Thin Slice" Architecture**. We strictly separate **Data** (handled by Feature Slices) from **UI Status** and **Network Logic** (handled by the Global UI Slice).

This prevents state duplication and standardizes advanced behaviors like **Deduplication**, **Caching**, and **Loading Spinners**.

---

## 1. Core Concepts

### A. The Global UI Slice (The Traffic Controller)
**File:** `src/store/reduxUtil/uiSlice.ts`

This slice acts as a central registry. It uses Redux Toolkit's `addMatcher` to listen to **every** Async Thunk to track network traffic and history.

* **UI State:** Tracks `loadingCount` and `loadingMessage`.
* **Network Registry:**
    * **`activeRequests`**: A list of currently executing thunks (e.g., `["employee/getAll"]`). Used for **Deduplication**.
    * **`lastFetched`**: A timestamp map (e.g., `{"employee/getAll": 1735689000}`). Used for **Caching**.

### B. "Thin" Feature Slices
**File:** `src/lib/features/[feature]/[feature]Slice.ts`

Feature slices are "thin." They only track the actual data. They **do not** track `loading`, `error`, or `status` fields, because the UI slice handles that. They also offload their fetch logic (when to run) to the `smartThunkOptions` helper.

### C. The `WithConfig` Pattern
**File:** `src/store/reduxUtil/reduxTypes.ts`

To control the traffic system, we wrap our Thunk arguments with the `WithConfig<T>` generic. This separates control flags from your API parameters to prevent leakage.

```typescript
type ThunkConfig = {
  // UI Controls
  showLoading?: boolean;  // Default: true
  loadingMsg?: string;    // Override "Loading..."

  // Traffic Controls
  force?: boolean;        // Bypass all checks (Refresh)
  staleTime?: number;     // Time-to-live in ms (e.g., 5000)
};

// Nested structure prevents config props from leaking into API calls
type WithConfig<T> = {
  config?: ThunkConfig;
  apiParams: T;
};
```

---

## 2. Setup & Configuration

### The Smart Thunk Helper
**File:** `src/store/reduxUtil/smartThunkOptions.ts`
A helper function that generates the `condition` logic for `createAsyncThunk`. It connects the specific thunk to the global Traffic Controller.

* **Concurrency:** If `activeRequests` includes this thunk type, the new request is cancelled (prevents double-fetching).
* **Caching:** If `staleTime` is set and the data is fresh (checked against `lastFetched`), the request is cancelled.
* **Force:** If `force: true` is passed, all checks are bypassed.
* **Custom Condition:** You can pass a `customCondition` function to inject specific logic (e.g., checking a specific ID cache).

---

## 3. Implementation Guide

### Live Template: Smart Async Thunk

Use this template to generate a standardized, type-safe Async Thunk.

**Variables (Order):**
1.  `$ContractType$`: The API Contract interface (e.g., `CustomerContract`).
2.  `$OpName$`: The operation name from the contract (e.g., `runSearchScheme`).
3.  `$ReturnType$`: The specific property of the result to return (e.g., `items`, `item`, or just `result` if returning the whole object).
4.  `$SliceName$`: The name of the slice (e.g., `sanity`).
5.  `$ThunkName$`: The name of the thunk function (e.g., `getDocs`).
6.  `$ApiPath$`: The API route path (e.g., `/realGreen/customer/api`).

**Template Code:**

```typescript
export const $ThunkName$ = createAsyncThunk<
  $ContractType$["$OpName$"]["result"]["$ReturnType$"],
  WithConfig<$ContractType$["$OpName$"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "$SliceName$/$ThunkName$",
  async (params, { rejectWithValue }) => {
    try {
      // 1. Separate Config params from API params
      const { params: apiParams } = params;

      // 2. Type-Safe Body Construction
      const body: OpMap<$ContractType$> = {
        op: "$OpName$",
        ...apiParams,
      };

      const result = await api<$ContractType$["$OpName$"]["result"]>(
        "$ApiPath$",
        {
          method: "POST",
          body,
        },
      );

      if (!result.success) {
        return rejectWithValue(result.message);
      }
      return result.$ReturnType$;
    } catch (e) {
      const error = handleError(e);
      return rejectWithValue(error.message);
    }
  },
  smartThunkOptions({ typePrefix: "$SliceName$/$ThunkName$" }),
);
```

### Using Custom Conditions
You can inject custom logic to prevent dispatching based on state.

```typescript
smartThunkOptions({
  typePrefix: "auth/checkEligibility",
  customCondition: (arg, { getState }) => {
    const state = getState() as AppState;
    // Access params from the nested structure
    return !state.auth.checkedIds[arg.apiParams.saId];
  }
})
```

### How to Dispatch (Usage)
You can now control the caching and UI behavior directly from your components (or Facade Hooks).

```typescript
// A. Standard (Deduplicated)
// If 'getEmployees' is already running, this dispatch is ignored.
dispatch(getEmployees({ apiParams: { region: 'MN' } }));

// B. Cached (Smart Fetch)
// If data was fetched < 5 mins ago, this dispatch is ignored.
dispatch(getEmployees({ 
  apiParams: { region: 'MN' }, 
  config: { staleTime: 300000 } // 5 minutes
}));

// C. Force Refresh (Bypass everything)
// Runs immediately, shows spinner, updates timestamp.
dispatch(getEmployees({ 
  apiParams: { region: 'MN' }, 
  config: { 
    force: true,
    loadingMsg: "Refreshing..."
  }
}));
```

### Note on Reducer Actions
**Important:** The `WithConfig` options (`force`, `staleTime`, `showLoading`) **ONLY** work with `createAsyncThunk`.
* Passing these options to a standard synchronous reducer (e.g., `employeeSlice.actions.clearEmployees({ showLoading: true })`) will have **NO EFFECT**.
* Standard reducers execute immediately and do not pass through the async middleware chain where `condition` and `getPendingMeta` logic lives.

---

## 4. Traffic Logic (Under the Hood)

The `smartDispatchCondition` enforces the following priority:

1.  **Force Rule:** Is `config.force: true`? -> **RUN**.
2.  **Custom Condition:** Does `customCondition(arg, api)` return false? -> **CANCEL**.
3.  **Concurrency Rule:** Is this thunk type already in `activeRequests`? -> **CANCEL**.
4.  **Cache Rule:**
    * Is `config.staleTime` > 0?
    * AND is `(Now - lastFetched) < staleTime`? -> **CANCEL**.
5.  **Default:** -> **RUN**.
