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

// Same budget as the QBO journal entry route, which this posts through.
export const maxDuration = 300;

// Admin only, like the QBO journal entry route. Widen the roles deliberately.
const handlers: HandlerMap<JavelinContract> = {
  previewGenLedger: {
    roles: ["admin"],
    handler: async ({ files, confirmedDocNumbers }) => {
      const { plan } = await planGenLedger({ files, confirmedDocNumbers });
      return { success: true, payload: plan };
    },
  },
  previewDeposits: {
    roles: ["admin"],
    handler: async ({ rows, fileName, confirmedDocNumbers }) => {
      const { plan } = await planDeposits({ rows, fileName, confirmedDocNumbers });
      return { success: true, payload: plan };
    },
  },
  postGenLedger: {
    roles: ["admin"],
    handler: async ({ files, confirmedDocNumbers }) => {
      const postedByUserName = await getPostingUserName();
      const planned = await planGenLedger({ files, confirmedDocNumbers });
      return { success: true, payload: await postPlanned({ planned, postedByUserName }) };
    },
  },
  postDeposits: {
    roles: ["admin"],
    handler: async ({ rows, fileName, confirmedDocNumbers }) => {
      const postedByUserName = await getPostingUserName();
      const planned = await planDeposits({ rows, fileName, confirmedDocNumbers });
      return { success: true, payload: await postPlanned({ planned, postedByUserName }) };
    },
  },
  previewCkDeposits: {
    roles: ["admin"],
    handler: async ({ rows, confirmedDocNumbers }) => {
      const { plan } = await planCkDeposits({ rows, confirmedDocNumbers });
      return { success: true, payload: plan };
    },
  },
  postCkDeposits: {
    roles: ["admin"],
    handler: async ({ rows, confirmedDocNumbers }) => {
      const postedByUserName = await getPostingUserName();
      const planned = await planCkDeposits({ rows, confirmedDocNumbers });
      return { success: true, payload: await postPlanned({ planned, postedByUserName }) };
    },
  },
  getLatest: {
    roles: ["admin"],
    handler: async () => ({ success: true, payload: await loadJavelinLatest() }),
  },
};

export const POST = createQboRpcHandler(handlers);
