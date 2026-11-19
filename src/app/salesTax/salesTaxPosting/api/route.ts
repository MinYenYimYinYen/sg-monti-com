import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createQboRpcHandler } from "@/app/qbo/_lib/api/createQboRpcHandler";
import { getPostingUserName } from "@/app/qbo/journalEntry/_lib/qboJournalEntrySettleServer";
import { SalesTaxPostingContract } from "@/app/salesTax/salesTaxPosting/api/SalesTaxPostingContract";
import { postSalesTaxPayment } from "@/app/salesTax/salesTaxPosting/_lib/salesTaxPostingServer";
import {
  loadSalesTaxPaymentStatus,
  retrySalesTaxAttachments,
} from "@/app/salesTax/salesTaxPosting/_lib/salesTaxPostingStatusServer";
import { can } from "@/permission/can";

/**
 * A post sends up to two entries and then uploads two files, each a separate call to QuickBooks
 * with its own timeout, so the normal run is far shorter. This is headroom, not an expectation.
 */
export const maxDuration = 120;

// Posting writes to the real books, so it holds the same capability as every other screen that
// posts journal entries. Reading the stored record needs only the history read.
const handlers: HandlerMap<SalesTaxPostingContract> = {
  getStatus: {
    capability: can.journalEntryHistory.read,
    handler: async ({ periodEnd }) => {
      return { success: true, payload: await loadSalesTaxPaymentStatus(periodEnd) };
    },
  },
  post: {
    capability: can.qboJournalEntries.write,
    handler: async (params) => {
      const postedByUserName = await getPostingUserName();
      return {
        success: true,
        payload: await postSalesTaxPayment({ ...params, postedByUserName }),
      };
    },
  },
  retryAttachments: {
    capability: can.qboJournalEntries.write,
    handler: async ({ periodEnd }) => {
      return { success: true, payload: await retrySalesTaxAttachments(periodEnd) };
    },
  },
};

export const POST = createQboRpcHandler(handlers);
