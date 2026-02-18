import { FlagIdCustIds } from "@/app/realGreen/custFlag/_lib/CustFlagTypes";
import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { CustFlagContract } from "@/app/realGreen/custFlag/api/CustFlagContract";

type CustFlagState = {
  flagIdCustIds: Map<number, FlagIdCustIds>;
};

const initialState: CustFlagState = {
  flagIdCustIds: new Map(),
};

const custFlagSlice = createSlice({
  name: "custFlag",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(loadFlagIdCustIds.fulfilled, (state, action) => {
      for (const newData of action.payload) {
        state.flagIdCustIds.set(newData.flagId, newData);
      }
    });
  },
});

const loadFlagIdCustIds = createStandardThunk<
  CustFlagContract,
  "loadFlagIdCustIds"
>({
  typePrefix: "custFlag/loadFlagIdCustIds",
  apiPath: "/realGreen/custFlag/api",
  opName: "loadFlagIdCustIds",
});

export const custFlagActions = {...custFlagSlice.actions, loadFlagIdCustIds};
export default custFlagSlice.reducer;
