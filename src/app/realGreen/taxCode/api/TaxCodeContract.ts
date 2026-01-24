import { DataResponse } from "@/lib/api/types/responses";
import {TaxCode, TaxCodeDoc} from "@/app/realGreen/taxCode/TaxCodeTypes";
import { ApiContract } from "@/lib/api/types/ApiContract";

export interface TaxCodeContract extends ApiContract {
  getAll: {
    params: {};
    result: DataResponse<TaxCodeDoc[]>;
  };
}
