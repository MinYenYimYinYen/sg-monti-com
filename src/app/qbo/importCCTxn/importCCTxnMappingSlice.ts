import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { ImportCCTxnMappingContract } from "@/app/qbo/importCCTxn/api/ImportCCTxnMappingContract";
import { importDecisionActions } from "@/app/qbo/importCCTxn/decisions/importDecisionSlice";
import { authActions } from "@/app/auth/authSlice";
import {
  AssignableUser,
  CardAssignment,
  FormatAccount,
  MerchantMapping,
  SkipRule,
} from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";

const API_PATH = "/qbo/importCCTxn/api";

const getAssignableUsers = createStandardThunk<ImportCCTxnMappingContract, "getAssignableUsers">({
  typePrefix: "importCCTxnMapping/getAssignableUsers",
  apiPath: API_PATH,
  opName: "getAssignableUsers",
});

const getFormatAccounts = createStandardThunk<ImportCCTxnMappingContract, "getFormatAccounts">({
  typePrefix: "importCCTxnMapping/getFormatAccounts",
  apiPath: API_PATH,
  opName: "getFormatAccounts",
});
const upsertFormatAccount = createStandardThunk<ImportCCTxnMappingContract, "upsertFormatAccount">({
  typePrefix: "importCCTxnMapping/upsertFormatAccount",
  apiPath: API_PATH,
  opName: "upsertFormatAccount",
});

const getCardAssignments = createStandardThunk<ImportCCTxnMappingContract, "getCardAssignments">({
  typePrefix: "importCCTxnMapping/getCardAssignments",
  apiPath: API_PATH,
  opName: "getCardAssignments",
});
const upsertCardAssignment = createStandardThunk<
  ImportCCTxnMappingContract,
  "upsertCardAssignment"
>({
  typePrefix: "importCCTxnMapping/upsertCardAssignment",
  apiPath: API_PATH,
  opName: "upsertCardAssignment",
});

const getMerchantMappings = createStandardThunk<ImportCCTxnMappingContract, "getMerchantMappings">({
  typePrefix: "importCCTxnMapping/getMerchantMappings",
  apiPath: API_PATH,
  opName: "getMerchantMappings",
});
const upsertMerchantMapping = createStandardThunk<
  ImportCCTxnMappingContract,
  "upsertMerchantMapping"
>({
  typePrefix: "importCCTxnMapping/upsertMerchantMapping",
  apiPath: API_PATH,
  opName: "upsertMerchantMapping",
});
const confirmMerchant = createStandardThunk<ImportCCTxnMappingContract, "confirmMerchant">({
  typePrefix: "importCCTxnMapping/confirmMerchant",
  apiPath: API_PATH,
  opName: "confirmMerchant",
});
const deleteMerchantMapping = createStandardThunk<
  ImportCCTxnMappingContract,
  "deleteMerchantMapping"
>({
  typePrefix: "importCCTxnMapping/deleteMerchantMapping",
  apiPath: API_PATH,
  opName: "deleteMerchantMapping",
});

const getSkipRules = createStandardThunk<ImportCCTxnMappingContract, "getSkipRules">({
  typePrefix: "importCCTxnMapping/getSkipRules",
  apiPath: API_PATH,
  opName: "getSkipRules",
});
const upsertSkipRule = createStandardThunk<ImportCCTxnMappingContract, "upsertSkipRule">({
  typePrefix: "importCCTxnMapping/upsertSkipRule",
  apiPath: API_PATH,
  opName: "upsertSkipRule",
});
const deleteSkipRule = createStandardThunk<ImportCCTxnMappingContract, "deleteSkipRule">({
  typePrefix: "importCCTxnMapping/deleteSkipRule",
  apiPath: API_PATH,
  opName: "deleteSkipRule",
});

type ImportCCTxnMappingState = {
  assignableUsers: AssignableUser[];
  formatAccounts: FormatAccount[];
  cardAssignments: CardAssignment[];
  merchantMappings: MerchantMapping[];
  skipRules: SkipRule[];
};

const initialState: ImportCCTxnMappingState = {
  assignableUsers: [],
  formatAccounts: [],
  cardAssignments: [],
  merchantMappings: [],
  skipRules: [],
};

