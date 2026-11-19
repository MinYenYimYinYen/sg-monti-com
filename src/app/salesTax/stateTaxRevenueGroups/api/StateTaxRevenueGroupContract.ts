import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { StateTaxRevenueGroupDoc } from "@/app/salesTax/stateTaxRevenueGroups/StateTaxRevenueGroupTypes";

export interface StateTaxRevenueGroupContract extends ApiContract {
  getAll: {
    params: Record<string, never>;
    result: DataResponse<StateTaxRevenueGroupDoc[]>;
  };
  /** Starts a new group whose only member is `mnTaxCode`. The server mints the group key. */
  createGroup: {
    params: { mnTaxCode: string };
    result: DataResponse<StateTaxRevenueGroupDoc>;
  };
  /** Puts `mnTaxCode` in an existing group, moving it out of any group it was in. */
  joinGroup: {
    params: { mnTaxCode: string; revenueGroupKey: string };
    result: DataResponse<StateTaxRevenueGroupDoc>;
  };
  leaveGroup: {
    params: { mnTaxCode: string };
    result: DataResponse<boolean>;
  };
}
