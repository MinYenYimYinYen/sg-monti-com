import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { TemplateGroupDoc } from "./StoredTemplateTypes";

const TemplateGroupSchema = new mongoose.Schema<TemplateGroupDoc>(
  {
    groupId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

export const TemplateGroupModel = createModel("TemplateGroup", TemplateGroupSchema);
