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

// Ensure the slice state satisfies the requirements for the selectors
type LastSeasonProductionState = BaseCustomerState;

const initialState: LastSeasonProductionState = {
  ...baseInitialState,
};

export const lastSeasonProductionSlice = createSlice({
  name: "lastSeasonProduction",
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
    builder.addCase("lastSeasonProduction/getCustDocs/pending", (state) => {
      state.customerDocs = [];
      state.programDocs = [];
      state.serviceDocs = [];
    });
  },
});

const getCustDocs = createStreamThunk<CustomerContract, "runSearchScheme">({
  typePrefix: "lastSeasonProduction/getCustDocs",
  apiPath: "/realGreen/customer/api",
  opName: "runSearchScheme",
  onChunk: (dispatch, chunk) => {
    dispatch(lastSeasonProductionSlice.actions.receiveChunk(chunk));
    if (chunk.metrics?.cumulativeRecords) {
      dispatch(
        uiActions.setLoadingMessage(
          `${chunk.metrics.cumulativeRecords} ${chunk.stepName} loaded...`,
        ),
      );
    }
  },
});

export default lastSeasonProductionSlice.reducer;
export const lastSeasonProductionActions = {
  ...lastSeasonProductionSlice.actions,
  getCustDocs,
};

export const lastSeasonProductionSelect = {
  ...lastSeasonProductionSlice.selectors,
};
