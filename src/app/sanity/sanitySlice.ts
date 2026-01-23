import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  CustomerContract,
  StreamChunk,
} from "@/app/realGreen/customer/_lib/types/CustomerContract";
import { CustomerDoc } from "@/app/realGreen/customer/_lib/types/Customer";
import { ProgramDoc } from "@/app/realGreen/customer/_lib/types/Program";
import { ServiceDoc } from "@/app/realGreen/customer/_lib/types/Service";
import { createStreamThunk } from "@/store/reduxUtil/thunkFactories";

interface SanityState {
  dryCustomers: CustomerDoc[];
  dryPrograms: ProgramDoc[];
  dryServices: ServiceDoc[];
}

const initialState: SanityState = {
  dryCustomers: [],
  dryPrograms: [],
  dryServices: [],
};

const sanitySlice = createSlice({
  name: "sanity",
  initialState,
  reducers: {
    clearDocs(state) {
      state.dryCustomers = [];
      state.dryPrograms = [];
      state.dryServices = [];
    },
    receiveChunk(state, action: PayloadAction<StreamChunk>) {
      const { stepName, data } = action.payload;

      if (stepName === "customers" && data.dryCustomers) {
        state.dryCustomers.push(...data.dryCustomers);
      } else if (stepName === "programs" && data.dryPrograms) {
        state.dryPrograms.push(...data.dryPrograms);
      } else if (stepName === "services" && data.dryServices) {
        state.dryServices.push(...data.dryServices);
      }
    },
  },
});

export const getDocs = createStreamThunk<
  CustomerContract,
  "runSearchScheme"
>({
  typePrefix: "sanity/getDocs",
  apiPath: "/realGreen/customer/api",
  opName: "runSearchScheme",
  onChunk: (dispatch, chunk) => {
    dispatch(sanitySlice.actions.receiveChunk(chunk));
  },
});

export const { clearDocs, receiveChunk } = sanitySlice.actions;
export default sanitySlice.reducer;