const importCCTxnMappingSlice = createSlice({
  name: "importCCTxnMapping",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getAssignableUsers.fulfilled, (state, action) => {
      state.assignableUsers = action.payload;
    });

    builder.addCase(getFormatAccounts.fulfilled, (state, action) => {
      state.formatAccounts = action.payload;
    });
    builder.addCase(upsertFormatAccount.fulfilled, (state, action) => {
      const saved = action.payload;
      const index = state.formatAccounts.findIndex((f) => f.formatId === saved.formatId);
      if (index === -1) state.formatAccounts.push(saved);
      else state.formatAccounts[index] = saved;
    });

    builder.addCase(getCardAssignments.fulfilled, (state, action) => {
      state.cardAssignments = action.payload;
    });
    builder.addCase(upsertCardAssignment.fulfilled, (state, action) => {
      const saved = action.payload;
      const index = state.cardAssignments.findIndex(
        (c) => c.formatId === saved.formatId && c.last4 === saved.last4,
      );
      if (index === -1) state.cardAssignments.push(saved);
      else state.cardAssignments[index] = saved;
    });

    builder.addCase(getMerchantMappings.fulfilled, (state, action) => {
      state.merchantMappings = action.payload;
    });
    builder.addCase(upsertMerchantMapping.fulfilled, (state, action) => {
      const saved = action.payload;
      const index = state.merchantMappings.findIndex(
        (m) => m.merchantKey === saved.merchantKey && m.ownerUserName === saved.ownerUserName,
      );
      if (index === -1) state.merchantMappings.push(saved);
      else state.merchantMappings[index] = saved;
    });
    // The server returns the whole mapping, so the list of confirmed descriptions replaces ours.
    builder.addCase(confirmMerchant.fulfilled, (state, action) => {
      const saved = action.payload;
      const index = state.merchantMappings.findIndex(
        (m) => m.merchantKey === saved.merchantKey && m.ownerUserName === saved.ownerUserName,
      );
      if (index === -1) state.merchantMappings.push(saved);
      else state.merchantMappings[index] = saved;
    });
    builder.addCase(deleteMerchantMapping.fulfilled, (state, action) => {
      const deleted = action.payload;
      state.merchantMappings = state.merchantMappings.filter(
        (m) => !(m.merchantKey === deleted.merchantKey && m.ownerUserName === deleted.ownerUserName),
      );
    });

    builder.addCase(getSkipRules.fulfilled, (state, action) => {
      state.skipRules = action.payload;
    });
    builder.addCase(upsertSkipRule.fulfilled, (state, action) => {
      const saved = action.payload;
      const index = state.skipRules.findIndex((s) => s.merchantKey === saved.merchantKey);
      if (index === -1) state.skipRules.push(saved);
      else state.skipRules[index] = saved;
    });
    builder.addCase(deleteSkipRule.fulfilled, (state, action) => {
      state.skipRules = state.skipRules.filter((s) => s.merchantKey !== action.payload.merchantKey);
    });

    // Deleting a user also deletes their card assignments on the server. The staff list is cached,
    // so without this an open tab would keep offering the deleted user as a responsible user.
    builder.addCase(authActions.deleteUser.fulfilled, (state, action) => {
      const { userName } = action.payload;
      state.assignableUsers = state.assignableUsers.filter((user) => user.userName !== userName);
      state.cardAssignments = state.cardAssignments.filter((assignment) => assignment.userName !== userName);
    });

    // The Map tab's batch save returns every mapping and skip rule it stored.
    builder.addCase(importDecisionActions.saveDecisions.fulfilled, (state, action) => {
      for (const saved of action.payload.merchantMappings) {
        const index = state.merchantMappings.findIndex(
          (m) => m.merchantKey === saved.merchantKey && m.ownerUserName === saved.ownerUserName,
        );
        if (index === -1) state.merchantMappings.push(saved);
        else state.merchantMappings[index] = saved;
      }
      for (const saved of action.payload.skipRules) {
        const index = state.skipRules.findIndex((s) => s.merchantKey === saved.merchantKey);
        if (index === -1) state.skipRules.push(saved);
        else state.skipRules[index] = saved;
      }
    });
  },
});

export const importCCTxnMappingActions = {
  getAssignableUsers,
  getFormatAccounts,
  upsertFormatAccount,
  getCardAssignments,
  upsertCardAssignment,
  getMerchantMappings,
  upsertMerchantMapping,
  confirmMerchant,
  deleteMerchantMapping,
  getSkipRules,
  upsertSkipRule,
  deleteSkipRule,
};
export const importCCTxnMappingReducer = importCCTxnMappingSlice.reducer;
