import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { CustFlagAdd } from "@/app/realGreen/custFlag/_lib/CustFlagTypes";

export interface CustFlagAddContract extends ApiContract {
  addCustFlag: {
    params: CustFlagAdd;
    result: DataResponse<CustFlagAdd>;
  };
}
