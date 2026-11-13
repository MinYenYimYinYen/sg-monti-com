import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createQboRpcHandler } from "@/app/qbo/_lib/api/createQboRpcHandler";
import { getPostingUserName } from "@/app/qbo/journalEntry/_lib/qboJournalEntrySettleServer";
import { JavelinContract } from "@/app/javelin/api/JavelinContract";
import {
  planCkDeposits,
  planDeposits,
  planGenLedger,
  postPlanned,
} from "@/app/javelin/_lib/javelinPlanServer";
import { loadJavelinLatest } from "@/app/javelin/_lib/javelinLatestServer";
import { javelinCapabilities } from "@/app/javelin/javelinCapabilities";

// Same budget as the QBO journal entry route, which this posts through.
export const maxDuration = 300;

const { can } = javelinCapabilities;

// The previews and getLatest read the books, so they share `entryPlans.read`. The three posts write
// real journal entries, so they share the separate `journalEntryPostings.qbo.write`.
const handlers: HandlerMap<JavelinContract> = {
  previewGenLedger: {
    capability: can.entryPlans.read,
    handler: async ({ files, confirmedDocNumbers }) => {
      const { plan } = await planGenLedger({ files, confirmedDocNumbers });
      return { success: true, payload: plan };
    },
  },
  previewDeposits: {
    capability: can.entryPlans.read,
    handler: async ({ rows, fileName, confirmedDocNumbers }) => {
      const { plan } = await planDeposits({ rows, fileName, confirmedDocNumbers });
      return { success: true, payload: plan };
    },
  },
  postGenLedger: {
    capability: can.journalEntryPostings.write,
    handler: async ({ files, confirmedDocNumbers }) => {
      const postedByUserName = await getPostingUserName();
      const planned = await planGenLedger({ files, confirmedDocNumbers });
      return { success: true, payload: await postPlanned({ planned, postedByUserName }) };
    },
  },
  postDeposits: {
    capability: can.journalEntryPostings.write,
    handler: async ({ rows, fileName, confirmedDocNumbers }) => {
      const postedByUserName = await getPostingUserName();
      const planned = await planDeposits({ rows, fileName, confirmedDocNumbers });
      return { success: true, payload: await postPlanned({ planned, postedByUserName }) };
    },
  },
  previewCkDeposits: {
    capability: can.entryPlans.read,
    handler: async ({ rows, confirmedDocNumbers }) => {
      const { plan } = await planCkDeposits({ rows, confirmedDocNumbers });
      return { success: true, payload: plan };
    },
  },
  postCkDeposits: {
    capability: can.journalEntryPostings.write,
    handler: async ({ rows, confirmedDocNumbers }) => {
      const postedByUserName = await getPostingUserName();
      const planned = await planCkDeposits({ rows, confirmedDocNumbers });
      return { success: true, payload: await postPlanned({ planned, postedByUserName }) };
    },
  },
  getLatest: {
    capability: can.entryPlans.read,
    handler: async () => ({ success: true, payload: await loadJavelinLatest() }),
  },
};

export const POST = createQboRpcHandler(handlers);
