import { createSlice } from "@reduxjs/toolkit";
import { PrepayDoc } from "@/app/realGreen/prepay/PrepayTypes";
import { PrepayContract } from "@/app/realGreen/prepay/api/PrepayContract";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";

export const getPrepayCodes = createStandardThunk<PrepayContract, "getAll">({
  typePrefix: "prepay/getAll",
  apiPath: "/realGreen/prepay/api",
  opName: "getAll",
});

type PrepayState = {
  prepayDocs: PrepayDoc[];
};

const initialState: PrepayState = {
  prepayDocs: [],
};

const prepaySlice = createSlice({
  name: "prepay",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getPrepayCodes.fulfilled, (state, action) => {
      state.prepayDocs = action.payload;
    });
  },
});

export const prepayActions = { ...prepaySlice.actions, getPrepayCodes };
export default prepaySlice.reducer;
