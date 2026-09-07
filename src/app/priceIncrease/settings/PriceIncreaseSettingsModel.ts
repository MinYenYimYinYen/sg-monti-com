import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { PriceIncreaseSettingsDoc } from "@/app/priceIncrease/settings/PriceIncreaseSettingsTypes";

const PriceIncreaseSettingsSchema = new Schema<PriceIncreaseSettingsDoc>(
  {
    settingsId: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    isActive: { type: Boolean, required: true, default: false },
    seasonIncreasesId: { type: String, required: true },
    progCodeId: { type: String, required: true },
    maxIncreaseNow: { type: Number, required: true },
    maxIncreaseEver: { type: Number, required: true },
    ongoingIncrease: { type: Number, required: true },
    upsellBonusThreshold: { type: Number, required: true },
    upsellBonusPercent: { type: Number, required: true },
    minPriceIncrease: { type: Number, required: true },
    exemptFlagId: { type: Number, default: null },
    manualFlagId: { type: Number, default: null },
    manualAttentionThreshold: { type: Number, required: true },
    flagRounding: { type: String, enum: ["round", "ceil", "floor"], required: true },
  },
  { timestamps: true },
);

export const PriceIncreaseSettingsModel = createModel<PriceIncreaseSettingsDoc>(
  "PriceIncreaseSettings",
  PriceIncreaseSettingsSchema,
);
