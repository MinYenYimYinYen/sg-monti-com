import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { QboVendorSummary } from "@/app/qbo/vendor/types/QboVendorTypes";

// Read only for now. createVendor is added in Phase E, once the write phase starts.
export interface QboVendorContract extends ApiContract {
  getAll: {
    params: Record<string, never>;
    result: DataResponse<QboVendorSummary[]>;
  };
}
