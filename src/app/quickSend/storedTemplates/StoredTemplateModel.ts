import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { StoredTemplateDoc } from "./StoredTemplateTypes";

const SectionSchema = new mongoose.Schema(
  {
    sectionId: { type: String, required: true },
    templateHtml: { type: String, required: true, default: "" },
  },
  { _id: false },
);

const ProgramConfigSchema = new mongoose.Schema(
  {
    alias: { type: String, required: true },
    progCodeId: { type: String, required: true },
    includedServCodeIds: { type: [String], required: true, default: [] },
    prepayId: { type: String, default: null },
  },
  { _id: false },
);

const StoredTemplateSchema = new mongoose.Schema<StoredTemplateDoc>(
  {
    templateId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    groupId: { type: String, required: true, index: true },
    saId: { type: String, required: true, index: true },
    sections: { type: [SectionSchema], required: true, default: [] },
    programConfigs: { type: [ProgramConfigSchema], required: true, default: [] },
  },
  { timestamps: true },
);

// Enforce uniqueness of name per user
StoredTemplateSchema.index({ name: 1, saId: 1 }, { unique: true });

export const StoredTemplateModel = createModel("StoredTemplate", StoredTemplateSchema);
