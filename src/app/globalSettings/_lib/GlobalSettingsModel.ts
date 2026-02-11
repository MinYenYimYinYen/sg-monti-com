import mongoose from "mongoose";
import { GlobalSettings } from "@/app/globalSettings/_lib/GlobalSettingsTypes";

interface GlobalSettingsDoc extends mongoose.Document, GlobalSettings {}

const GlobalSettingsSchema = new mongoose.Schema<GlobalSettings>(
  {
    season: { type: Number, required: true, },
  },
  { timestamps: true },
);

export const GlobalSettingsModel =
  (mongoose.models?.GlobalSettings as mongoose.Model<GlobalSettingsDoc>) ||
  mongoose.model<GlobalSettings>("GlobalSettings", GlobalSettingsSchema);