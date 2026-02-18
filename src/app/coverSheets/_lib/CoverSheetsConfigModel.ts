import mongoose from "mongoose";
import { CoverSheetsConfig } from "@/app/coverSheets/_lib/CoverSheetsTypes";
import { createModel } from "@/lib/mongoose/createModel";

interface CoverSheetsConfigModelDoc extends mongoose.Document, CoverSheetsConfig {}

const CoverSheetsConfigSchema = new mongoose.Schema<CoverSheetsConfigModelDoc>({
  flagIds: { type: [Number], required: true },
});


export const coverSheetsConfigModel = createModel<CoverSheetsConfigModelDoc>(
  "CoverSheetsConfig",
  CoverSheetsConfigSchema,
);

