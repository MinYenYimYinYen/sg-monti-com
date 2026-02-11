import { ApiContract } from "@/lib/api/types/ApiContract";
import { GlobalSettings } from "@/app/globalSettings/_lib/GlobalSettingsTypes";
import { DataResponse } from "@/lib/api/types/responses";

export interface GlobalSettingsContract extends ApiContract {
  updateSettings: {
    params: Partial<GlobalSettings>,
    result: DataResponse<boolean>
  },
  getSettings: {
    params: {},
    result: DataResponse<GlobalSettings>
  }

}