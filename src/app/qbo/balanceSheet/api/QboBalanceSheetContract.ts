import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { QboAccountBalance } from "@/app/qbo/balanceSheet/types/QboBalanceSheetTypes";

// Read only. Other reports (the whole sheet, other dates) can be added as more ops.
export interface QboBalanceSheetContract extends ApiContract {
  // A fresh read of QuickBooks every time. Never cached on the server.
  getAccountBalance: {
    params: { accountId: string; asOfDate: string };
    result: DataResponse<QboAccountBalance>;
  };
}
