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
    * **`activeRequests`**: A list of in-flight request IDs, where an ID is `typePrefix-paramsHash` (e.g., `["employee/getEmployeeDocs-1rj8k2a"]`). Used for **Deduplication**. The same thunk with different params has a different ID, so both can run.
    * **`lastFetched`**: A map of request ID to `Date.now()` in ms (e.g., `{"employee/getEmployeeDocs-1rj8k2a": 1735689000000}`). Used for **Caching**. It is stamped on `pending` as well as `fulfilled` (see Section 5).

### B. "Thin" Feature Slices
**File:** `featureSlice.ts`, beside its feature (e.g., `src/app/realGreen/employee/employeeSlice.ts`)

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
  successMsg?: string;    // Toast on fulfilled (shown by uiSlice)
};

// Nested structure prevents config props from leaking into API calls
type WithConfig<T> = {
  config?: ThunkConfig;
  params: T;
  // Internal cache for transformed params (set by smartThunkOptions condition)
  __transformedParams?: T;
};
```

---

## 2. Setup & Configuration

### The Smart Thunk Helper
**File:** `src/store/reduxUtil/smartThunkOptions.ts`
A helper function that generates the `condition` logic for `createAsyncThunk`. It connects the specific thunk to the global Traffic Controller.

* **Concurrency:** If `activeRequests` includes this exact request ID (thunk type **and** params hash), the new request is cancelled (prevents double-fetching). Params are hashed by `hashParams.ts` (sorted keys, so key order does not matter).
* **Caching:** If `staleTime` is set and the data for this request ID is fresh (checked against `lastFetched`), the request is cancelled.
* **Force:** If `force: true` is passed, all checks are bypassed.
* **Transform Params:** If `transformParams` is provided, it runs during the `condition` phase and caches the result in `arg.__transformedParams` for use in the payload creator.
* **Custom Condition:** You can pass a `customCondition` function to inject specific logic (e.g., checking a specific ID cache). The `customCondition` has access to transformed params via `arg.__transformedParams`.

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

### Using Transform Params with Custom Conditions
When you need to filter or modify params before sending to the API AND validate those transformed params:

```typescript
const getServiceConditions = createStandardThunk<ServiceConditionContract, "getServiceConditions">({
  typePrefix: "serviceCondition/getServiceConditions",
  apiPath: "/realGreen/serviceCondition/api",
  opName: "getServiceConditions",

  // Transform runs first - filters out IDs already in state
  transformParams: (params, getState) => {
    const state = getState() as AppState;
    const existingServiceIds = new Set(
      state.serviceCondition.serviceConditionDocs.map(doc => doc.serviceId)
    );
    const newServiceIds = params.serviceIds.filter(id => !existingServiceIds.has(id));
    return { serviceIds: newServiceIds };
  },

  // Condition runs after transform - checks the FILTERED params
  customCondition: (arg, { getState }) => {
    // Use transformed params (after filtering) if available
    const params = arg.__transformedParams ?? arg.params;
    // Prevent dispatch if no new IDs to fetch (avoids SQL error: WHERE IN ())
    return params.serviceIds.length !== 0;
  },
});
```

**Key Points:**
- `transformParams` runs during the `condition` phase and caches result in `arg.__transformedParams`
- `customCondition` can access both original (`arg.params`) and transformed (`arg.__transformedParams`) params
- The payload creator automatically uses `arg.__transformedParams` if available
- This prevents redundant transformation and allows validation of transformed params

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
3.  **Concurrency Rule:** Is this request ID (`typePrefix-paramsHash`, using `__transformedParams` when present) already in `activeRequests`? -> **CANCEL**.
4.  **Cache Rule:**
    * Is `config.staleTime` > 0?
    * AND is `(Now - lastFetched[requestId]) < staleTime`? -> **CANCEL**.
5.  **Default:** -> **RUN**.

A cancelled dispatch dispatches nothing to the store. Its promise still **resolves** (to a `rejected` action with `meta.condition === true`), so never `.unwrap()` a mount-time dispatch.

---

## 5. Mount Safety: Why Dispatching from `useEffect` Is Safe

Components and hooks can dispatch a load on every mount without coordinating. The guard state lives in the store, not in React, so it survives unmount/remount cycles and StrictMode double effects.

| Situation | Result |
|---|---|
| Two components mount together, or StrictMode double effect | Second dispatch cancelled (ID already in `activeRequests`) |
| Remount while the request is in flight | Cancelled |
| Remount after it finished, within `staleTime` | Cancelled (`lastFetched` is fresh) |
| Remount after it finished, past `staleTime` | Runs again (intended refresh) |
| Remount with **no** `staleTime` | Runs again. **Always pass `staleTime` for mount-time loads** (`realGreenConst.paramTypesCacheTime` is the convention) |
| Same thunk, different `params` | Both run |
| `force: true` | Always runs, even if in flight. User-initiated refresh only, never in a mount effect |

Mechanics that make this work:

* **`condition` is synchronous.** RTK dispatches `pending` immediately after a synchronous `true`, so the next dispatch always sees the first one's `activeRequests` entry. An `async` condition lets two same-tick dispatches both pass.
* **`pending` also stamps `lastFetched`.** This closes the gap where a re-render right after expiry slips past both the dedup check (not yet active) and the cache check (stale timestamp).
* **Unmount does not cancel the request.** The data lands in the store for the next mount.
* **Per-thunk loading:** `activeRequests` is populated even with `showLoading: false`. Read it with `state.ui.activeRequests.some((req) => req.startsWith("feature/thunk-"))`. See `uiSliceEnhancementPlan.md` for why component code reads state directly instead of using `uiSelect.isLoadingType`.

Standard mount-time hook shape (see `src/app/realGreen/taxCode/useTaxCode.ts`):

```typescript
useEffect(() => {
  if (autoLoad) {
    dispatch(taxCodeActions.getTaxCodes({
      params: {},
      config: { loadingMsg: "Loading tax codes...", staleTime: realGreenConst.paramTypesCacheTime },
    }));
  }
}, [autoLoad, dispatch]);
```

---

## 6. Gotchas

* **`params` must be a plain JSON object**, `{}` when empty. Falsy params make the request ID the bare `typePrefix`, which in-flight dedup (it matches `typePrefix-`) never finds. Date, Map and Set values all hash as `{}`; use ISO strings and arrays.
* **A failed request blocks retries until `staleTime` expires.** `lastFetched` is stamped on `pending` and not cleared on `rejected`. Retry with `force: true`.
* **`lastFetched` is never pruned**, and `resetUI` does not clear it. When you clear cached slice data, the matching `lastFetched` entries still say "fresh".
* **`customCondition` is bypassed by `force`.**
* **Do not set `dispatchConditionRejection: true`** on a smart thunk. A cancelled thunk would dispatch `rejected` with no `pending`, which decrements `loadingCount` for a request that never incremented it and removes the original's `activeRequests` entry.
* **`condition` writes `arg.__transformedParams`.** The same `arg` object becomes `meta.arg` in `uiSlice`, so never dispatch a frozen arg (e.g. one read from Redux state).
* **Avoid `typePrefix` values where one is a hyphen-prefix of another** (`a/get` and `a/get-all`). The "any params" loading check matches by `typePrefix-` prefix.
* **`uiSlice` must be mounted at the key `ui`.** `smartThunkOptions` reads `state.ui`.
* **A raw `createAsyncThunk` without a `WithConfig` arg** still drives the spinner but is never deduplicated or cached, and `uiSlice` dereferences `arg.config` without a guard in its fulfilled/rejected handlers. Use `createStandardThunk`.

---

## 7. Porting to Another Project

`uiSlicePortingGuide.md` (same folder as `uiSlice.ts`) is a self-contained, agent-facing guide with portable source for all of these files, a setup checklist, and a verification test suite. Use it together with this readme.
