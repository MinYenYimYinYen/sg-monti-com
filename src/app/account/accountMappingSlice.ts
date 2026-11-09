import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { AccountMappingContract } from "@/app/account/api/AccountMappingContract";
import { AccountMappingDoc } from "@/app/account/AccountMappingTypes";

export const getAccountMappings = createStandardThunk<AccountMappingContract, "getAll">({
  typePrefix: "accountMapping/getAll",
  apiPath: "/account/api",
  opName: "getAll",
});

export const upsertAccountMapping = createStandardThunk<AccountMappingContract, "upsert">({
  typePrefix: "accountMapping/upsert",
  apiPath: "/account/api",
  opName: "upsert",
});

export const removeAccountMapping = createStandardThunk<AccountMappingContract, "remove">({
  typePrefix: "accountMapping/remove",
  apiPath: "/account/api",
  opName: "remove",
});

type AccountMappingState = {
  mappingDocs: AccountMappingDoc[];
};

const initialState: AccountMappingState = {
  mappingDocs: [],
};

const accountMappingSlice = createSlice({
  name: "accountMapping",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getAccountMappings.fulfilled, (state, action) => {
      state.mappingDocs = action.payload;
    });
    builder.addCase(upsertAccountMapping.fulfilled, (state, action) => {
      const updated = action.payload;
      const index = state.mappingDocs.findIndex((d) => d.rgAccountId === updated.rgAccountId);
      if (index >= 0) {
        state.mappingDocs[index] = updated;
      } else {
        state.mappingDocs.push(updated);
      }
    });
    builder.addCase(removeAccountMapping.fulfilled, (state, action) => {
      const { rgAccountId } = action.meta.arg.params;
      state.mappingDocs = state.mappingDocs.filter((d) => d.rgAccountId !== rgAccountId);
    });
  },
});

export const accountMappingActions = {
  ...accountMappingSlice.actions,
  getAccountMappings,
  upsertAccountMapping,
  removeAccountMapping,
};

export const accountMappingReducer = accountMappingSlice.reducer;
