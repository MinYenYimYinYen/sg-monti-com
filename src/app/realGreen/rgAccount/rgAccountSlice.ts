import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { RgAccountContract } from "@/app/realGreen/rgAccount/api/RgAccountContract";
import { RgAccountCore } from "@/app/realGreen/rgAccount/RgAccountTypes";

export const getRgAccounts = createStandardThunk<RgAccountContract, "getAll">({
  typePrefix: "rgAccount/getRgAccounts",
  apiPath: "/realGreen/rgAccount/api",
  opName: "getAll",
});

type RgAccountState = {
  rgAccountCores: RgAccountCore[];
};

const initialState: RgAccountState = {
  rgAccountCores: [],
};

const rgAccountSlice = createSlice({
  name: "rgAccount",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getRgAccounts.fulfilled, (state, action) => {
      state.rgAccountCores = action.payload;
    });
  },
});

export const rgAccountActions = { ...rgAccountSlice.actions, getRgAccounts };
export default rgAccountSlice.reducer;
