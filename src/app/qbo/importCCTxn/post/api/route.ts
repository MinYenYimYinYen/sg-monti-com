import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createQboRpcHandler } from "@/app/qbo/_lib/api/createQboRpcHandler";
import { ImportPostContract } from "@/app/qbo/importCCTxn/post/api/ImportPostContract";
import { previewBatch, previewPost } from "@/app/qbo/importCCTxn/_lib/importPostLookupServer";
import { postRows } from "@/app/qbo/importCCTxn/_lib/importPostServer";
import { reconcileRow } from "@/app/qbo/importCCTxn/_lib/importReconcileServer";
import { getImportingUserName } from "@/app/qbo/importCCTxn/_lib/importRowAccessServer";

/**
 * One request posts at most 300 rows (10 batches). A batch that does not fully post stops the
 * run, and one QuickBooks call times out at 60 seconds, so the normal run is far shorter. This
 * is headroom, not an expectation. The platform plan may cap it lower.
 */
export const maxDuration = 300;

// Posting to the real books is admin only for now (decided with the user at the start of the
// write phase). Widen the roles deliberately, not by copying from the import route.
const handlers: HandlerMap<ImportPostContract> = {
  previewPost: {
    roles: ["admin"],
    handler: async ({ rowId }) => {
      return { success: true, payload: await previewPost({ rowId }) };
    },
  },
  previewBatch: {
    roles: ["admin"],
    handler: async ({ startDate, endDate }) => {
      return { success: true, payload: await previewBatch({ startDate, endDate }) };
    },
  },
  postRows: {
    roles: ["admin"],
    handler: async ({ rowIds }) => {
      const postedByUserName = await getImportingUserName();
      return { success: true, payload: await postRows({ rowIds, postedByUserName }) };
    },
  },
  reconcileRow: {
    roles: ["admin"],
    handler: async ({ rowId }) => {
      const postedByUserName = await getImportingUserName();
      return { success: true, payload: await reconcileRow({ rowId, postedByUserName }) };
    },
  },
};

export const POST = createQboRpcHandler(handlers);
