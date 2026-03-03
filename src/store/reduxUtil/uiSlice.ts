import {
  createSlice,
  isPending,
  isRejected,
  isFulfilled,
  isAnyOf,
  PayloadAction,
} from "@reduxjs/toolkit";
import { ThunkConfig, WithConfig } from "@/store/reduxUtil/reduxTypes";
import { typeGuard } from "@/lib/primatives/typeUtils/typeGuard";
import { toast } from "react-toastify";

type UIState = {
  loadingCount: number;
  loadingMessage: string | null;
  activeRequests: string[];
  lastFetched: Record<string, number>;
};

const initialState: UIState = {
  loadingCount: 0,
  loadingMessage: null,
  activeRequests: [],
  lastFetched: {},
};

import { hashParams } from "@/store/reduxUtil/hashParams";

// Type for async thunk actions that includes meta with arg
// Note: meta.arg is 'unknown' from Redux Toolkit, we narrow it internally
type AsyncThunkAction = PayloadAction<unknown> & {
  meta?: {
    arg?: unknown;
    requestId?: string;
    [key: string]: any;
  };
};

// Helper: Extracts "employee/getAll" from "employee/getAll/pending"
function getTypePrefix(action: { type: string }): string {
  return action.type.replace(/\/(pending|fulfilled|rejected)$/, "");
}

// Helper: Creates a unique request ID from typePrefix and params
function getRequestId(action: AsyncThunkAction): string {
  const typePrefix = getTypePrefix(action);

  // Type guard: check if arg looks like WithConfig
  const arg = action.meta?.arg as Partial<WithConfig<unknown>> | undefined;

  if (arg?.params) {
    // Use transformed params if available (matches deduplication logic in smartThunkOptions)
    const paramsForHash = arg.__transformedParams ?? arg.params;
    const hash = hashParams(paramsForHash);
    return `${typePrefix}-${hash}`;
  }

  // Fallback for actions without params
  return typePrefix;
}

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    resetUI: (state) => {
      state.loadingCount = 0;
      state.loadingMessage = null;
      state.activeRequests = [];
    },
    simulateLoading: (state) => {
      state.loadingCount = 1;
      state.loadingMessage = "Loading...";
    },
    setLoadingMessage: (state, action: PayloadAction<string>) => {
      state.loadingMessage = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // A. START
      .addMatcher(isPending, (state, action) => {
        const requestId = getRequestId(action);
        state.activeRequests.push(requestId);

        // The 'meta' property here is populated by getPendingMeta in smartThunkOptions
        // It contains { showLoading, loadingMsg } directly.
        const meta = action.meta as ThunkConfig;

        if (meta?.showLoading === false) return;

        state.loadingCount++;

        if (meta.loadingMsg) {
          state.loadingMessage = meta.loadingMsg;
        } else if (state.loadingCount === 1 || !state.loadingMessage) {
          state.loadingMessage = "Loading...";
        }
      })

      // B. SUCCESS
      .addMatcher(isFulfilled, (state, action) => {
        const requestId = getRequestId(action);
        const typePrefix = getTypePrefix(action);

        // Remove from active
        const index = state.activeRequests.indexOf(requestId);
        if (index !== -1) state.activeRequests.splice(index, 1);

        // Record History using requestId (typePrefix-paramsHash) for param-specific caching
        state.lastFetched[requestId] = Date.now();

        // Show success toast if configured
        const arg = action.meta.arg as Partial<WithConfig<unknown>>;
        if (typeGuard.hasDefined(arg, "config") && arg.config.successMsg) {
          toast.success(arg.config.successMsg, {
            autoClose: 300,
          });
        }
      })

      // C. FAIL
      .addMatcher(isRejected, (state, action) => {
        const requestId = getRequestId(action);

        const index = state.activeRequests.indexOf(requestId);
        if (index !== -1) state.activeRequests.splice(index, 1);
      })

      // D. FINALLY (UI Cleanup)
      .addMatcher(isAnyOf(isFulfilled, isRejected), (state, action) => {
        // We need to check the original arg to see if showLoading was disabled.
        // Redux Toolkit does NOT pass getPendingMeta results to fulfilled/rejected actions automatically.
        // However, the 'arg' is available in action.meta.arg

        const arg = action.meta.arg as Partial<WithConfig<unknown>>;
        let showLoading = true;

        if (typeGuard.hasDefined(arg, "config")) {
          if (arg.config.showLoading === false) showLoading = false;
        }

        if (!showLoading) return;

        state.loadingCount--;
        if (state.loadingCount <= 0) {
          state.loadingCount = 0;
          state.loadingMessage = null;
        }
      });
  },
  selectors: {
    loadingCount: (state) => state.loadingCount,
    loadingMessage: (state) => state.loadingMessage,
    /**
     * Check if a thunk type is currently loading.
     *
     * @param state - UI state
     * @param typePrefix - The thunk type prefix (e.g., "employee/getAll")
     * @param paramsHash - Optional hash to check for specific params
     * @returns True if the thunk (with optional specific params) is loading
     *
     * @example
     * // Check if ANY getServiceConditions is loading (any params):
     * isLoadingType(state, "serviceCondition/getServiceConditions")
     *
     * // Check if THIS SPECIFIC request is loading:
     * const hash = hashParams({ serviceIds: [1, 2, 3] });
     * isLoadingType(state, "serviceCondition/getServiceConditions", hash)
     */
    isLoadingType: (state, typePrefix: string, paramsHash?: string) => {
      if (paramsHash) {
        // Exact match: check for specific params
        const requestId = `${typePrefix}-${paramsHash}`;
        return state.activeRequests.includes(requestId);
      } else {
        // Prefix match: check if ANY request with this typePrefix is loading
        return state.activeRequests.some((req) => req.startsWith(`${typePrefix}-`));
      }
    },
    lastFetched: (state) => state.lastFetched,
  },
});

export const uiActions = { ...uiSlice.actions };
export const uiSelect = { ...uiSlice.selectors };
export default uiSlice.reducer;
