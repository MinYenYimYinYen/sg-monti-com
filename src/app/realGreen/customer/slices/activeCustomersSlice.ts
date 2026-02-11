import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  BaseCustomerState,
  baseInitialState,
} from "@/app/realGreen/customer/slices/SliceTypes";
import { createStreamThunk } from "@/store/reduxUtil/thunkFactories";
import {
  CustomerContract,
  StreamChunk,
} from "@/app/realGreen/customer/api/CustomerContract";
import { uiActions } from "@/store/reduxUtil/uiSlice";
import { AppState } from "@/store";

// Ensure the slice state satisfies the requirements for the selectors
type ActiveCustomersState = BaseCustomerState;

const initialState: ActiveCustomersState = {
  ...baseInitialState,
};

export const activeCustomersSlice = createSlice({
  name: "activeCustomers",
  initialState,
  reducers: {
    receiveChunk(state, action: PayloadAction<StreamChunk>) {
      const { stepName, data } = action.payload;
      if (stepName === "customers" && data.customerDocs) {
        state.customerDocs.push(...data.customerDocs);
      } else if (stepName === "programs" && data.programDocs) {
        state.programDocs.push(...data.programDocs);
      } else if (stepName === "services" && data.serviceDocs) {
        state.serviceDocs.push(...data.serviceDocs);
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase("activeCustomers/getCustDocs/pending", (state) => {
      state.customerDocs = [];
      state.programDocs = [];
      state.serviceDocs = [];
    });
  },
});

const getCustDocs = createStreamThunk<CustomerContract, "runSearchScheme">({
  typePrefix: "activeCustomers/getCustDocs",
  apiPath: "/realGreen/customer/api",
  opName: "runSearchScheme",
  onChunk: (dispatch, chunk) => {
    dispatch(activeCustomersSlice.actions.receiveChunk(chunk));
    if (chunk.metrics?.cumulativeRecords) {
      dispatch(
        uiActions.setLoadingMessage(
          `${chunk.metrics.cumulativeRecords} ${chunk.stepName} loaded...`,
        ),
      );
    }
  },
});

export default activeCustomersSlice.reducer;
export const activeCustomersActions = {
  ...activeCustomersSlice.actions,
  getCustDocs,
};

export const activeCustomersSelect = {
  ...activeCustomersSlice.selectors,
};
