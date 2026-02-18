import mongoose from "mongoose";
import { CoverSheetsConfig } from "@/app/scheduling/coverSheets/_lib/config/CoverSheetsTypes";
import { baseGlobalSettings } from "@/app/globalSettings/_lib/baseGlobalSettings";



export const CoverSheetsConfigSchema =
  new mongoose.Schema<CoverSheetsConfig>({
    flagIds: {
      type: [Number],
      required: true,
      default: baseGlobalSettings.coverSheetsConfig.flagIds,
    },
  });


// This is being handled in GlobalSettings

// export const coverSheetsConfigModel = createModel<CoverSheetsConfigModelDoc>(
//   "CoverSheetsConfig",
//   CoverSheetsConfigSchema,
// );

