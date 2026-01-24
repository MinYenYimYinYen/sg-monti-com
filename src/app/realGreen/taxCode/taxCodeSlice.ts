import { createSlice } from "@reduxjs/toolkit";
import { TaxCodeDoc } from "@/app/realGreen/taxCode/TaxCodeTypes";
import { TaxCodeContract } from "@/app/realGreen/taxCode/api/TaxCodeContract";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";

export const getTaxCodes = createStandardThunk<TaxCodeContract, "getAll">({
  typePrefix: "taxCode/getTaxCodes",
  apiPath: "/realGreen/taxCode/api",
  opName: "getAll",
});

interface TaxCodeState {
  taxCodeDocs: TaxCodeDoc[];
}

const initialState: TaxCodeState = {
  taxCodeDocs: [],
};

const taxCodeSlice = createSlice({
  name: "taxCode",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getTaxCodes.fulfilled, (state, action) => {
      state.taxCodeDocs = action.payload;
    });
  },
});

export const taxCodeActions = { ...taxCodeSlice.actions, getTaxCodes };
export default taxCodeSlice.reducer;
