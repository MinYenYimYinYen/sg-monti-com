import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { authActions } from "@/app/auth/authSlice";
import type { KnowledgeBaseSettingsContract } from "@/app/knowledgeBase/knowledgeBaseSettings/api/KnowledgeBaseSettingsContract";
import type {
  ApproverCandidate,
  KnowledgeBaseSettingDoc,
} from "@/app/knowledgeBase/knowledgeBaseSettings/KnowledgeBaseSettingsTypes";

type KnowledgeBaseSettingsState = {
  /** One doc per registered setting once loaded, so an empty list means "not loaded yet". */
  docs: KnowledgeBaseSettingDoc[];
  approverCandidates: ApproverCandidate[];
};

const initialState: KnowledgeBaseSettingsState = {
  docs: [],
  approverCandidates: [],
};

const API_PATH = "/knowledgeBase/knowledgeBaseSettings/api";

export const getAllKnowledgeBaseSettings = createStandardThunk<KnowledgeBaseSettingsContract, "getAll">({
  typePrefix: "knowledgeBaseSettings/getAll",
  apiPath: API_PATH,
  opName: "getAll",
});

export const upsertKnowledgeBaseSetting = createStandardThunk<KnowledgeBaseSettingsContract, "upsert">({
  typePrefix: "knowledgeBaseSettings/upsert",
  apiPath: API_PATH,
  opName: "upsert",
});

export const getApproverCandidates = createStandardThunk<KnowledgeBaseSettingsContract, "getApproverCandidates">({
  typePrefix: "knowledgeBaseSettings/getApproverCandidates",
  apiPath: API_PATH,
  opName: "getApproverCandidates",
});

const knowledgeBaseSettingsSlice = createSlice({
  name: "knowledgeBaseSettings",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getAllKnowledgeBaseSettings.fulfilled, (state, action) => {
      state.docs = action.payload;
    });
    builder.addCase(upsertKnowledgeBaseSetting.fulfilled, (state, action) => {
      const saved = action.payload;
      const index = state.docs.findIndex((doc) => doc.settingKey === saved.settingKey);
      if (index >= 0) {
        state.docs[index] = saved;
      } else {
        state.docs.push(saved);
      }
    });
    builder.addCase(getApproverCandidates.fulfilled, (state, action) => {
      state.approverCandidates = action.payload;
    });
    // The server removes a deleted user from the approver list (deleteUserReferences). The settings are
    // cached, so without this an open tab would keep showing the deleted user as an approver.
    builder.addCase(authActions.deleteUser.fulfilled, (state, action) => {
      const { userName } = action.payload;
      for (const doc of state.docs) {
        if (doc.settingKey === "approvers") {
          doc.value.approverUserNames = doc.value.approverUserNames.filter(
            (approverUserName) => approverUserName !== userName,
          );
        }
      }
      state.approverCandidates = state.approverCandidates.filter((candidate) => candidate.userName !== userName);
    });
  },
});

export const knowledgeBaseSettingsActions = {
  ...knowledgeBaseSettingsSlice.actions,
  getAllKnowledgeBaseSettings,
  upsertKnowledgeBaseSetting,
  getApproverCandidates,
};

export const knowledgeBaseSettingsReducer = knowledgeBaseSettingsSlice.reducer;
