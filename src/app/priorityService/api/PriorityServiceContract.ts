import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { PriorityServiceDoc } from "@/app/priorityService/PriorityServiceTypes";

export interface PriorityServiceContract extends ApiContract {
  getAll: {
    params: {};
    result: DataResponse<PriorityServiceDoc[]>;
  };
  upsert: {
    params: { doc: PriorityServiceDoc };
    result: DataResponse<PriorityServiceDoc>;
  };
  deleteOne: {
    params: { servId: number };
    result: DataResponse<PriorityServiceDoc>;
  };
}
