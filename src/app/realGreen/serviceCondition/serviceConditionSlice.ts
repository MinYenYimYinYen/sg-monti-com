import { ServiceConditionDoc } from "@/app/realGreen/serviceCondition/_lib/ServiceConditionTypes";
import { createSlice } from "@reduxjs/toolkit";

type ServiceConditionState = {
  serviceConditionDocs: ServiceConditionDoc[];
};

const initialState: ServiceConditionState = {
  serviceConditionDocs: [],
};

const serviceConditionSlice = createSlice({
  name: "serviceCondition",
  initialState,
  reducers: {},
  extraReducers: (builder) => {},
});

export const serviceConditionReducer = serviceConditionSlice.reducer;
export const serviceConditionActions = { ...serviceConditionSlice.actions };
