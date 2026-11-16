import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { monthRange } from "@/app/salesTax/_lib/salesTaxDateRange";
import { monthOfYearFromDate } from "@/components/MonthOfYear/monthOfYearUtil";

type SalesTaxUIState = {
  dateRange: TRange<string> | null;
};

// Starts on the current month so the picker's default matches the store without a mount effect.
const initialState: SalesTaxUIState = {
  dateRange: monthRange(monthOfYearFromDate(new Date())),
};

const salesTaxUISlice = createSlice({
  name: "salesTaxUI",
  initialState,
  reducers: {
    setDateRange(state, action: PayloadAction<TRange<string> | null>) {
      state.dateRange = action.payload;
    },
  },
});

export const salesTaxUIActions = salesTaxUISlice.actions;
export const salesTaxUIReducer = salesTaxUISlice.reducer;
