import { DataResponse } from "@/lib/api/types/responses";
import { CallAheadDoc } from "@/app/realGreen/callAhead/_lib/CallAhead";
import { ApiContract } from "@/lib/api/types/ApiContract";

export interface CallAheadContract extends ApiContract {
  getAll: {
    params: {};
    result: DataResponse<CallAheadDoc[]>;
  };
}
