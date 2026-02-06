import {
  createSlice,
  isPending,
  isRejected,
  isFulfilled,
  isAnyOf,
  PayloadAction,
} from "@reduxjs/toolkit";
import { ThunkConfig, WithConfig } from "@/store/reduxUtil/reduxTypes";
import { typeGuard } from "@/lib/typeGuard";
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

// Helper: Extracts "employee/getAll" from "employee/getAll/pending"
function getTypePrefix(action: PayloadAction<unknown>): string {
  return action.type.replace(/\/(pending|fulfilled|rejected)$/, "");
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
        const typePrefix = getTypePrefix(action);
        state.activeRequests.push(typePrefix);

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
        const typePrefix = getTypePrefix(action);

        // Remove from active
        const index = state.activeRequests.indexOf(typePrefix);
        if (index !== -1) state.activeRequests.splice(index, 1);

        // Record History
        state.lastFetched[typePrefix] = Date.now();

        // Show success toast if configured
        const arg = action.meta.arg as Partial<WithConfig<unknown>>;
        if (typeGuard.hasDefined(arg, "config") && arg.config.successMsg) {
          toast.success(arg.config.successMsg, {
            delay: 300,

          });
        }
      })

      // C. FAIL
      .addMatcher(isRejected, (state, action) => {
        const typePrefix = getTypePrefix(action);

        const index = state.activeRequests.indexOf(typePrefix);
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
    isLoadingType: (state, typePrefix: string) =>
      state.activeRequests.includes(typePrefix),
    lastFetched: (state) => state.lastFetched,
  },
});

export const uiActions = { ...uiSlice.actions };
export const uiSelect = { ...uiSlice.selectors };
export default uiSlice.reducer;
