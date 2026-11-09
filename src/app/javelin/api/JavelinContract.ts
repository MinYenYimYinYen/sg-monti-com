import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import {
  PostJournalEntriesResult,
} from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import {
  DepositRow,
  GenLedgerFileInput,
  JavelinLatest,
  JavelinPlanEntry,
} from "@/app/javelin/JavelinTypes";
import { JavelinMigrationReport } from "@/app/javelin/migration/JavelinMigrationTypes";

// Every operation is admin only: posting writes to the real books, and the previews read them.
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
  // Proposes QuickBooks Id links for the legacy name-based maps. apply=false writes nothing.
  migrateMappings: {
    params: { apply: boolean };
    result: DataResponse<JavelinMigrationReport>;
  };
}
