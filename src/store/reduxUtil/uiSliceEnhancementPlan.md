# uiSlice Enhancement Plan

## Current State

`uiSlice.ts` uses RTK's `createSlice` `selectors:` field to define selectors. RTK generates these
selectors to expect the **root state slice** (`UIState`), not the full `AppState`. When exported via
`export const uiSelect = { ...uiSlice.selectors }`, the selectors are bound to the `"ui"` key in
the root reducer — meaning they expect `{ ui: UIState }` as their first argument.

This works fine in `smartThunkOptions.ts` where `state` is already typed as `AppState` (which
satisfies `{ ui: UIState }`). However, in components using `useSelector`, TypeScript sometimes
fails to reconcile the RTK-generated selector's expected state shape with the explicit `AppState`
annotation on the `useSelector` callback, producing:

```
TS2345: Argument of type UIState is not assignable to parameter of type { ui: UIState; }
Property ui is missing in type UIState but required in type { ui: UIState; }
```

## Current Workaround

Components that need per-thunk loading state read `state.ui.activeRequests` directly:

```tsx
const isLookingUp = useSelector((state: AppState) =>
  state.ui.activeRequests.some((req) => req.startsWith("singleCustomer/getCustDocs-")),
);
```

This is verbose and leaks the `activeRequests` string format into components.

## Proposed Enhancement

Create `src/store/reduxUtil/uiSelect.ts` — a standalone selector file with hand-written selectors
that take `AppState` directly. This sidesteps the RTK `selectors:` field entirely for component use.

```typescript
// src/store/reduxUtil/uiSelect.ts
import { AppState } from "@/store";

/** True if any request with the given typePrefix is currently in flight. */
export const isLoadingThunk = (state: AppState, typePrefix: string): boolean =>
  state.ui.activeRequests.some((req) => req.startsWith(`${typePrefix}-`));

/** True if the global loading overlay is visible. */
export const isGlobalLoading = (state: AppState): boolean =>
  state.ui.loadingCount > 0;

/** The current global loading message, or null. */
export const loadingMessage = (state: AppState): string | null =>
  state.ui.loadingMessage;
```

Usage in components:

```tsx
import { isLoadingThunk } from "@/store/reduxUtil/uiSelect";

const isLookingUp = useSelector((state) =>
  isLoadingThunk(state, "singleCustomer/getCustDocs")
);
```

## Migration Notes

- The existing `uiSelect` export from `uiSlice.ts` can remain for backward compatibility in
  `smartThunkOptions.ts` and other non-component usages.
- New component code should import from `uiSelect.ts` instead.
- The `showLoading: false` pattern (used by `useSingleCustomer`) means the global spinner is
  suppressed, but `activeRequests` is still populated — so `isLoadingThunk` correctly reflects
  in-flight status even for spinner-suppressed thunks.
