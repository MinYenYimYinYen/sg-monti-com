import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { ProgramCore } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";

const programSchema = new mongoose.Schema<ProgramCore>(
  {
    progId: { type: Number, required: true, unique: true },
    avgPrice: { type: Number, default: 0 },
    billingType: { type: String, default: "" },
    callAheadId: { type: Number, default: 0 },
    custId: { type: Number, required: true },
    dateSold: { type: String, default: "" },
    discountId: { type: String, default: "" },
    isFullProgram: { type: Boolean, default: false },
    lastPriceChange: { type: String, default: "" },
    nextDate: { type: String, default: "" },
    price: { type: Number, default: 0 },
    progDefId: { type: Number, default: 0 },
    season: { type: Number, required: true },
    soldBy: { type: [String], default: [] },
    sourceCodeId: { type: Number, default: 0 },
    status: { type: String, default: "" },
    techNote: { type: String, default: "" },
    tempSeq: { type: Number, default: 0 },
    holdCodeId: { type: Number, default: null },
    holdStart: { type: String, default: null },
    holdEnd: { type: String, default: null },
    avgTime: { type: Number, default: null },
    cancelCodeId: { type: Number, default: null },
    cancelDate: { type: String, default: null },
    canceledBy: { type: String, default: "" },
    custNote: { type: String, default: "" },
    custNoteExpiration: { type: String, default: null },
    dayCodeId: { type: String, default: "" },
    difficulty: { type: Number, default: 0 },
    isProgram: { type: Boolean, default: false },
    isRenewed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

programSchema.index({ custId: 1 });
programSchema.index({ season: 1 });

export const ProgramModel = createModel<ProgramCore>("Program", programSchema);
