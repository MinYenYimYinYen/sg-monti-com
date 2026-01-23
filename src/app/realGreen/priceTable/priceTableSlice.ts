import { createSlice } from "@reduxjs/toolkit";
import { PriceTable } from "@/app/realGreen/priceTable/PriceTable";
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
  selectors: {
    allPriceTables: (state) => state.priceTables,
    activePriceTables: (state) =>
      state.priceTables.filter((priceTable) => priceTable.available),
    priceTableMap: (state) =>
      new Grouper(state.priceTables).toUniqueMap((c) => c.id),
  },
});

export const priceTableActions = { ...priceTableSlice.actions, getPriceTables };
export const priceTableSelect = { ...priceTableSlice.selectors };
export default priceTableSlice.reducer;
