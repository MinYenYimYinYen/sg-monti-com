import mongoose from "mongoose";
import { GlobalSettings } from "@/app/globalSettings/_lib/GlobalSettingsTypes";
import { CoverSheetsConfigSchema } from "@/app/scheduling/coverSheets/_lib/config/CoverSheetsConfigSchema";
import { baseGlobalSettings } from "@/app/globalSettings/_lib/baseGlobalSettings";

interface GlobalSettingsDoc extends mongoose.Document, GlobalSettings {}

const GlobalSettingsSchema = new mongoose.Schema<GlobalSettings>(
  {
    season: { type: Number, required: true },
    coverSheetsConfig: {
      type: CoverSheetsConfigSchema,
      required: true,
      default: baseGlobalSettings.coverSheetsConfig,
    },
  },
  { timestamps: true },
);

export const GlobalSettingsModel =
  (mongoose.models?.GlobalSettings as mongoose.Model<GlobalSettingsDoc>) ||
  mongoose.model<GlobalSettings>("GlobalSettings", GlobalSettingsSchema);
