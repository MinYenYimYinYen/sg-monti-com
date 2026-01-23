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
  silentError?: boolean;  // Suppress error toasts
};

// Nested structure prevents config props from leaking into API calls
type WithConfig<T> = {
  config?: ThunkConfig;
  params: T;
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

Use this template to generate a standardized, type-safe Async Thunk using the `createStandardThunk` factory.

**Variables (Order):**
1.  `$ContractType$`: The API Contract interface (e.g., `CustomerContract`).
2.  `$OpName$`: The operation name from the contract (e.g., `runSearchScheme`).
3.  `$SliceName$`: The name of the slice (e.g., `sanity`).
4.  `$ThunkName$`: The name of the thunk function (e.g., `getDocs`).
5.  `$ApiPath$`: The API route path (e.g., `/realGreen/customer/api`).

**Template Code:**

```typescript
export const $ThunkName$ = createStandardThunk<$ContractType$, "$OpName$">({
  typePrefix: "$SliceName$/$ThunkName$",
  apiPath: "$ApiPath$",
  opName: "$OpName$",
});
```

### Using Custom Conditions
You can inject custom logic to prevent dispatching based on state.

```typescript
const checkEligibility = createStandardThunk<AuthContract, "checkEligibility">({
  typePrefix: "auth/checkEligibility",
  apiPath: "/auth/api",
  opName: "checkEligibility",
  customCondition: (arg, { getState }) => {
    const state = getState() as AppState;
    return !state.auth.checkedIds[arg.params.saId];
  },
});
```

### How to Dispatch (Usage)
You can now control the caching and UI behavior directly from your components (or Facade Hooks).

```typescript
// A. Standard (Deduplicated)
// If 'getEmployees' is already running, this dispatch is ignored.
dispatch(getEmployees({ params: { region: 'MN' } }));

// B. Cached (Smart Fetch)
// If data was fetched < 5 mins ago, this dispatch is ignored.
dispatch(getEmployees({ 
  params: { region: 'MN' }, 
  config: { staleTime: 300000 } // 5 minutes
}));

// C. Force Refresh (Bypass everything)
// Runs immediately, shows spinner, updates timestamp.
dispatch(getEmployees({ 
  params: { region: 'MN' },
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
