import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import type { FormTemplateDoc, FormTemplateSlotDoc } from "./FormTemplateTypes";

const FormTemplateSlotSchema = new mongoose.Schema<FormTemplateSlotDoc>(
  {
    slotId: { type: String, required: true },
    key: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    options: { type: mongoose.Schema.Types.Mixed, default: undefined },
  },
  { _id: false },
);

const FormTemplateSchema = new mongoose.Schema<FormTemplateDoc>(
  {
    templateId: { type: String, required: true, unique: true, index: true },
    templateName: { type: String, required: true },
    dataType: { type: String, required: true },
    pageSize: { type: String, required: true, enum: ["LETTER", "LEGAL"] },
    slots: { type: [FormTemplateSlotSchema], required: true, default: [] },
  },
  { timestamps: true },
);

// The model name determines the Mongo collection. It predates the "Letter" rename, so
// changing it would silently point at an empty collection.
export const FormTemplateModel = createModel<FormTemplateDoc>(
  "FormLetterTemplate",
  FormTemplateSchema,
);
