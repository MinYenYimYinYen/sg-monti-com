import { GlobalSettings } from "@/app/globalSettings/_lib/GlobalSettingsTypes";
import { baseCoverSheetsConfig } from "@/app/scheduling/coverSheets/_lib/config/CoverSheetsTypes";

export const baseGlobalSettings: GlobalSettings = {
  createdAt: "",
  updatedAt: "",
  season: new Date().getFullYear(),
  coverSheetsConfig: baseCoverSheetsConfig,
  phoneMap: {
    "P": ["Home", "Cell", "Other"],
    "T": ["Home", "Cell", "Other", "Text"],
    "E": [],
    "U": ["Home", "Cell", "Other"]
  }
};
