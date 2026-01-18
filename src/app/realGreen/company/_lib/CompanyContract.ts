import { ArrayResponse } from "@/lib/api/types/responses";
import { Company } from "@/app/realGreen/company/_lib/Company";
import { ApiContract } from "@/lib/api/types/ApiContract";

export interface CompanyContract extends ApiContract {
  getAll: {
    params: {};
    result: ArrayResponse<Company>;
  };
}
