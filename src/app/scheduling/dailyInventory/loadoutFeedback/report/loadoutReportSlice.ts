import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";

type LoadoutReportState = {
  dateRange: TRange<string>;
};

const initialState: LoadoutReportState = {
  dateRange: {
    min: dateStrings.daysAgo(7),
    max: dateStrings.today(),
  },
};

const loadoutReportSlice = createSlice({
  name: "loadoutReport",
  initialState,
  reducers: {
    setDateRange(state, action: PayloadAction<TRange<string>>) {
      state.dateRange = action.payload;
    },
  },
});

export const loadoutReportActions = loadoutReportSlice.actions;
export const loadoutReportReducer = loadoutReportSlice.reducer;
