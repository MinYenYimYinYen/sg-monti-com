import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { SalesTaxMappingDoc } from "@/app/salesTax/salesTaxMapping/SalesTaxMappingTypes";

export interface SalesTaxMappingContract extends ApiContract {
  getAll: {
    params: Record<string, never>;
    result: DataResponse<SalesTaxMappingDoc[]>;
  };
  upsert: {
    params: Omit<SalesTaxMappingDoc, "createdAt" | "updatedAt">;
    result: DataResponse<SalesTaxMappingDoc>;
  };
  remove: {
    params: { taxCodeId: string };
    result: DataResponse<boolean>;
  };
}
