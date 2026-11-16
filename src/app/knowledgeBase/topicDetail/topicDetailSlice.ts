import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { TopicDetailContract } from "@/app/knowledgeBase/topicDetail/api/TopicDetailContract";
import { TopicDetailDoc } from "@/app/knowledgeBase/topicDetail/TopicDetailTypes";

type TopicDetailState = {
  docs: TopicDetailDoc[];
};

const initialState: TopicDetailState = {
  docs: [],
};

export const getAllTopicDetails = createStandardThunk<TopicDetailContract, "getAll">({
  typePrefix: "topicDetail/getAll",
  apiPath: "/knowledgeBase/topicDetail/api",
  opName: "getAll",
});

export const upsertTopicDetail = createStandardThunk<TopicDetailContract, "upsert">({
  typePrefix: "topicDetail/upsert",
  apiPath: "/knowledgeBase/topicDetail/api",
  opName: "upsert",
});

export const removeTopicDetail = createStandardThunk<TopicDetailContract, "remove">({
  typePrefix: "topicDetail/remove",
  apiPath: "/knowledgeBase/topicDetail/api",
  opName: "remove",
});

const topicDetailSlice = createSlice({
  name: "topicDetail",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getAllTopicDetails.fulfilled, (state, action) => {
      state.docs = action.payload;
    });
    builder.addCase(upsertTopicDetail.fulfilled, (state, action) => {
      const updated = action.payload;
      const index = state.docs.findIndex((doc) => doc.detailKey === updated.detailKey);
      if (index >= 0) {
        state.docs[index] = updated;
      } else {
        state.docs.push(updated);
      }
    });
    builder.addCase(removeTopicDetail.fulfilled, (state, action) => {
      const { detailKey } = action.meta.arg.params;
      state.docs = state.docs.filter((doc) => doc.detailKey !== detailKey);
    });
  },
});

export const topicDetailActions = {
  ...topicDetailSlice.actions,
  getAllTopicDetails,
  upsertTopicDetail,
  removeTopicDetail,
};

export const topicDetailReducer = topicDetailSlice.reducer;
