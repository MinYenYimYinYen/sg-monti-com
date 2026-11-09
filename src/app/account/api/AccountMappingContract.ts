import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { AccountMappingDoc, AccountMappingNameType } from "@/app/account/AccountMappingTypes";

export interface AccountMappingContract extends ApiContract {
  getAll: {
    params: Record<string, never>;
    result: DataResponse<AccountMappingDoc[]>;
  };
  upsert: {
    // Omitting the default name clears any stored one, so relinking never keeps a stale name.
    params: {
      rgAccountId: string;
      qboAccountId: string;
      defaultNameType?: AccountMappingNameType;
      defaultNameId?: string;
    };
    result: DataResponse<AccountMappingDoc>;
  };
  remove: {
    params: { rgAccountId: string };
    result: DataResponse<boolean>;
  };
}
