import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";

export interface QboAccountContract extends ApiContract {
  getAll: {
    params: Record<string, never>;
    result: DataResponse<QboAccount[]>;
  };
}
