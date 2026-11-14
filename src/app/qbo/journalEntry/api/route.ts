import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createQboRpcHandler } from "@/app/qbo/_lib/api/createQboRpcHandler";
import { QboJournalEntryContract } from "@/app/qbo/journalEntry/api/QboJournalEntryContract";
import { postQboJournalEntries } from "@/app/qbo/journalEntry/_lib/qboJournalEntryServer";
import { reconcileQboJournalEntries } from "@/app/qbo/journalEntry/_lib/qboJournalEntryReconcileServer";
import { loadQboJournalEntryPostings } from "@/app/qbo/journalEntry/_lib/qboJournalEntryReadServer";
import { getPostingUserName } from "@/app/qbo/journalEntry/_lib/qboJournalEntrySettleServer";
import { can } from "@/permission/can";

/**
 * One request posts at most 300 entries (10 batches). A batch that does not fully post stops the
 * run, and one QuickBooks call times out at 60 seconds, so the normal run is far shorter. This
 * is headroom, not an expectation. The platform plan may cap it lower.
 */
export const maxDuration = 300;

// Writing journal entries to the real books was admin only (decided with the user), so
// `journalEntryPostings.write` is its own capability. Assign it deliberately, never by copying
// what another feature's capability holds.
const handlers: HandlerMap<QboJournalEntryContract> = {
  postMany: {
    capability: can.qboJournalEntries.write,
    handler: async ({ entries }) => {
      const postedByUserName = await getPostingUserName();
      return {
        success: true,
        payload: await postQboJournalEntries({ entries, postedByUserName }),
      };
    },
  },
  reconcile: {
    capability: can.qboJournalEntries.write,
    handler: async ({ docNumbers }) => {
      const postedByUserName = await getPostingUserName();
      return {
        success: true,
        payload: await reconcileQboJournalEntries({ docNumbers, postedByUserName }),
      };
    },
  },
  getByDateRange: {
    capability: can.journalEntryHistory.read,
    handler: async ({ startDate, endDate }) => {
      return { success: true, payload: await loadQboJournalEntryPostings({ startDate, endDate }) };
    },
  },
};

export const POST = createQboRpcHandler(handlers);
