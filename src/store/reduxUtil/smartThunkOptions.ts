import { ThunkConfig, WithConfig } from "@/store/reduxUtil/reduxTypes";
import { AppState } from "@/store";
import { uiSelect } from "@/store/reduxUtil/uiSlice";

/**
 * Standardizes UI metadata extraction for createAsyncThunk.
 * Usage: { getPendingMeta: getUIMeta }
 */
export const getUIMeta = ({ arg }: { arg: unknown }) => {
  const uiArgs = arg as WithConfig<unknown>;
  return {
    showLoading: uiArgs.showLoading ?? true,
    loadingMsg: uiArgs.loadingMsg,
  };
};

/**
 * Universal Condition for Smart Thunks.
 * Automatically handles Concurrency (deduping) and optional Caching.
 *
 * @param typePrefix The action type (e.g., 'employee/getAll')
 * @param args The arguments passed to dispatch (must include ThunkConfig)
 * @param getState Redux getState function
 */
export const smartDispatchCondition = <T extends ThunkConfig>(
  typePrefix: string,
  args: T,
  getState: () => unknown,
): boolean => {
  const state = getState() as AppState;

  // 1. Destructure config
  // Default cacheDuration is 0 (always stale) unless you add it to ThunkConfig
  const { force = false, staleTime = 0 } = args;

  // --- RULE 1: FORCE ---
  // If we really want it, we get it. Bypasses all other checks.
  if (force) return true;

  // --- RULE 2: CONCURRENCY (Deduplication) ---
  // "Is this exact thunk already flying?"
  // This solves the "Multiple Components Mounting" race condition.
  if (uiSelect.isLoadingType(state, typePrefix)) {
    return false; // Cancel duplicate!
  }

  // --- RULE 3: CACHING (History) ---
  // This block only runs if you provide a cacheDuration > 0
  const lastFetched = state.ui.lastFetched?.[typePrefix];
  if (lastFetched && staleTime > 0) {
    const age = Date.now() - lastFetched;

    // If data is younger than our allowed duration, skip the dispatch.
    if (age < staleTime) {
      return false;
    }
  }

  // If we passed the gauntlet, allow the dispatch.
  return true;
};

type SmartThunkOptionsParams = {
  typePrefix: string;
};

/**
 * Generates the standard options object for createAsyncThunk.
 * Wires up the Smart Dispatch (deduping/caching) and UI Meta (spinner).
 */
export const smartThunkOptions = ({ typePrefix }: SmartThunkOptionsParams) => ({
  condition: (
    // We explicitly type the argument here so it matches the expected signature
    arg: ThunkConfig,
    { getState }: { getState: () => unknown },
  ) => smartDispatchCondition(typePrefix, arg, getState),

  getPendingMeta: getUIMeta,
});
