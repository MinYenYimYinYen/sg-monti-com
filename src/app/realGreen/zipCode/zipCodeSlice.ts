import {createSlice} from "@reduxjs/toolkit";
import {ZipCodeContract} from "@/app/realGreen/zipCode/api/ZipCodeContract";
import {createStandardThunk} from "@/store/reduxUtil/thunkFactories";
import {ZipCodeDoc} from "./_lib/entities/types/ZipCode";

export const getZipCodes = createStandardThunk<ZipCodeContract, "getAll">({
  typePrefix: "zipCode/getZipCodes",
  apiPath: "/realGreen/zipCode/api",
  opName: "getAll",
});

interface ZipCodeState {
  zipCodeDocs: ZipCodeDoc[];
}

const initialState: ZipCodeState = {
  zipCodeDocs: [],
};

const zipCodeSlice = createSlice({
  name: "zipCode",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getZipCodes.fulfilled, (state, action) => {
      state.zipCodeDocs = action.payload;
    });
  },
});

export const zipCodeActions = {...zipCodeSlice.actions, getZipCodes};
export default zipCodeSlice.reducer;
