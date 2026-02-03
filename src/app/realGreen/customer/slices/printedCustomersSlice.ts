import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  BaseCustomerState,
  baseInitialState,
} from "@/app/realGreen/customer/slices/SliceTypes";
import { createStreamThunk } from "@/store/reduxUtil/thunkFactories";
import {
  CustomerContract,
  ErrorChunk,
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
import { AppError } from "@/lib/errors/AppError";

// Ensure the slice state satisfies the requirements for the selectors
type PrintedCustomersState = BaseCustomerState;

const initialState: PrintedCustomersState = {
  ...baseInitialState,
};

export const printedCustomersSlice = createSlice({
  name: "printedCustomers",
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
  typePrefix: "printedCustomers/getCustDocs",
  apiPath: "/realGreen/customer/api",
  opName: "runSearchScheme",
  onChunk: (dispatch, chunk) => {
    // Check for Error Chunk
    if ("success" in chunk && chunk.success === false) {
      const errorChunk = chunk as unknown as ErrorChunk;
      throw new AppError({
        message: errorChunk.message,
        type: "SERVER_ERROR",
      });
    }

    const streamChunk = chunk as StreamChunk;

    dispatch(printedCustomersSlice.actions.receiveChunk(streamChunk));
    if (streamChunk.metrics?.cumulativeRecords) {
      dispatch(
        uiActions.setLoadingMessage(
          `${streamChunk.metrics.cumulativeRecords} ${streamChunk.stepName} loaded...`,
        ),
      );
    }
  },
});

export default printedCustomersSlice.reducer;
export const printedCustomersActions = {
  ...printedCustomersSlice.actions,
  getCustDocs,
};

// Define the slice selector
const selectSlice = (state: AppState) => state.customer.printed;

export const printedCustomersSelect = {
  ...printedCustomersSlice.selectors,
  // Use factories to create specific selectors for this slice
  customers: createSelectCustomers(selectSlice),
  programs: createSelectPrograms(selectSlice),
  services: createSelectServices(selectSlice),
};
