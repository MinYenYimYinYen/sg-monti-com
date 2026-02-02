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
import { Grouper } from "@/lib/Grouper";
import { AppState } from "@/store";
import {
  createSelectCustomers,
  createSelectPrograms,
  createSelectServices,
} from "../selectors/contextSelectors";

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
  selectors: {
    customerDocMap: (state) =>
      new Grouper(state.customerDocs).toUniqueMap((e) => e.custId),
    programDocMap: (state) =>
      new Grouper(state.programDocs).toUniqueMap((e) => e.progId),
    serviceDocMap: (state) =>
      new Grouper(state.serviceDocs).toUniqueMap((e) => e.servId),
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

// Define the slice selector
const selectSlice = (state: AppState) => state.activeCustomers;

export const activeCustomersSelect = {
  ...activeCustomersSlice.selectors,
  // Use factories to create specific selectors for this slice
  customers: createSelectCustomers(selectSlice),
  programs: createSelectPrograms(selectSlice),
  services: createSelectServices(selectSlice),
};
