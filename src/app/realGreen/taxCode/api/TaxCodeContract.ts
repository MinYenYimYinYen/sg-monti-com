import { ArrayResponse } from "@/lib/api/types/responses";
import { TaxCode } from "@/app/realGreen/taxCode/TaxCode";

export interface TaxCodeContract {
  getAll: {
    params: {};
    result: ArrayResponse<TaxCode>;
  };
}
