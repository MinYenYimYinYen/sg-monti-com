import { GlobalSettings } from "@/app/globalSettings/_lib/GlobalSettingsTypes";
import { baseCoverSheetsConfig } from "@/app/scheduling/coverSheets/_lib/config/CoverSheetsTypes";

export const baseGlobalSettings: GlobalSettings = {
  createdAt: "",
  updatedAt: "",
  season: new Date().getFullYear(),
  coverSheetsConfig: baseCoverSheetsConfig,
  phoneMap: {
    "Phone": ["Home", "Cell", "Other"],
    "Text": ["Home", "Cell", "Other", "Text"],
    "Email": ["Email"],
    "Manual": []
  },
  companyId: 592421,
};
