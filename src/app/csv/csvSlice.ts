import { ServiceUnserviced } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { createSlice } from "@reduxjs/toolkit";

type CSVState = {
  unServicedRows: ServiceUnserviced[];
};

const initialState: CSVState = {
  unServicedRows: [],
};

export const csvSlice = createSlice({
  name: "csv",
  initialState,
  reducers: {},
  extraReducers: (builder) => {},
});

export const csvActions = { ...csvSlice.actions };

export default csvSlice.reducer;
