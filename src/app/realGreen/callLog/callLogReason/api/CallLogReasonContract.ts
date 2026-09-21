import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { CallLogReasonDoc } from "@/app/realGreen/callLog/callLogReason/CallLogReasonTypes";

export interface CallLogReasonContract extends ApiContract {
  getAll: {
    params: {};
    result: DataResponse<CallLogReasonDoc[]>;
  };
}
