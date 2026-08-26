import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { SeasonPlan } from "@/app/bizPlan/seasonPlan/SeasonPlanTypes";

export interface SeasonPlanContract extends ApiContract {
  getSeasonPlans: {
    params: Record<string, never>;
    result: DataResponse<SeasonPlan[]>;
  };

  upsertSeasonPlan: {
    params: SeasonPlan;
    result: DataResponse<SeasonPlan>;
  };

  deleteSeasonPlan: {
    params: { name: string };
    result: DataResponse<{ name: string }>;
  };

  activateSeasonPlan: {
    params: { name: string };
    result: DataResponse<SeasonPlan[]>;
  };
}
