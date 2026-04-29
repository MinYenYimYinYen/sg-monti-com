import { TRange } from "@/lib/primatives/tRange/TRange";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type PaceState = {
  selectedDateRange: TRange<string>;
  minProductiveServices: number;
};

const initialState: PaceState = {
  selectedDateRange: dateStrings.padDateRange(
    {
      min: dateStrings.today(),
      max: dateStrings.today(),
    },
    14,
  ),
  minProductiveServices: 3,
};

const paceSlice = createSlice({
  name: "pace",
  initialState,
  reducers: {
    setSelectedDateRange: (state, action: PayloadAction<TRange<string>>) => {
      state.selectedDateRange = action.payload;
    },
    setMinProductiveServices: (state, action: PayloadAction<number>) => {
      state.minProductiveServices = action.payload;
    },
  },
});

export const paceActions = { ...paceSlice.actions };
export const paceReducer = paceSlice.reducer;
