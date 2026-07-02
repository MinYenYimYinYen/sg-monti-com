import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { InventoryContract } from "@/app/inventory/api/InventoryContract";
import {
  InventoryCheckDoc,
  InventorySession,
  ProductCount,
} from "@/app/inventory/InventoryTypes";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { AppState } from "@/store";
import { saveInventorySession } from "@/lib/inventory/inventorySessionStorage";

type InventoryState = {
  checks: InventoryCheckDoc[];
  session: InventorySession;
  /** True once the localStorage restore attempt has been made. Prevents re-running on remount. */
  prevSessionChecked: boolean;
  /** True once today's saved check (or a localStorage session) has been loaded. Prevents re-running on remount. */
  todayCheckLoaded: boolean;
};

const initialSession: InventorySession = {
  dateRange: null,
  activeProductIds: [],
  counts: {},
};

const initialState: InventoryState = {
  checks: [],
  session: initialSession,
  prevSessionChecked: false,
  todayCheckLoaded: false,
};

const inventorySlice = createSlice({
  name: "inventory",
  initialState,
  reducers: {
    setDateRange(state, action: PayloadAction<TRange<string> | null>) {
      state.session.dateRange = action.payload;
    },

    addProductToSession(state, action: PayloadAction<number>) {
      const productId = action.payload;
      if (!state.session.activeProductIds.includes(productId)) {
        state.session.activeProductIds.push(productId);
      }
    },

    // Removes from activeProductIds only — counts are retained in session.counts
    // so re-adding the product restores its counts.
    removeProductFromSession(state, action: PayloadAction<number>) {
      const productId = action.payload;
      state.session.activeProductIds = state.session.activeProductIds.filter(
        (id) => id !== productId,
      );
    },

    addCount(
      state,
      action: PayloadAction<{ productId: number; count: ProductCount }>,
    ) {
      const { productId, count } = action.payload;
      if (!state.session.counts[productId]) {
        state.session.counts[productId] = [];
      }
      state.session.counts[productId].push(count);
    },

    removeCount(
      state,
      action: PayloadAction<{ productId: number; index: number }>,
    ) {
      const { productId, index } = action.payload;
      const counts = state.session.counts[productId];
      if (counts) {
        counts.splice(index, 1);
      }
    },

    clearSession(state) {
      state.session = { dateRange: null, activeProductIds: [], counts: {} };
      state.todayCheckLoaded = false;
    },

    // Restores a previously persisted session (e.g. from localStorage).
    // Also marks todayCheckLoaded so the auto-load effect doesn't overwrite the restored session.
    restoreSession(state, action: PayloadAction<InventorySession>) {
      state.session = action.payload;
      state.prevSessionChecked = true;
      state.todayCheckLoaded = true;
    },

    // Marks that the localStorage restore attempt has been made (even if nothing was found).
    markPrevSessionChecked(state) {
      state.prevSessionChecked = true;
    },

    // Loads a saved check's products and counts into the session by date.
    // Finds the matching check in state.checks — no-ops if not found.
    loadCheckIntoSession(state, action: PayloadAction<string>) {
      const date = action.payload;
      const check = state.checks.find((c) => c.checkDate === date);
      if (!check) return;
      state.session.activeProductIds = check.entries.map((e) => e.productId);
      state.session.counts = Object.fromEntries(
        check.entries.map((e) => [e.productId, e.counts]),
      );
      state.todayCheckLoaded = true;
    },

    // Marks that the today-check load attempt has been made (even if no check existed).
    markTodayCheckLoaded(state) {
      state.todayCheckLoaded = true;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getInventoryChecks.fulfilled, (state, action) => {
      state.checks = action.payload;
    });

    builder.addCase(saveInventoryCheck.fulfilled, (state, action) => {
      const idx = state.checks.findIndex(
        (c) => c.checkDate === action.payload.checkDate,
      );
      if (idx !== -1) {
        state.checks[idx] = action.payload;
      } else {
        state.checks.unshift(action.payload);
      }
    });
  },
});

/**
 * Reads the current session from Redux state and persists it to localStorage.
 * Call this after any action that mutates session data so the save is not
 * tied to a specific component's lifecycle.
 */
const persistSession = createAsyncThunk(
  "inventory/persistSession",
  (_, { getState }) => {
    const session = (getState() as AppState).inventory.session;
    saveInventorySession(session);
  },
);

const getInventoryChecks = createStandardThunk<
  InventoryContract,
  "getInventoryChecks"
>({
  typePrefix: "inventory/getInventoryChecks",
  apiPath: "/inventory/api",
  opName: "getInventoryChecks",
});

const saveInventoryCheck = createStandardThunk<
  InventoryContract,
  "saveInventoryCheck"
>({
  typePrefix: "inventory/saveInventoryCheck",
  apiPath: "/inventory/api",
  opName: "saveInventoryCheck",
});

export const inventoryActions = {
  ...inventorySlice.actions,
  getInventoryChecks,
  saveInventoryCheck,
  persistSession,
};

export const inventoryReducer = inventorySlice.reducer;
