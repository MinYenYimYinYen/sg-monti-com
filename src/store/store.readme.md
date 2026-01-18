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

To control the traffic system, we wrap our Thunk arguments with the `WithConfig<T>` generic. This adds control flags to your API parameters.

```typescript
type ThunkConfig = {
  // UI Controls
  showLoading?: boolean;  // Default: true
  loadingMsg?: string;    // Override "Loading..."

  // Traffic Controls
  force?: boolean;        // Bypass all checks (Refresh)
  staleTime?: number;     // Time-to-live in ms (e.g., 5000)
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

### How to Write a Smart Thunk
Use the `smartThunkOptions` helper instead of writing manual conditions.

**Crucial TypeScript Requirements:**
1.  **`EmployeeContract`**: Ensures the return type and params match the backend exactly.
2.  **`WithConfig<T>`**: Wraps the params to allow `force` and `staleTime` to be passed in. Without this, TypeScript will reject your smart options.
3. **Generics**: Before sending apiParams to the API, spread the ThunkConfig params out:
    - `const { showLoading, loadingMsg, force, staleTime, ...apiParams } =
        params;`
4. **`AppState`**: Required in the third generic slot so `getState` works correctly in the condition.

```typescript
import { createAsyncThunk } from "@reduxjs/toolkit";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";
import { smartThunkOptions } from "@/store/reduxUtil/smartThunkOptions";
import { EmployeeContract } from "@/app/realGreen/employee/api/EmployeeContract"; // Example import
import { AppState } from "@/store";

export const getEmployees = createAsyncThunk<
  EmployeeContract["getAll"]["result"], // 1. Return Type (From Contract)
  WithConfig<EmployeeContract["getAll"]["params"]>, // 2. Params + ThunkConfig
  { rejectValue: string; state: AppState } // 3. State type required for smart options
>(
  "employee/getEmployees",
  async (params, { rejectWithValue }) => {
    // Standard fetch logic...
    // REMEMBER: Destructure/remove config args before sending to API!
    const { force, staleTime, showLoading, ...apiParams } = params;
    
    // apiParams is now correctly typed as EmployeeContract["getAll"]["params"]
    return await api.post("/employees", apiParams);
  },
  // 4. The Magic Line: Wires up Deduplication, Caching & UI Meta
  smartThunkOptions({ typePrefix: "employee/getEmployees" })
);
```

### Using Custom Conditions
You can inject custom logic to prevent dispatching based on state.

```typescript
smartThunkOptions({
  typePrefix: "auth/checkEligibility",
  customCondition: (arg, { getState }) => {
    const state = getState() as AppState;
    // If we already have a result for this ID, skip the network call
    return !state.auth.checkedIds[arg.saId];
  }
})
```

### How to Dispatch (Usage)
You can now control the caching and UI behavior directly from your components (or Facade Hooks).

```typescript
// A. Standard (Deduplicated)
// If 'getEmployees' is already running, this dispatch is ignored.
dispatch(getEmployees({ region: 'MN' }));

// B. Cached (Smart Fetch)
// If data was fetched < 5 mins ago, this dispatch is ignored.
dispatch(getEmployees({ 
  region: 'MN', 
  staleTime: 300000 // 5 minutes
}));

// C. Force Refresh (Bypass everything)
// Runs immediately, shows spinner, updates timestamp.
dispatch(getEmployees({ 
  region: 'MN', 
  force: true,
  loadingMsg: "Refreshing..."
}));
```

### Note on Reducer Actions
**Important:** The `WithConfig` options (`force`, `staleTime`, `showLoading`) **ONLY** work with `createAsyncThunk`.
* Passing these options to a standard synchronous reducer (e.g., `employeeSlice.actions.clearEmployees({ showLoading: true })`) will have **NO EFFECT**.
* Standard reducers execute immediately and do not pass through the async middleware chain where `condition` and `getPendingMeta` logic lives.

---

## 4. Traffic Logic (Under the Hood)

The `smartDispatchCondition` enforces the following priority:

1.  **Force Rule:** Is `force: true`? -> **RUN**.
2.  **Custom Condition:** Does `customCondition(arg, api)` return false? -> **CANCEL**.
3.  **Concurrency Rule:** Is this thunk type already in `activeRequests`? -> **CANCEL**.
4.  **Cache Rule:**
    * Is `staleTime` > 0?
    * AND is `(Now - lastFetched) < staleTime`? -> **CANCEL**.
5.  **Default:** -> **RUN**.
