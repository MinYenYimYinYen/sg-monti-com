import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { QboPurchaseRange, QboPurchaseSummary } from "@/app/qbo/purchase/types/QboPurchaseTypes";

// Read only for now. Posting is added in Phase E, once the write phase starts.
export interface QboPurchaseContract extends ApiContract {
  getByDateRange: {
    params: QboPurchaseRange;
    result: DataResponse<QboPurchaseSummary[]>;
  };
}
