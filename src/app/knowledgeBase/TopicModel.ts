import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { TopicDoc } from "@/app/knowledgeBase/TopicTypes";

const TopicSchema = new Schema<TopicDoc>(
  {
    topicKey: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    signals: { type: [String], default: [] },
    guidance: { type: String, required: true },
    avoid: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const TopicModel = createModel<TopicDoc>("Topic", TopicSchema);
