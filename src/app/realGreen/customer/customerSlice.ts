import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CustomerDoc } from "@/app/realGreen/customer/_lib/types/Customer";
import { ProgramDoc } from "@/app/realGreen/customer/_lib/types/Program";
import { ServiceDoc } from "@/app/realGreen/customer/_lib/types/Service";

interface CustomerState {
  dryCustomers: CustomerDoc[];
  dryPrograms: ProgramDoc[];
  dryServices: ServiceDoc[];
}

const initialState: CustomerState = {
  dryCustomers: [],
  dryPrograms: [],
  dryServices: [],
};

const customerSlice = createSlice({
  name: "customer",
  initialState,
  reducers: {
    addCustomers(state, action: PayloadAction<CustomerDoc[]>) {
      state.dryCustomers.push(...action.payload);
    },
    addPrograms(state, action: PayloadAction<ProgramDoc[]>) {
      state.dryPrograms.push(...action.payload);
    },
    addServices(state, action: PayloadAction<ServiceDoc[]>) {
      state.dryServices.push(...action.payload);
    },
  },
});

export const { addCustomers, addPrograms, addServices } = customerSlice.actions;
export default customerSlice.reducer;
