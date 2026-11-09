import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { AccountMappingNameType } from "@/app/account/AccountMappingTypes";
import { DepositField } from "@/app/javelin/JavelinTypes";
import { DepositFieldMappingDoc } from "@/app/javelin/depositMapping/DepositFieldMappingTypes";

export interface DepositFieldMappingContract extends ApiContract {
  getAll: {
    params: Record<string, never>;
    result: DataResponse<DepositFieldMappingDoc[]>;
  };
  upsert: {
    // Omitting the default name clears any stored one, so relinking never keeps a stale name.
    params: {
      field: DepositField;
      qboAccountId: string;
      defaultNameType?: AccountMappingNameType;
      defaultNameId?: string;
    };
    result: DataResponse<DepositFieldMappingDoc>;
  };
  remove: {
    params: { field: DepositField };
    result: DataResponse<boolean>;
  };
}
