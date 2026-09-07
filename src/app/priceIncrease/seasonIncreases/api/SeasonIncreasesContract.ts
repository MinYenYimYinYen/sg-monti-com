import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { SeasonIncreasesDoc } from "@/app/priceIncrease/seasonIncreases/SeasonIncreasesTypes";

export interface SeasonIncreasesContract extends ApiContract {
  getAll: {
    params: Record<string, never>;
    result: DataResponse<SeasonIncreasesDoc[]>;
  };
  upsert: {
    params: Omit<SeasonIncreasesDoc, "createdAt" | "updatedAt">;
    result: DataResponse<SeasonIncreasesDoc>;
  };
  setActive: {
    params: { seasonIncreasesId: string };
    result: DataResponse<boolean>;
  };
  remove: {
    params: { seasonIncreasesId: string };
    result: DataResponse<boolean>;
  };
}
