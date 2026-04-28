import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import type { TemplateGroupDoc } from "./StoredTemplateTypes";

const TemplateGroupSchema = new mongoose.Schema<TemplateGroupDoc>(
  {
    groupId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

// Reuse the same collection as v1 — groups are shared between both versions.
export const TemplateGroupModel = createModel("TemplateGroup", TemplateGroupSchema);
