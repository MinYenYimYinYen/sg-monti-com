import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { topicEditorActions } from "@/app/knowledgeBase/editor/topicEditorSlice";
import { tabAfterOpeningDetail } from "@/app/knowledgeBase/workspace/knowledgeBaseWorkspaceLogic";
import type { DetailListScope, EditorTab } from "@/app/knowledgeBase/workspace/knowledgeBaseWorkspaceTypes";

type KnowledgeBaseWorkspaceState = {
  editorTab: EditorTab;
  detailListScope: DetailListScope;
};

const initialState: KnowledgeBaseWorkspaceState = {
  editorTab: "topic",
  detailListScope: "openTopic",
};

const knowledgeBaseWorkspaceSlice = createSlice({
  name: "knowledgeBaseWorkspace",
  initialState,
  reducers: {
    setEditorTab: (state, action: PayloadAction<EditorTab>) => {
      state.editorTab = action.payload;
    },
    setDetailListScope: (state, action: PayloadAction<DetailListScope>) => {
      state.detailListScope = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Every way of opening a draft (a list click, New, "Open it instead") goes through these two
    // actions, so the tab follows without each caller having to remember to switch it.
    builder.addCase(topicEditorActions.setTopicDraft, (state) => {
      state.editorTab = "topic";
    });
    builder.addCase(topicEditorActions.setDetailDraft, (state) => {
      state.editorTab = tabAfterOpeningDetail(state.editorTab);
    });
  },
});

export const knowledgeBaseWorkspaceReducer = knowledgeBaseWorkspaceSlice.reducer;
export const knowledgeBaseWorkspaceActions = knowledgeBaseWorkspaceSlice.actions;
