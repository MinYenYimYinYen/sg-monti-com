import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  CustomerContract,
  StreamChunk,
} from "@/app/realGreen/customer/_lib/types/CustomerContract";

import { createStreamThunk } from "@/store/reduxUtil/thunkFactories";
import { CustomerDoc } from "../realGreen/customer/_lib/entities/types/CustomerTypes";
import {
  ProgramDoc,
} from "../realGreen/customer/_lib/entities/types/ProgramTypes";
import { ServiceDoc } from "../realGreen/customer/_lib/entities/types/ServiceTypes";

interface SanityState {
  customerDocs: CustomerDoc[];
  programDocs: ProgramDoc[];
  serviceDocs: ServiceDoc[];
}

const initialState: SanityState = {
  customerDocs: [],
  programDocs: [],
  serviceDocs: [],
};

const sanitySlice = createSlice({
  name: "sanity",
  initialState,
  reducers: {
    clearDocs(state) {
      state.customerDocs = [];
      state.programDocs = [];
      state.serviceDocs = [];
    },
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
});

export const getDocs = createStreamThunk<CustomerContract, "runSearchScheme">({
  typePrefix: "sanity/getDocs",
  apiPath: "/realGreen/customer/api",
  opName: "runSearchScheme",
  onChunk: (dispatch, chunk) => {
    dispatch(sanitySlice.actions.receiveChunk(chunk));
  },
});

export const { clearDocs, receiveChunk } = sanitySlice.actions;
export default sanitySlice.reducer;
