import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { TopicDetailContract } from "@/app/knowledgeBase/topicDetail/api/TopicDetailContract";
import { TopicDetailDoc } from "@/app/knowledgeBase/topicDetail/TopicDetailTypes";
import { replaceRowsForKey, sortNewestFirst } from "@/app/knowledgeBase/topicDetail/topicDetailVersionLogic";

type TopicDetailState = {
  /**
   * The current rows: every document's head, plus its live version where that is a different row. The
   * full history is not here by default.
   */
  docs: TopicDetailDoc[];
  /** Filled on demand for a document someone is looking back at. Dropped whenever that document changes. */
  historyByDetailKey: Record<string, TopicDetailDoc[]>;
};

const initialState: TopicDetailState = {
  docs: [],
  historyByDetailKey: {},
};

const API_PATH = "/knowledgeBase/topicDetail/api";

export const getCurrentTopicDetails = createStandardThunk<TopicDetailContract, "getCurrent">({
  typePrefix: "topicDetail/getCurrent",
  apiPath: API_PATH,
  opName: "getCurrent",
});

export const getTopicDetailVersionHistory = createStandardThunk<TopicDetailContract, "getVersionHistory">({
  typePrefix: "topicDetail/getVersionHistory",
  apiPath: API_PATH,
  opName: "getVersionHistory",
});

export const saveTopicDetailVersion = createStandardThunk<TopicDetailContract, "saveVersion">({
  typePrefix: "topicDetail/saveVersion",
  apiPath: API_PATH,
  opName: "saveVersion",
});

export const approveTopicDetail = createStandardThunk<TopicDetailContract, "approve">({
  typePrefix: "topicDetail/approve",
  apiPath: API_PATH,
  opName: "approve",
});

export const withdrawTopicDetailApproval = createStandardThunk<TopicDetailContract, "withdrawApproval">({
  typePrefix: "topicDetail/withdrawApproval",
  apiPath: API_PATH,
  opName: "withdrawApproval",
});

export const commentOnTopicDetail = createStandardThunk<TopicDetailContract, "comment">({
  typePrefix: "topicDetail/comment",
  apiPath: API_PATH,
  opName: "comment",
});

export const removeTopicDetail = createStandardThunk<TopicDetailContract, "remove">({
  typePrefix: "topicDetail/remove",
  apiPath: API_PATH,
  opName: "remove",
});

/** Swaps in the rows the server just sent for one document, and forgets its history, which is now stale. */
function applyDocumentRows({
  state,
  detailKey,
  rows,
}: {
  state: TopicDetailState;
  detailKey: string;
  rows: TopicDetailDoc[];
}) {
  state.docs = replaceRowsForKey({ rows: state.docs, detailKey, incoming: rows });
  delete state.historyByDetailKey[detailKey];
}

const topicDetailSlice = createSlice({
  name: "topicDetail",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getCurrentTopicDetails.fulfilled, (state, action) => {
      state.docs = action.payload;
      // A reload can mean approvals changed elsewhere, so any history held may be out of date.
      state.historyByDetailKey = {};
    });
    builder.addCase(getTopicDetailVersionHistory.fulfilled, (state, action) => {
      const { detailKey } = action.meta.arg.params;
      state.historyByDetailKey[detailKey] = sortNewestFirst(action.payload);
    });
    builder.addCase(saveTopicDetailVersion.fulfilled, (state, action) => {
      // The server derives the key from the topics, so it is read from what came back.
      const detailKey = action.payload[0]?.detailKey;
      if (detailKey) applyDocumentRows({ state, detailKey, rows: action.payload });
    });
    builder.addCase(approveTopicDetail.fulfilled, (state, action) => {
      applyDocumentRows({ state, detailKey: action.meta.arg.params.detailKey, rows: action.payload });
    });
    builder.addCase(withdrawTopicDetailApproval.fulfilled, (state, action) => {
      applyDocumentRows({ state, detailKey: action.meta.arg.params.detailKey, rows: action.payload });
    });
    builder.addCase(commentOnTopicDetail.fulfilled, (state, action) => {
      applyDocumentRows({ state, detailKey: action.meta.arg.params.detailKey, rows: action.payload });
    });
    builder.addCase(removeTopicDetail.fulfilled, (state, action) => {
      const { detailKey } = action.meta.arg.params;
      state.docs = state.docs.filter((doc) => doc.detailKey !== detailKey);
      delete state.historyByDetailKey[detailKey];
    });
  },
});

export const topicDetailActions = {
  ...topicDetailSlice.actions,
  getCurrentTopicDetails,
  getTopicDetailVersionHistory,
  saveTopicDetailVersion,
  approveTopicDetail,
  withdrawTopicDetailApproval,
  commentOnTopicDetail,
  removeTopicDetail,
};

export const topicDetailReducer = topicDetailSlice.reducer;
