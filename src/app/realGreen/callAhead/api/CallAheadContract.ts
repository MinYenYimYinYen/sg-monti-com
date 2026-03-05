import { DataResponse } from "@/lib/api/types/responses";
import { ApiContract } from "@/lib/api/types/ApiContract";
import { CallAheadDoc } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import { CallAheadKeyword } from "@/app/realGreen/callAhead/_lib/ext/CallAheadExtTypes";

export interface CallAheadContract extends ApiContract {
  getAll: {
    params: {};
    result: DataResponse<CallAheadDoc[]>;
  };

  upsertKeyword: {
    params: { keyword: CallAheadKeyword };
    result: DataResponse<CallAheadKeyword>;
  };

  deleteKeyword: {
    params: { keywordId: string };
    result: DataResponse<CallAheadKeyword>;
  };

  getKeywords: {
    params: {};
    result: DataResponse<CallAheadKeyword[]>;
  };
}
