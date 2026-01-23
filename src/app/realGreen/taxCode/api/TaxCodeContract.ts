import { DataResponse } from "@/lib/api/types/responses";
import { TaxCode } from "@/app/realGreen/taxCode/TaxCode";
import { ApiContract } from "@/lib/api/types/ApiContract";

export interface TaxCodeContract extends ApiContract {
  getAll: {
    params: {};
    result: DataResponse<TaxCode[]>;
  };
}
