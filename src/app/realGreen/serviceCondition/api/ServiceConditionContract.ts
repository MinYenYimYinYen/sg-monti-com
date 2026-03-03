import { ApiContract } from "@/lib/api/types/ApiContract";
import { ServiceConditionDoc } from "../_lib/ServiceConditionTypes";
import { DataResponse } from "@/lib/api/types/responses";

export interface ServiceConditionContract extends ApiContract {
  getServiceConditions: {
    params: { serviceIds: number[] };
    result: DataResponse<ServiceConditionDoc[]>;
  };
}
