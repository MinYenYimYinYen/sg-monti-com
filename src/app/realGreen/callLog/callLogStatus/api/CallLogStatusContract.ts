import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse, SuccessResponse } from "@/lib/api/types/responses";
import { CallLogStatus } from "@/app/realGreen/callLog/callLogStatus/CallLogStatusTypes";

export interface CallLogStatusContract extends ApiContract {
  getAll: {
    params: {};
    result: DataResponse<CallLogStatus[]>;
  };
  upsert: {
    params: { callLogStatus: Omit<CallLogStatus, "createdAt" | "updatedAt"> };
    result: DataResponse<CallLogStatus>;
  };
  delete: {
    params: { code: string };
    result: SuccessResponse;
  };
}
