import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import {
  AssignableUser,
  CardAssignment,
  FormatAccount,
  MerchantMapping,
  SkipRule,
} from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";

export interface ImportCCTxnMappingContract extends ApiContract {
  getFormatAccounts: {
    params: Record<string, never>;
    result: DataResponse<FormatAccount[]>;
  };
  upsertFormatAccount: {
    params: { formatAccount: FormatAccount };
    result: DataResponse<FormatAccount>;
  };

  getAssignableUsers: {
    params: Record<string, never>;
    result: DataResponse<AssignableUser[]>;
  };

  getCardAssignments: {
    params: Record<string, never>;
    result: DataResponse<CardAssignment[]>;
  };
  upsertCardAssignment: {
    params: { cardAssignment: CardAssignment };
    result: DataResponse<CardAssignment>;
  };

  getMerchantMappings: {
    params: Record<string, never>;
    result: DataResponse<MerchantMapping[]>;
  };
  upsertMerchantMapping: {
    params: { merchantMapping: MerchantMapping };
    result: DataResponse<MerchantMapping>;
  };
  // Confirms one full description next to the merchant's vendor. Never changes the vendor or
  // accounts. Returns the whole mapping, so the browser replaces its copy.
  confirmMerchant: {
    params: { merchantKey: string; description: string };
    result: DataResponse<MerchantMapping>;
  };
  deleteMerchantMapping: {
    params: { merchantKey: string; ownerUserName: string | null };
    result: DataResponse<{ merchantKey: string; ownerUserName: string | null }>;
  };

  getSkipRules: {
    params: Record<string, never>;
    result: DataResponse<SkipRule[]>;
  };
  upsertSkipRule: {
    params: { skipRule: SkipRule };
    result: DataResponse<SkipRule>;
  };
  deleteSkipRule: {
    params: { merchantKey: string };
    result: DataResponse<{ merchantKey: string }>;
  };
}
