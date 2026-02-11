import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  BaseCustomerState,
  baseInitialState,
} from "@/app/realGreen/customer/slices/SliceTypes";
import {
  activeCustomersSlice,
  activeCustomersActions,
} from "./activeCustomersSlice";
import {
  printedCustomersSlice,
  printedCustomersActions,
} from "./printedCustomersSlice";
import {
  lastSeasonProductionSlice,
  lastSeasonProductionActions,
} from "./lastSeasonProductionSlice";
import { StreamChunk } from "@/app/realGreen/customer/api/CustomerContract";
import { AppState, AppThunk } from "@/store";

export type CustomerContextMode =
  | "active"
  | "printed"
  | "lastSeasonProduction"
  | null;

interface CentralCustomerState extends BaseCustomerState {
  context: CustomerContextMode;
}

const initialState: CentralCustomerState = {
  ...baseInitialState,
  context: null,
};

// Helper to apply chunk data (reused logic from other slices)
const applyChunk = (state: BaseCustomerState, chunk: StreamChunk) => {
  const { stepName, data } = chunk;
  if (stepName === "customers" && data.customerDocs) {
    state.customerDocs.push(...data.customerDocs);
  } else if (stepName === "programs" && data.programDocs) {
    state.programDocs.push(...data.programDocs);
  } else if (stepName === "services" && data.serviceDocs) {
    state.serviceDocs.push(...data.serviceDocs);
  }
};

export const centralCustomerSlice = createSlice({
  name: "centralCustomer",
  initialState,
  reducers: {
    // Replaces the entire state with the target slice's state
    syncState(
      state,
      action: PayloadAction<{
        context: CustomerContextMode;
        data: BaseCustomerState;
      }>,
    ) {
      const { context, data } = action.payload;
      state.context = context;
      // We copy the arrays by reference. Since Redux uses Immer,
      // and we are not mutating the arrays themselves here (just the reference in the state tree),
      // this is efficient. However, if the source arrays are mutated (via push),
      // we need to ensure we are observing those changes.
      //
      // Note: In the extraReducers below, we listen for the *same* push events
      // that update the source slices, so we keep this slice in sync manually.
      state.customerDocs = data.customerDocs;
      state.programDocs = data.programDocs;
      state.serviceDocs = data.serviceDocs;
    },
  },
  extraReducers: (builder) => {
    // ============================================================================
    // SUBSCRIPTIONS
    // This slice MUST mirror all data-mutating actions from:
    // 1. activeCustomersSlice
    // 2. printedCustomersSlice
    // 3. lastSeasonProductionSlice
    //
    // Current Monitored Actions:
    // - receiveChunk
    // - (Future: reset, updateCustomer, deleteCustomer)
    // ============================================================================

    // Listen to Active Customers updates
    builder.addCase(
      activeCustomersSlice.actions.receiveChunk,
      (state, action) => {
        if (state.context === "active") {
          applyChunk(state, action.payload);
        }
      },
    );
    builder.addCase(activeCustomersActions.getCustDocs.pending, (state) => {
      if (state.context === "active") {
        state.customerDocs = [];
        state.programDocs = [];
        state.serviceDocs = [];
      }
    });

    // Listen to Printed Customers updates
    builder.addCase(
      printedCustomersSlice.actions.receiveChunk,
      (state, action) => {
        if (state.context === "printed") {
          applyChunk(state, action.payload);
        }
      },
    );
    builder.addCase(printedCustomersActions.getCustDocs.pending, (state) => {
      if (state.context === "printed") {
        state.customerDocs = [];
        state.programDocs = [];
        state.serviceDocs = [];
      }
    });

    // Listen to Last Season Production updates
    builder.addCase(
      lastSeasonProductionSlice.actions.receiveChunk,
      (state, action) => {
        if (state.context === "lastSeasonProduction") {
          applyChunk(state, action.payload);
        }
      },
    );
    builder.addCase(
      lastSeasonProductionActions.getCustDocs.pending,
      (state) => {
        if (state.context === "lastSeasonProduction") {
          state.customerDocs = [];
          state.programDocs = [];
          state.serviceDocs = [];
        }
      },
    );
  },
});

// Thunk to switch context
export const setCustomerContext =
  (mode: CustomerContextMode): AppThunk =>
  (dispatch, getState) => {
    const state = getState() as AppState;

    // 1. Determine which slice to read from
    let sourceData: BaseCustomerState;

    if (mode === "active") {
      sourceData = state.customer.active;
    } else if (mode === "printed") {
      sourceData = state.customer.printed;
    } else if (mode === "lastSeasonProduction") {
      sourceData = state.customer.lastSeasonProduction;
    } else {
      // If null or unknown, reset to empty
      sourceData = baseInitialState;
    }

    // 2. Dispatch sync action to update Central Slice
    dispatch(
      centralCustomerSlice.actions.syncState({
        context: mode,
        data: sourceData,
      }),
    );
  };

export default centralCustomerSlice.reducer;
export const centralCustomerActions = {
  ...centralCustomerSlice.actions,
  setCustomerContext,
};
