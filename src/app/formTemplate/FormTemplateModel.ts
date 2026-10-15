import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import type { FormLetterTemplateDoc, FormLetterSlotDoc } from "./FormTemplateTypes";

const FormLetterSlotSchema = new mongoose.Schema<FormLetterSlotDoc>(
  {
    key: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    options: { type: mongoose.Schema.Types.Mixed, default: undefined },
  },
  { _id: false },
);

const FormLetterTemplateSchema = new mongoose.Schema<FormLetterTemplateDoc>(
  {
    templateId: { type: String, required: true, unique: true, index: true },
    templateName: { type: String, required: true },
    dataType: { type: String, required: true },
    pageSize: { type: String, required: true, enum: ["LETTER", "LEGAL"] },
    slots: { type: [FormLetterSlotSchema], required: true, default: [] },
  },
  { timestamps: true },
);

export const FormTemplateModel = createModel<FormLetterTemplateDoc>(
  "FormLetterTemplate",
  FormLetterTemplateSchema,
);
