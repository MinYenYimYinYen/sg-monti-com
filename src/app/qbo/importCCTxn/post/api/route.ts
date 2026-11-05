import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createQboRpcHandler } from "@/app/qbo/_lib/api/createQboRpcHandler";
import { ImportPostContract } from "@/app/qbo/importCCTxn/post/api/ImportPostContract";
import { previewPost } from "@/app/qbo/importCCTxn/_lib/importPostLookupServer";
import { postRows, reconcileRow } from "@/app/qbo/importCCTxn/_lib/importPostServer";
import { getImportingUserName } from "@/app/qbo/importCCTxn/_lib/importRowAccessServer";

// Posting to the real books is admin only for now (decided with the user at the start of the
// write phase). Widen the roles deliberately, not by copying from the import route.
const handlers: HandlerMap<ImportPostContract> = {
  previewPost: {
    roles: ["admin"],
    handler: async ({ rowId }) => {
      return { success: true, payload: await previewPost({ rowId }) };
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
