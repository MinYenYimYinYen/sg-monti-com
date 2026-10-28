import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { TopicContract } from "@/app/knowledgeBase/api/TopicContract";
import { TopicDoc } from "@/app/knowledgeBase/TopicTypes";

type TopicState = {
  docs: TopicDoc[];
};

const initialState: TopicState = {
  docs: [],
};

export const getAllTopics = createStandardThunk<TopicContract, "getAll">({
  typePrefix: "topic/getAll",
  apiPath: "/knowledgeBase/api",
  opName: "getAll",
});

export const upsertTopic = createStandardThunk<TopicContract, "upsert">({
  typePrefix: "topic/upsert",
  apiPath: "/knowledgeBase/api",
  opName: "upsert",
});

export const removeTopic = createStandardThunk<TopicContract, "remove">({
  typePrefix: "topic/remove",
  apiPath: "/knowledgeBase/api",
  opName: "remove",
});

const topicSlice = createSlice({
  name: "topic",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getAllTopics.fulfilled, (state, action) => {
      state.docs = action.payload;
    });
    builder.addCase(upsertTopic.fulfilled, (state, action) => {
      const updated = action.payload;
      const index = state.docs.findIndex((doc) => doc.topicKey === updated.topicKey);
      if (index >= 0) {
        state.docs[index] = updated;
      } else {
        state.docs.push(updated);
      }
    });
    builder.addCase(removeTopic.fulfilled, (state, action) => {
      const { topicKey } = action.meta.arg.params;
      state.docs = state.docs.filter((doc) => doc.topicKey !== topicKey);
    });
  },
});

export const topicActions = {
  ...topicSlice.actions,
  getAllTopics,
  upsertTopic,
  removeTopic,
};

export const topicReducer = topicSlice.reducer;
