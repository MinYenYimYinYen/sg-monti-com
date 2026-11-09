import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { DepositFieldMappingContract } from "@/app/javelin/depositMapping/api/DepositFieldMappingContract";
import { DepositFieldMappingDoc } from "@/app/javelin/depositMapping/DepositFieldMappingTypes";

const getDepositFieldMappings = createStandardThunk<DepositFieldMappingContract, "getAll">({
  typePrefix: "depositFieldMapping/getAll",
  apiPath: "/javelin/depositMapping/api",
  opName: "getAll",
});

const upsertDepositFieldMapping = createStandardThunk<DepositFieldMappingContract, "upsert">({
  typePrefix: "depositFieldMapping/upsert",
  apiPath: "/javelin/depositMapping/api",
  opName: "upsert",
});

const removeDepositFieldMapping = createStandardThunk<DepositFieldMappingContract, "remove">({
  typePrefix: "depositFieldMapping/remove",
  apiPath: "/javelin/depositMapping/api",
  opName: "remove",
});

type DepositFieldMappingState = {
  mappingDocs: DepositFieldMappingDoc[];
};

const initialState: DepositFieldMappingState = { mappingDocs: [] };

const depositFieldMappingSlice = createSlice({
  name: "depositFieldMapping",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getDepositFieldMappings.fulfilled, (state, action) => {
      state.mappingDocs = action.payload;
    });
    builder.addCase(upsertDepositFieldMapping.fulfilled, (state, action) => {
      const updated = action.payload;
      const index = state.mappingDocs.findIndex((doc) => doc.field === updated.field);
      if (index >= 0) state.mappingDocs[index] = updated;
      else state.mappingDocs.push(updated);
    });
    builder.addCase(removeDepositFieldMapping.fulfilled, (state, action) => {
      const { field } = action.meta.arg.params;
      state.mappingDocs = state.mappingDocs.filter((doc) => doc.field !== field);
    });
  },
});

export const depositFieldMappingActions = {
  getDepositFieldMappings,
  upsertDepositFieldMapping,
  removeDepositFieldMapping,
};
export const depositFieldMappingReducer = depositFieldMappingSlice.reducer;
