import { ApiContract } from "@/lib/api/types/ApiContract";
import { CustFlagIdsSearch } from "@/app/realGreen/custFlag/api/route";
import { DataResponse } from "@/lib/api/types/responses";
import { CustFlagRefreshResult, FlagIdCustIds } from "@/app/realGreen/custFlag/_lib/CustFlagTypes";

export interface CustFlagContract extends ApiContract {
  loadFlagIdCustIds: {
    params: { searches: CustFlagIdsSearch[] };
    result: DataResponse<FlagIdCustIds[]>;
  };
  /**
   * Fetches all flags for a single customer from RealGreen, then filters the
   * result to only the flagIds already loaded into custFlag state. Returns
   * which of those flagIds are currently present on the customer.
   */
  refreshCustFlags: {
    params: { custId: number; flagIdsInState: number[] };
    result: DataResponse<CustFlagRefreshResult>;
  };
}
