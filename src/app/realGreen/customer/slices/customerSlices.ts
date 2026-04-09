import {
  BaseCustomerState,
  baseInitialState,
} from "@/app/realGreen/customer/slices/SliceTypes";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  CustomerContract,
  StreamChunk,
} from "@/app/realGreen/customer/api/CustomerContract";
import { createStreamThunk } from "@/store/reduxUtil/thunkFactories";
import { uiActions } from "@/store/reduxUtil/uiSlice";

export const createCustomerSlice = (sliceName: string) =>
  createSlice({
    name: sliceName,
    initialState: { ...baseInitialState } as BaseCustomerState,
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
      builder.addCase(`${sliceName}/getCustDocs/pending`, (state) => {
        state.customerDocs = [];
        state.programDocs = [];
        state.serviceDocs = [];
      });
    },
  });

export const createGetCustDocsThunk = (
  sliceName: string,
  slice: ReturnType<typeof createCustomerSlice>
) =>
  createStreamThunk<CustomerContract, "runSearchScheme">({
    typePrefix: `${sliceName}/getCustDocs`,
    apiPath: "/realGreen/customer/api",
    opName: "runSearchScheme",
    onChunk: (dispatch, chunk) => {
      dispatch(slice.actions.receiveChunk(chunk));
      if (chunk.metrics?.cumulativeRecords) {
        dispatch(
          uiActions.setLoadingMessage(
            `${chunk.metrics.cumulativeRecords} ${chunk.stepName} loaded...`,
          ),
        );
      }
    },
  });

export const activeCustomersSlice = createCustomerSlice("activeCustomers");
export const activeCustomersGetDocs = createGetCustDocsThunk("activeCustomers", activeCustomersSlice);
export const activeCustomersActions = { ...activeCustomersSlice.actions, getDocs: activeCustomersGetDocs}
export const activeCustomerReducer = activeCustomersSlice.reducer;

export const printedCustomersSlice = createCustomerSlice("printedCustomers");
export const printedCustomersGetDocs = createGetCustDocsThunk("printedCustomers", printedCustomersSlice);
export const printedCustomersActions = { ...printedCustomersSlice.actions, getDocs: printedCustomersGetDocs}
export const printedCustomerReducer = printedCustomersSlice.reducer;

export const lastSeasonProductionSlice = createCustomerSlice("lastSeasonProduction");
export const lastSeasonProductionGetDocs = createGetCustDocsThunk("lastSeasonProduction", lastSeasonProductionSlice);
export const lastSeasonProductionActions = { ...lastSeasonProductionSlice.actions, getDocs: lastSeasonProductionGetDocs}
export const lastSeasonProductionReducer = lastSeasonProductionSlice.reducer;

export const recentProductionSlice = createCustomerSlice("recentProduction");
export const recentProductionGetDocs = createGetCustDocsThunk("recentProduction", recentProductionSlice);
export const recentProductionActions = { ...recentProductionSlice.actions, getDocs: recentProductionGetDocs}
export const recentProductionReducer = recentProductionSlice.reducer;

export const singleCustomerSlice = createCustomerSlice("singleCustomer");
export const singleCustomerGetDocs = createGetCustDocsThunk("singleCustomer", singleCustomerSlice);
export const singleCustomerActions = { ...singleCustomerSlice.actions, getDocs: singleCustomerGetDocs}
export const singleCustomerReducer = singleCustomerSlice.reducer;

export const byAssignmentSlice = createCustomerSlice("byAssignment");
export const byAssignmentGetDocs = createGetCustDocsThunk("byAssignment", byAssignmentSlice);
export const byAssignmentActions = { ...byAssignmentSlice.actions, getDocs: byAssignmentGetDocs}
export const byAssignmentReducer = byAssignmentSlice.reducer;





