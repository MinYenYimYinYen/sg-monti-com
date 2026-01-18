import { ArrayResponse } from "@/lib/api/types/responses";
import { CallAhead } from "@/app/realGreen/callAhead/CallAhead";
import { ApiContract } from "@/lib/api/types/ApiContract";

export interface CallAheadContract extends ApiContract {
  getAll: {
    params: {};
    result: ArrayResponse<CallAhead>;
  };
}
