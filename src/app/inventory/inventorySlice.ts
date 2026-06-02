import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { InventoryContract } from "@/app/inventory/api/InventoryContract";
import {
  InventoryCheckDoc,
  InventorySession,
  ProductCount,
} from "@/app/inventory/InventoryTypes";
import { TRange } from "@/lib/primatives/tRange/TRange";

type InventoryState = {
  checks: InventoryCheckDoc[];
  session: InventorySession;
};

const initialSession: InventorySession = {
  dateRange: null,
  activeProductIds: [],
  counts: {},
};

const initialState: InventoryState = {
  checks: [],
  session: initialSession,
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
    },

    // Restores a previously persisted session (e.g. from localStorage).
    restoreSession(state, action: PayloadAction<InventorySession>) {
      state.session = action.payload;
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
};

export const inventoryReducer = inventorySlice.reducer;
