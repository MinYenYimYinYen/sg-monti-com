import { DataResponse } from "@/lib/api/types/responses";
import { ApiContract } from "@/lib/api/types/ApiContract";
import { CallAheadDoc } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";

export interface CallAheadContract extends ApiContract {
  getAll: {
    params: {};
    result: DataResponse<CallAheadDoc[]>;
  };
}
