import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { FlagRule } from "@/app/flagRule/FlagRuleTypes";

export interface FlagRuleContract extends ApiContract {
  getAll: {
    params: Record<string, never>;
    result: DataResponse<FlagRule[]>;
  };
  upsert: {
    params: { flagRule: FlagRule };
    result: DataResponse<FlagRule>;
  };
  deleteOne: {
    params: { flagRuleId: string };
    result: DataResponse<FlagRule>;
  };
}
