import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { QboCustomerSummary } from "@/app/qbo/customer/types/QboCustomerTypes";

export interface QboCustomerContract extends ApiContract {
  getAll: {
    params: Record<string, never>;
    result: DataResponse<QboCustomerSummary[]>;
  };
}
