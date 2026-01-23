import { createSlice } from "@reduxjs/toolkit";
import { TaxCode } from "@/app/realGreen/taxCode/TaxCode";
import { TaxCodeContract } from "@/app/realGreen/taxCode/api/TaxCodeContract";
import { Grouper } from "@/lib/Grouper";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";

export const getTaxCodes = createStandardThunk<TaxCodeContract, "getAll">({
  typePrefix: "taxCode/getTaxCodes",
  apiPath: "/realGreen/taxCode/api",
  opName: "getAll",
});

interface TaxCodeState {
  taxCodes: TaxCode[];
}

const initialState: TaxCodeState = {
  taxCodes: [],
};

const taxCodeSlice = createSlice({
  name: "taxCode",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getTaxCodes.fulfilled, (state, action) => {
      state.taxCodes = action.payload;
    });
  },
  selectors: {
    allTaxCodes: (state) => state.taxCodes,
    activeTaxCodes: (state) =>
      state.taxCodes.filter((taxCode) => taxCode.available),
    taxCodeMap: (state) =>
      new Grouper(state.taxCodes).toUniqueMap((c) => c.taxCodeId),
  },
});

export const taxCodeActions = { ...taxCodeSlice.actions, getTaxCodes };
export const taxCodeSelect = { ...taxCodeSlice.selectors };
export default taxCodeSlice.reducer;
