import { createSlice } from "@reduxjs/toolkit";
import { ZipCode } from "@/app/realGreen/zipCode/ZipCode";
import { ZipCodeContract } from "@/app/realGreen/zipCode/api/ZipCodeContract";
import { Grouper } from "@/lib/Grouper";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";

export const getZipCodes = createStandardThunk<ZipCodeContract, "getAll">({
  typePrefix: "zipCode/getZipCodes",
  apiPath: "/realGreen/zipCode/api",
  opName: "getAll",
});

interface ZipCodeState {
  zipCodes: ZipCode[];
}

const initialState: ZipCodeState = {
  zipCodes: [],
};

const zipCodeSlice = createSlice({
  name: "zipCode",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getZipCodes.fulfilled, (state, action) => {
      state.zipCodes = action.payload;
    });
  },
  selectors: {
    allZipCodes: (state) => state.zipCodes,
    zipCodeMap: (state) =>
      new Grouper(state.zipCodes).toUniqueMap((c) => c.zip),
  },
});

export const zipCodeActions = { ...zipCodeSlice.actions, getZipCodes };
export const zipCodeSelect = { ...zipCodeSlice.selectors };
export default zipCodeSlice.reducer;
