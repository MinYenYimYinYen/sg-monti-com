import mongoose from "mongoose";
import {
  GlobalSettings,
  RenewalFlagIds,
} from "@/app/globalSettings/_lib/GlobalSettingsTypes";
import { CoverSheetsConfigSchema } from "@/app/scheduling/coverSheets/_lib/config/CoverSheetsConfigSchema";
import { baseGlobalSettings } from "@/app/globalSettings/_lib/baseGlobalSettings";

interface GlobalSettingsDoc extends mongoose.Document, GlobalSettings {}

const renewalSettingsSchema = new mongoose.Schema<RenewalFlagIds>({
  autoRenew: { type: Number, required: true },
  dontAutoRenew: { type: Number, required: true },
  confirmed: { type: Number, required: true },
});

const GlobalSettingsSchema = new mongoose.Schema<GlobalSettings>(
  {
    season: { type: Number, required: true },
    coverSheetsConfig: {
      type: CoverSheetsConfigSchema,
      required: true,
      default: baseGlobalSettings.coverSheetsConfig,
    },
    phoneMap: {
      type: Object,
      required: true,
      default: baseGlobalSettings.phoneMap,
    },
    genLedgerAccountMap: {
      type: Object,
      required: true,
      default: {},
    },
    depositAccountMap: {
      type: Object,
      required: true,
      default: {},
    },
    renewalFlagIds: {
      type: renewalSettingsSchema,
      required: true,
      default: baseGlobalSettings.renewalFlagIds,
    },
  },
  { timestamps: true },
);

export const GlobalSettingsModel =
  (mongoose.models?.GlobalSettings as mongoose.Model<GlobalSettingsDoc>) ||
  mongoose.model<GlobalSettings>("GlobalSettings", GlobalSettingsSchema);
