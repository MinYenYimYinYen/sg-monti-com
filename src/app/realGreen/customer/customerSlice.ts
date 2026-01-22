import { createSlice } from "@reduxjs/toolkit";
import { CustomerWithMongo } from "@/app/realGreen/customer/_lib/types/Customer";
import { ProgramWithMongo } from "@/app/realGreen/customer/_lib/types/Program";
import { ServiceWithMongo } from "@/app/realGreen/customer/_lib/types/Service";

export type CustomerState = {
  dryCustomers: CustomerWithMongo[];
  dryPrograms: ProgramWithMongo[];
  dryServices: ServiceWithMongo[];
};

export const initialCustomerState: CustomerState = {
  dryCustomers: [],
  dryPrograms: [],
  dryServices: [],
};

export const CustomerSlice = createSlice({
  name: "Customer",
  initialState: initialCustomerState,
  reducers: {},
  extraReducers: (builder) => {},
});

export default CustomerSlice.reducer;
export const CustomerActions = { ...CustomerSlice.actions };
