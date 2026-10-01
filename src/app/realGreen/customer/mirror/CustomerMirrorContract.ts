import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { StreamChunk } from "@/app/realGreen/customer/api/CustomerContract";
import { MirrorQueryPlan } from "@/app/realGreen/customer/mirror/MirrorTypes";

export interface CustomerMirrorContract extends ApiContract {
  /**
   * Executes a MirrorQueryPlan against our synced MongoDB collections
   * (the "mirror" of RealGreen data) and streams results back as NDJSON chunks.
   *
   * The plan is a serializable array of query steps built client-side via
   * QueryBuilder. Each step specifies:
   * - Which model to query (customer, program, service)
   * - How to filter (any field on the Core type, with AND/OR support)
   * - Whether to receive join values from a previous step
   * - Whether to expose join values to subsequent steps
   * - Whether to include results in the streaming payload
   *
   * Steps with `"entity"` in their roles emit a StreamChunk using the same
   * shape as the existing RealGreen pipeline, so the receiving slice's
   * receiveChunk reducer works unchanged.
   *
   * See MirrorQueryPlan.md for full documentation and examples.
   */
  getMirrorCustomers: {
    params: {
      plan: MirrorQueryPlan;
      /**
       * If true, runs a delta sync against RealGreen before executing the query plan.
       * Use this as a fallback when the Vercel Cron job is not running or when
       * absolutely fresh data is required. Defaults to false (cron keeps mirror current).
       *
       * To re-enable sync-before-query globally: set syncFirst: true in the hook params.
       */
      syncFirst?: boolean;
    };
    result: DataResponse<StreamChunk[]>;
  };
}
