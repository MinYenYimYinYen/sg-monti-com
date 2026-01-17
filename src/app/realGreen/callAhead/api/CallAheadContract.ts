import { ArrayResponse } from "@/lib/api/types/responses";
import { CallAhead } from "@/app/realGreen/callAhead/CallAhead";

export interface CallAheadContract {
  getAll: {
    params: {};
    result: ArrayResponse<CallAhead>;
  };
}
