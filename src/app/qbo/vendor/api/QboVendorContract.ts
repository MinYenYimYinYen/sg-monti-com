import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { QboVendorCreateResult, QboVendorSummary } from "@/app/qbo/vendor/types/QboVendorTypes";

export interface QboVendorContract extends ApiContract {
  getAll: {
    params: Record<string, never>;
    result: DataResponse<QboVendorSummary[]>;
  };
  // Admin only. Creates a real vendor in the live books.
  createVendor: {
    params: { displayName: string };
    result: DataResponse<QboVendorCreateResult>;
  };
}
