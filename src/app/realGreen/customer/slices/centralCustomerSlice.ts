import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  BaseCustomerState,
  CentralCustomerStateData,
  centralInitialState,
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
  | "lastSeasonProduction";

interface CentralCustomerState extends CentralCustomerStateData {
  activeContexts: CustomerContextMode[];
}

const initialState: CentralCustomerState = {
  ...centralInitialState,
  activeContexts: [],
};

// Helper to merge chunk data into Maps
const mergeChunk = (state: CentralCustomerState, chunk: StreamChunk) => {
  const { stepName, data } = chunk;
  if (stepName === "customers" && data.customerDocs) {
    data.customerDocs.forEach((doc) => {
      state.CustDocMap.set(doc.custId, doc);
    });
  } else if (stepName === "programs" && data.programDocs) {
    data.programDocs.forEach((doc) => {
      state.ProgDocMap.set(doc.progId, doc);
    });
  } else if (stepName === "services" && data.serviceDocs) {
    data.serviceDocs.forEach((doc) => {
      state.ServDocMap.set(doc.servId, doc);
    });
  }
};

export const centralCustomerSlice = createSlice({
  name: "centralCustomer",
  initialState,
  reducers: {
    // Sets the active context list
    setContexts(state, action: PayloadAction<CustomerContextMode[]>) {
      state.activeContexts = action.payload;
    },
    // Clears all Maps
    clearAllMaps(state) {
      state.CustDocMap.clear();
      state.ProgDocMap.clear();
      state.ServDocMap.clear();
    },
    // Internal action for thunk to merge data (uses mergeChunk helper)
    mergeData(state, action: PayloadAction<StreamChunk>) {
      mergeChunk(state, action.payload);
    },
  },
  extraReducers: (builder) => {
    // ============================================================================
    // STREAMING UPDATES
    // Listen for receiveChunk actions from source slices
    // If that source is active, merge data immediately
    // ============================================================================

    // Active Customers - Streaming
    builder.addCase(
      activeCustomersSlice.actions.receiveChunk,
      (state, action) => {
        if (state.activeContexts.includes("active")) {
          mergeChunk(state, action.payload);
        }
      },
    );

    // Printed Customers - Streaming
    builder.addCase(
      printedCustomersSlice.actions.receiveChunk,
      (state, action) => {
        if (state.activeContexts.includes("printed")) {
          mergeChunk(state, action.payload);
        } else {
        }
      },
    );

    // Last Season Production - Streaming
    builder.addCase(
      lastSeasonProductionSlice.actions.receiveChunk,
      (state, action) => {
        if (state.activeContexts.includes("lastSeasonProduction")) {
          mergeChunk(state, action.payload);
        }
      },
    );

    // ============================================================================
    // FETCH START - Clear Maps
    // When a fetch starts for an active context, clear all Maps
    // ============================================================================

    builder.addCase(activeCustomersActions.getCustDocs.pending, (state) => {
      if (state.activeContexts.includes("active")) {
        state.CustDocMap.clear();
        state.ProgDocMap.clear();
        state.ServDocMap.clear();
      }
    });

    builder.addCase(printedCustomersActions.getCustDocs.pending, (state) => {
      if (state.activeContexts.includes("printed")) {
        state.CustDocMap.clear();
        state.ProgDocMap.clear();
        state.ServDocMap.clear();
      }
    });

    builder.addCase(
      lastSeasonProductionActions.getCustDocs.pending,
      (state) => {
        if (state.activeContexts.includes("lastSeasonProduction")) {
          state.CustDocMap.clear();
          state.ProgDocMap.clear();
          state.ServDocMap.clear();
        }
      },
    );
  },
});

// Thunk to switch contexts and sync data
export const switchContexts =
  (contexts: CustomerContextMode[]): AppThunk =>
  (dispatch, getState) => {
    const state = getState() as AppState;

    // 1. Update active contexts
    dispatch(centralCustomerSlice.actions.setContexts(contexts));

    // 2. Clear all Maps
    dispatch(centralCustomerSlice.actions.clearAllMaps());

    // 3. Merge data from all active source slices
    contexts.forEach((context) => {
      let sourceState: BaseCustomerState;

      if (context === "active") {
        sourceState = state.customer.active;
      } else if (context === "printed") {
        sourceState = state.customer.printed;
      } else if (context === "lastSeasonProduction") {
        sourceState = state.customer.lastSeasonProduction;
      } else {
        return;
      }

      // Merge customerDocs (source has arrays, central uses Maps)
      if (sourceState.customerDocs.length > 0) {
        dispatch(
          centralCustomerSlice.actions.mergeData({
            stepName: "customers",
            data: { customerDocs: sourceState.customerDocs },
          }),
        );
      } else {
      }

      // Merge programDocs
      if (sourceState.programDocs.length > 0) {
        dispatch(
          centralCustomerSlice.actions.mergeData({
            stepName: "programs",
            data: { programDocs: sourceState.programDocs },
          }),
        );
      }

      // Merge serviceDocs
      if (sourceState.serviceDocs.length > 0) {
        dispatch(
          centralCustomerSlice.actions.mergeData({
            stepName: "services",
            data: { serviceDocs: sourceState.serviceDocs },
          }),
        );
      }
    });
  };

export default centralCustomerSlice.reducer;
export const centralCustomerActions = {
  ...centralCustomerSlice.actions,
  switchContexts,
};
