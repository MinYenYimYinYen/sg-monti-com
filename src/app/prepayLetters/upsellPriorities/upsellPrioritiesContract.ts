import type { ApiContract } from "@/lib/api/types/ApiContract";
import type { DataResponse } from "@/lib/api/types/responses";
import type { UpsellPrioritiesDoc, UpsellPrioritiesDraft } from "./upsellPrioritiesTypes";

export interface UpsellPrioritiesContract extends ApiContract {
  /** Fetch all saved lists, visible to all authenticated users. */
  getUpsellPriorities: {
    params: Record<string, never>;
    result: DataResponse<UpsellPrioritiesDoc[]>;
  };

  /**
   * Create or overwrite a list.
   * `upsellPrioritiesId` is generated server-side from `name + saId`.
   */
  saveUpsellPriorities: {
    params: { upsellPriorities: UpsellPrioritiesDraft };
    result: DataResponse<UpsellPrioritiesDoc>;
  };

  /** Delete a list. Caller must be the owner. */
  deleteUpsellPriorities: {
    params: { upsellPrioritiesId: string };
    result: DataResponse<null>;
  };
}
