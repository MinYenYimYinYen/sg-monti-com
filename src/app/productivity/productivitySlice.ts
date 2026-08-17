import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { TRange } from "@/lib/primatives/tRange/TRange";

type ProductivityState = {
  doneDateRange: TRange<string>;
  // Additional state fields to be added as the module grows
};

const initialState: ProductivityState = {
  doneDateRange: { min: "", max: "" },
};

const productivitySlice = createSlice({
  name: "productivity",
  initialState,
  reducers: {
    setDoneDateRange(state, action: PayloadAction<TRange<string>>) {
      state.doneDateRange = action.payload;
    },
  },
});

export const productivityActions = productivitySlice.actions;
export const productivityReducer = productivitySlice.reducer;
