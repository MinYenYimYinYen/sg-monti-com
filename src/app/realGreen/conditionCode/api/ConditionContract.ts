import { ApiContract } from "@/lib/api/types/ApiContract";
import { ConditionDoc } from "@/app/realGreen/conditionCode/_types/ConditionCodeTypes";
import { DataResponse } from "@/lib/api/types/responses";

export interface ConditionContract extends ApiContract {
  getAll: {
    params: {};
    result: DataResponse<ConditionDoc[]>;
  };
}
