import { createSlice } from "@reduxjs/toolkit";
import { PriceTable } from "@/app/realGreen/priceTable/_entities/PriceTableTypes";
import { PriceTableContract } from "@/app/realGreen/priceTable/api/PriceTableContract";
import { Grouper } from "@/lib/Grouper";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";

export const getPriceTables = createStandardThunk<PriceTableContract, "getAll">({
  typePrefix: "priceTable/getPriceTables",
  apiPath: "/realGreen/priceTable/api",
  opName: "getAll",
});

interface PriceTableState {
  priceTables: PriceTable[];
}

const initialState: PriceTableState = {
  priceTables: [],
};

const priceTableSlice = createSlice({
  name: "priceTable",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getPriceTables.fulfilled, (state, action) => {
      state.priceTables = action.payload;
    });
  },

});

export const priceTableActions = { ...priceTableSlice.actions, getPriceTables };
export default priceTableSlice.reducer;
