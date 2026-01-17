import { ArrayResponse } from "@/lib/api/types/responses";
import { Company } from "@/app/realGreen/company/_lib/Company";

export interface CompanyContract {
  getAll: {
    params: {};
    result: ArrayResponse<Company>;
  };
}
