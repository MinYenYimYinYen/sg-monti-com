import { createSelector, createSlice } from "@reduxjs/toolkit";
import { ConditionDoc } from "@/app/realGreen/conditionCode/_types/ConditionCode";
import { ConditionContract } from "./api/ConditionContract";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";

export const getConditionDocs = createStandardThunk<
  ConditionContract,
  "getAll"
>({
  typePrefix: "condition/getAll",
  apiPath: "/realGreen/conditionCode/api",
  opName: "getAll",
});

type ConditionState = {
  conditionDocs: ConditionDoc[];
};

const initialState: ConditionState = {
  conditionDocs: [],
};

export const conditionSlice = createSlice({
  name: "Condition",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getConditionDocs.fulfilled, (state, action) => {
      state.conditionDocs = action.payload;
    });
  },
});

export default conditionSlice.reducer;
export const conditionActions = { ...conditionSlice.actions, getConditionDocs };
