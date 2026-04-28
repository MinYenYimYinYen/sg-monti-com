import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import type { StoredTemplateDoc } from "./StoredTemplateTypes";

const SectionSchema = new mongoose.Schema(
  {
    sectionId: { type: String, required: true },
    name: { type: String, required: true, default: "New Section" },
    templateHtml: { type: String, required: true, default: "" },
  },
  { _id: false },
);

const ProgramConfigSchema = new mongoose.Schema(
  {
    progCodeId: { type: String, required: true },
    includedServCodeIds: { type: [String], required: true, default: [] },
    priceOverride: { type: Number, default: null },
    prepayId: { type: String, default: null },
  },
  { _id: false },
);

const StoredTemplate2Schema = new mongoose.Schema<StoredTemplateDoc>(
  {
    templateId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    groupId: { type: String, default: null, index: true },
    saId: { type: String, required: true, index: true },
    sections: { type: [SectionSchema], required: true, default: [] },
    programConfigs: { type: [ProgramConfigSchema], required: true, default: [] },
    globalPrepayId: { type: String, default: null },
  },
  { timestamps: true },
);

// Enforce uniqueness of name per user
StoredTemplate2Schema.index({ name: 1, saId: 1 }, { unique: true });

export const StoredTemplate2Model = createModel("StoredTemplate2", StoredTemplate2Schema);
