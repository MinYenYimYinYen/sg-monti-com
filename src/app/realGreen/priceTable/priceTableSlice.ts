import { createSlice } from "@reduxjs/toolkit";
import { PriceTableDoc } from "@/app/realGreen/priceTable/_types/PriceTableTypes";
import { PriceTableContract } from "@/app/realGreen/priceTable/api/PriceTableContract";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";

interface PriceTableState {
  priceTableDocs: PriceTableDoc[];
}

const initialState: PriceTableState = {
  priceTableDocs: [],
};

const priceTableSlice = createSlice({
  name: "priceTable",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getPriceTableDocs.fulfilled, (state, action) => {
      state.priceTableDocs = action.payload;
    });
  },
});

const getPriceTableDocs = createStandardThunk<
  PriceTableContract,
  "getPriceTableDocs"
>({
  typePrefix: "priceTable/getPriceTableDocs",
  apiPath: "/realGreen/priceTable/api",
  opName: "getPriceTableDocs",
});

export const priceTableActions = {
  ...priceTableSlice.actions,
  getPriceTableDocs,
};
export default priceTableSlice.reducer;
