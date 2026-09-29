import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import type { PrepayConfigDoc } from "./prepayConfigTypes";

const PrepayConfigSchema = new mongoose.Schema<PrepayConfigDoc>(
  {
    configId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    saId: { type: String, required: true, index: true },
    selectionMode: { type: String, enum: ["single", "batch"], required: true },
    season: { type: Number, required: true },
    stdPrepayDiscPercent: { type: Number, required: true },
    upsellPrepayDiscPercent: { type: Number, required: true },
    showCreditBalance: { type: Boolean, required: true },
    showRemitBalance: { type: Boolean, required: true },
    expirationDate: { type: String, required: true },
    autoRenewMessage: { type: String, required: true },
    dontAutoRenewMessage: { type: String, required: true },
    autoRenewHeader: { type: String, required: true },
    dontAutoRenewHeader: { type: String, required: true },
    universalMessage: { type: String, required: true },
  },
  { timestamps: true },
);

// Enforce uniqueness of name per user
PrepayConfigSchema.index({ name: 1, saId: 1 }, { unique: true });

export const PrepayConfigModel = createModel<PrepayConfigDoc>("PrepayConfig", PrepayConfigSchema);
