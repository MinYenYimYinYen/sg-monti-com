import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { topicActions } from "@/app/knowledgeBase/topic/topicSlice";
import { topicDetailActions } from "@/app/knowledgeBase/topicDetail/topicDetailSlice";
import type { TopicDetailDraft, TopicDraft } from "@/app/knowledgeBase/editor/topicEditorTypes";
import {
  deriveDraftDetailKey,
  makeDetailDraftFromDoc,
  makeTopicDraftFromDoc,
} from "@/app/knowledgeBase/editor/topicEditorLogic";

type TopicEditorState = {
  /** The topic open in the editor. null = none. */
  topicDraft: TopicDraft | null;
  /** The document open in the editor. null = none. */
  detailDraft: TopicDetailDraft | null;
  /**
   * Bumped whenever a different document is loaded. The body editor is keyed on it, so it remounts
   * with the new content instead of syncing props into itself.
   */
  detailDraftVersion: number;
};

const initialState: TopicEditorState = {
  topicDraft: null,
  detailDraft: null,
  detailDraftVersion: 0,
};

const topicEditorSlice = createSlice({
  name: "topicEditor",
  initialState,
  reducers: {
    setTopicDraft: (state, action: PayloadAction<TopicDraft>) => {
      state.topicDraft = action.payload;
    },
    updateTopicDraft: (state, action: PayloadAction<Partial<TopicDraft>>) => {
      if (state.topicDraft) {
        state.topicDraft = { ...state.topicDraft, ...action.payload };
      }
    },
    clearTopicDraft: (state) => {
      state.topicDraft = null;
    },
    setDetailDraft: (state, action: PayloadAction<TopicDetailDraft>) => {
      state.detailDraft = action.payload;
      state.detailDraftVersion += 1;
    },
    updateDetailDraft: (state, action: PayloadAction<Partial<TopicDetailDraft>>) => {
      if (state.detailDraft) {
        state.detailDraft = { ...state.detailDraft, ...action.payload };
      }
    },
    clearDetailDraft: (state) => {
      state.detailDraft = null;
    },
  },
  extraReducers: (builder) => {
    // The saved doc becomes the active entity, so the unsaved flag clears. Matching on the key keeps a
    // finished save from overwriting a different draft the user has since opened.
    builder.addCase(topicActions.upsertTopic.fulfilled, (state, action) => {
      const saved = action.payload;
      if (state.topicDraft?.topicKey === saved.topicKey) {
        state.topicDraft = makeTopicDraftFromDoc(saved);
      }
    });
    builder.addCase(topicActions.removeTopic.fulfilled, (state, action) => {
      if (state.topicDraft?.topicKey === action.meta.arg.params.topicKey) {
        state.topicDraft = null;
      }
    });
    builder.addCase(topicDetailActions.upsertTopicDetail.fulfilled, (state, action) => {
      const saved = action.payload;
      const draftKey = state.detailDraft ? deriveDraftDetailKey(state.detailDraft) : null;
      if (draftKey === saved.detailKey) {
        state.detailDraft = makeDetailDraftFromDoc(saved);
      }
    });
    builder.addCase(topicDetailActions.removeTopicDetail.fulfilled, (state, action) => {
      const draftKey = state.detailDraft ? deriveDraftDetailKey(state.detailDraft) : null;
      if (draftKey === action.meta.arg.params.detailKey) {
        state.detailDraft = null;
      }
    });
  },
});

export const topicEditorReducer = topicEditorSlice.reducer;
export const topicEditorActions = topicEditorSlice.actions;
