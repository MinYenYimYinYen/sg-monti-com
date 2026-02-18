import { ApiContract } from "@/lib/api/types/ApiContract";
import { CustFlagIdsSearch } from "@/app/realGreen/custFlag/api/route";
import { DataResponse } from "@/lib/api/types/responses";
import { FlagIdCustIds } from "@/app/realGreen/custFlag/_lib/CustFlagTypes";



export interface CustFlagContract extends ApiContract {
  loadFlagIdCustIds: {
    params: {searches: CustFlagIdsSearch[]};
    result: DataResponse<FlagIdCustIds[]>
  }
}