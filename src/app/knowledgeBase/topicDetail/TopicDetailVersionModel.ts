import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { TopicDetailDoc } from "@/app/knowledgeBase/topicDetail/TopicDetailTypes";

const StampSchema = new Schema(
  { userName: { type: String, required: true }, at: { type: String, required: true } },
  { _id: false },
);

const CommentSchema = new Schema(
  {
    userName: { type: String, required: true },
    at: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false },
);

// One row per version of a document. `minimize: false` keeps empty arrays and `approvedAt: null` as written.
const TopicDetailVersionSchema = new Schema<TopicDetailDoc>(
  {
    detailKey: { type: String, required: true },
    version: { type: Number, required: true },
    topicKeys: { type: [String], required: true },
    title: { type: String, required: true },
    contentHtml: { type: String, default: "" },
    modifiedBy: { type: String, required: true },
    approval: {
      approvedAt: { type: String, default: null },
      approvedBy: { type: [StampSchema], default: [] },
    },
    comments: { type: [CommentSchema], default: [] },
  },
  { timestamps: true, minimize: false },
);

// The identity of a row, and how the head and live version of a document are found.
TopicDetailVersionSchema.index({ detailKey: 1, version: -1 }, { unique: true });
// Multikey index: finds the documents that reference a topic, which deleting a topic needs.
TopicDetailVersionSchema.index({ topicKeys: 1 });

export const TopicDetailVersionModel = createModel<TopicDetailDoc>("TopicDetailVersion", TopicDetailVersionSchema);
