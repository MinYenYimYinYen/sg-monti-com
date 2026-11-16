import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { TopicDetailDoc } from "@/app/knowledgeBase/topicDetail/TopicDetailTypes";

const TopicDetailSchema = new Schema<TopicDetailDoc>(
  {
    detailKey: { type: String, required: true, unique: true },
    topicKeys: { type: [String], required: true },
    title: { type: String, required: true },
    contentHtml: { type: String, default: "" },
  },
  { timestamps: true },
);

// Multikey index: finds the documents that reference a topic, which deleting a topic needs.
TopicDetailSchema.index({ topicKeys: 1 });

export const TopicDetailModel = createModel<TopicDetailDoc>("TopicDetail", TopicDetailSchema);
