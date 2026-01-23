import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  BaseCustomerState,
  baseInitialState,
} from "@/app/realGreen/customer/_lib/types/SliceTypes";
import { createStreamThunk } from "@/store/reduxUtil/thunkFactories";
import {
  CustomerContract,
  StreamChunk,
} from "@/app/realGreen/customer/_lib/types/CustomerContract";

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
    customerDocs: (state) => state.customerDocs,
    programDocs: (state) => state.programDocs,
    serviceDocs: (state) => state.serviceDocs,
  },
});

const getCustDocs = createStreamThunk<CustomerContract, "runSearchScheme">({
  typePrefix: "activeCustomers/getCustDocs",
  apiPath: "/realGreen/customer/api",
  opName: "runSearchScheme",
  onChunk: (dispatch, chunk) => {
    dispatch(activeCustomersSlice.actions.receiveChunk(chunk));
  },
});


export default activeCustomersSlice.reducer;
export const activeCustomersActions = {
  ...activeCustomersSlice.actions,
  getCustDocs,
};
export const activeCustomersSelect = { ...activeCustomersSlice.selectors };
