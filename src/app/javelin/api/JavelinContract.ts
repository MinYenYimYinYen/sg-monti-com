import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import {
  PostJournalEntriesResult,
} from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import {
  CkDepositRow,
  DepositRow,
  GenLedgerFileInput,
  JavelinLatest,
  JavelinPlanEntry,
} from "@/app/javelin/JavelinTypes";

// Posting writes to the real books and the previews read them, so the posts and the previews hold
// different capabilities (see javelinCapabilities.ts).
// The browser sends parsed CSV data. The server rebuilds every entry from stored links, so the
// lines it posts are never taken from the browser.
export interface JavelinContract extends ApiContract {
  // Classifies each file as ready, duplicate, possible duplicate, blocked or empty. Writes nothing.
  previewGenLedger: {
    params: { files: GenLedgerFileInput[]; confirmedDocNumbers: string[] };
    result: DataResponse<JavelinPlanEntry[]>;
  };
  previewDeposits: {
    params: { rows: DepositRow[]; fileName: string; confirmedDocNumbers: string[] };
    result: DataResponse<JavelinPlanEntry[]>;
  };
  // Typed-in checking deposits. A deposit equal to one already posted (or earlier in the batch)
  // comes back as a possible duplicate, which posts only when its DocNumber is confirmed.
  previewCkDeposits: {
    params: { rows: CkDepositRow[]; confirmedDocNumbers: string[] };
    result: DataResponse<JavelinPlanEntry[]>;
  };
  postCkDeposits: {
    params: { rows: CkDepositRow[]; confirmedDocNumbers: string[] };
    result: DataResponse<PostJournalEntriesResult>;
  };
  // Re-runs the same plan on the server, then posts what is ready.
  postGenLedger: {
    params: { files: GenLedgerFileInput[]; confirmedDocNumbers: string[] };
    result: DataResponse<PostJournalEntriesResult>;
  };
  postDeposits: {
    params: { rows: DepositRow[]; fileName: string; confirmedDocNumbers: string[] };
    result: DataResponse<PostJournalEntriesResult>;
  };
  // The last posted entry of each kind, and any entries whose outcome is unconfirmed.
  getLatest: {
    params: Record<string, never>;
    result: DataResponse<JavelinLatest>;
  };
}
