import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { TimeCardContract } from "@/app/timeCard/api/timeCardContract";
import { Punch } from "@/app/timeCard/TimeCardTypes";
import { TRange } from "@/lib/primatives/tRange/TRange";

type TimeCardPayrollState = {
  dateRange: TRange<string>;
  punches: Punch[];
};

const initialState: TimeCardPayrollState = {
  dateRange: { min: "", max: "" },
  punches: [],
};

const getPunches = createStandardThunk<TimeCardContract, "getPunches">({
  typePrefix: "timeCardPayroll/getPunches",
  apiPath: "/timeCard/api",
  opName: "getPunches",
});

const timeCardPayrollSlice = createSlice({
  name: "timeCardPayroll",
  initialState,
  reducers: {
    setDateRange(state, action: PayloadAction<TRange<string>>) {
      state.dateRange = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getPunches.fulfilled, (state, action) => {
      state.punches = action.payload;
    });
  },
});

export const timeCardPayrollActions = {
  ...timeCardPayrollSlice.actions,
  getPunches,
};

export const timeCardPayrollReducer = timeCardPayrollSlice.reducer;
