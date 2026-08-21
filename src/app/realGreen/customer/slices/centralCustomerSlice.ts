import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  BaseCustomerState,
  CentralCustomerStateData,
  centralInitialState,
} from "@/app/realGreen/customer/slices/SliceTypes";
import { StreamChunk } from "@/app/realGreen/customer/api/CustomerContract";
import { AppState, AppThunk } from "@/store";
import {
  CustomerContextMode,
  customerSliceRegistry,
} from "@/app/realGreen/customer/slices/customerSlices";



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
    setContexts(state, action: PayloadAction<CustomerContextMode[]>) {
      state.activeContexts = action.payload;
    },
    clearAllMaps(state) {
      state.CustDocMap.clear();
      state.ProgDocMap.clear();
      state.ServDocMap.clear();
    },
    mergeData(state, action: PayloadAction<StreamChunk>) {
      mergeChunk(state, action.payload);
    },
  },
  extraReducers: (builder) => {
    // Loop over the registry so adding a new slice requires only one line in customerSlices.ts.
    for (const entry of customerSliceRegistry) {
      // Streaming: merge incoming chunk data when the context is active.
      builder.addCase(entry.actions.receiveChunk, (state, action) => {
        if (state.activeContexts.includes(entry.context)) {
          mergeChunk(state, action.payload);
        }
      });

      // Fetch start: do NOT clear the central maps here.
      // Each source slice already clears its own docs arrays on pending.
      // The central maps are additive across all active contexts — clearing them
      // here would nuke data from other contexts that are loading in parallel.
      // The maps are rebuilt from scratch via switchContexts when contexts change.
      builder.addCase(entry.getDocs.pending, (_state) => {
        // intentionally empty
      });

      // Remove customer: mirror the source-slice removal in the central Maps.
      builder.addCase(entry.actions.removeCustomer, (state, action) => {
        if (!state.activeContexts.includes(entry.context)) return;
        const custId = action.payload;
        const removedProgIds: number[] = [];
        state.ProgDocMap.forEach((prog, progId) => {
          if (prog.custId === custId) removedProgIds.push(progId);
        });
        state.ServDocMap.forEach((serv, servId) => {
          if (removedProgIds.includes(serv.progId)) state.ServDocMap.delete(servId);
        });
        removedProgIds.forEach((progId) => state.ProgDocMap.delete(progId));
        state.CustDocMap.delete(custId);
      });
    }
  },
});

// Thunk to switch contexts and sync data from source slices into the central Maps.
export const switchContexts =
  (contexts: CustomerContextMode[]): AppThunk =>
  (dispatch, getState) => {
    const state = getState() as AppState;

    dispatch(centralCustomerSlice.actions.setContexts(contexts));
    dispatch(centralCustomerSlice.actions.clearAllMaps());

    for (const entry of customerSliceRegistry) {
      if (!contexts.includes(entry.context)) continue;

      const sourceKey = entry.context as keyof typeof state.customer;
      const sourceState = state.customer[sourceKey] as BaseCustomerState | undefined;
      if (!sourceState) continue;

      if (sourceState.customerDocs.length > 0) {
        dispatch(centralCustomerSlice.actions.mergeData({
          stepName: "customers",
          data: { customerDocs: sourceState.customerDocs },
        }));
      }
      if (sourceState.programDocs.length > 0) {
        dispatch(centralCustomerSlice.actions.mergeData({
          stepName: "programs",
          data: { programDocs: sourceState.programDocs },
        }));
      }
      if (sourceState.serviceDocs.length > 0) {
        dispatch(centralCustomerSlice.actions.mergeData({
          stepName: "services",
          data: { serviceDocs: sourceState.serviceDocs },
        }));
      }
    }
  };

export default centralCustomerSlice.reducer;
export const centralCustomerActions = {
  ...centralCustomerSlice.actions,
  switchContexts,
};
