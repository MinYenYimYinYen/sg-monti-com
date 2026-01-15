import {
  createSlice,
  isPending,
  isRejected,
  isFulfilled,
  isAnyOf,
  PayloadAction,
} from "@reduxjs/toolkit";
import { ThunkConfig } from "@/store/reduxUtil/reduxTypes";

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
  },
  extraReducers: (builder) => {
    builder
      // A. START
      .addMatcher(isPending, (state, action) => {
        const typePrefix = getTypePrefix(action); // <--- FIX
        state.activeRequests.push(typePrefix);

        const meta = action.meta as ThunkConfig;
        if (meta?.showLoading === false) return;

        state.loadingCount++;

        const arg = (action.meta as any).arg;
        if (arg && typeof arg === "object" && arg.loadingMsg) {
          state.loadingMessage = arg.loadingMsg;
        } else if (state.loadingCount === 1 || !state.loadingMessage) {
          state.loadingMessage = "Loading...";
        }
      })

      // B. SUCCESS
      .addMatcher(isFulfilled, (state, action) => {
        const typePrefix = getTypePrefix(action); // <--- FIX

        // Remove from active
        const index = state.activeRequests.indexOf(typePrefix);
        if (index !== -1) state.activeRequests.splice(index, 1);

        // Record History
        state.lastFetched[typePrefix] = Date.now();
      })

      // C. FAIL
      .addMatcher(isRejected, (state, action) => {
        const typePrefix = getTypePrefix(action);

        const index = state.activeRequests.indexOf(typePrefix);
        if (index !== -1) state.activeRequests.splice(index, 1);
      })

      // D. FINALLY (UI Cleanup)
      .addMatcher(isAnyOf(isFulfilled, isRejected), (state, action) => {
        const meta = action.meta as ThunkConfig;
        if (meta?.showLoading === false) return;

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
