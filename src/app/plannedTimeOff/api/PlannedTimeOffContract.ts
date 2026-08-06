import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { PlannedTimeOff } from "@/app/plannedTimeOff/plannedTimeOffTypes";

export interface PlannedTimeOffContract extends ApiContract {
  getAll: {
    params: Record<string, never>;
    result: DataResponse<PlannedTimeOff[]>;
  };
  upsert: {
    params: { doc: PlannedTimeOff };
    result: DataResponse<PlannedTimeOff>;
  };
  deleteOne: {
    params: { plannedTimeOffId: string };
    result: DataResponse<PlannedTimeOff>;
  };
}
