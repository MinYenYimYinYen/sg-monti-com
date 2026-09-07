import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { PriceIncreaseSettingsDoc } from "@/app/priceIncrease/settings/PriceIncreaseSettingsTypes";

export interface PriceIncreaseSettingsContract extends ApiContract {
  getAll: {
    params: Record<string, never>;
    result: DataResponse<PriceIncreaseSettingsDoc[]>;
  };
  upsert: {
    params: Omit<PriceIncreaseSettingsDoc, "createdAt" | "updatedAt">;
    result: DataResponse<PriceIncreaseSettingsDoc>;
  };
  setActive: {
    params: { settingsId: string };
    result: DataResponse<boolean>;
  };
  remove: {
    params: { settingsId: string };
    result: DataResponse<boolean>;
  };
}
