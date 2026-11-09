import { AccountMappingDoc } from "@/app/account/AccountMappingTypes";
import { nameTypeForQboAccount } from "@/app/account/_lib/accountLinks";
import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";
import {
  JournalEntryInput,
  JournalEntryLineInput,
} from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import { GenLedgerFileInput } from "@/app/javelin/JavelinTypes";
import {
  rgAccountIdFromCrmName,
  splitZeroNetRows,
  toCents,
} from "@/app/javelin/_lib/genLedgerRows";
import { computeGenLedgerHash } from "@/app/javelin/_lib/entrySourceHash";

// Pure. Turns CRM source data plus the stored links into the journal entry to post. Server side
// (it hashes with Node crypto). Nothing here reads the database or QuickBooks.

/** The part of a stored link the entry needs. Both AccountMappingDoc and a deposit field link have it. */
export type LineTarget = Pick<AccountMappingDoc, "qboAccountId" | "defaultNameType" | "defaultNameId">;

const DOC_NUMBER_PREFIX = "SJ";
const DOC_NUMBER_HASH_LENGTH = 12;

/**
 * The Ref no. sent to QuickBooks, derived from the source hash so a retry sends the same value
 * and the entry can be found again by it. "SJ" + 12 hex characters + "-" + occurrence.
 */
export function buildDocNumber({ hash, occurrence }: { hash: string; occurrence: number }): string {
  return `${DOC_NUMBER_PREFIX}${hash.slice(0, DOC_NUMBER_HASH_LENGTH)}-${occurrence}`;
}

/** A name goes on the line only when the account takes one and the stored name is of that kind. */
export function resolveName({
  target,
  qboAccount,
}: {
  target: LineTarget;
  qboAccount: QboAccount | null;
}): Pick<JournalEntryLineInput, "entityType" | "entityId"> {
  const nameType = nameTypeForQboAccount(qboAccount);
  if (!nameType || !target.defaultNameId || target.defaultNameType !== nameType) return {};
  return { entityType: nameType, entityId: target.defaultNameId };
}

/** One file or deposit row, built. `input` is null when it cannot be built or has nothing to post. */
export type BuiltEntry = {
  label: string;
  txnDate: string;
  docNumber: string | null;
  input: JournalEntryInput | null;
  problems: string[];
  isEmpty: boolean;
};

export function emptyEntry({ label, txnDate }: { label: string; txnDate: string }): BuiltEntry {
  return { label, txnDate, docNumber: null, input: null, problems: [], isEmpty: true };
}

export function buildGenLedgerEntry({
  file,
  mappings,
  accountMap,
}: {
  file: GenLedgerFileInput;
  mappings: Map<string, LineTarget>;
  accountMap: Map<string, QboAccount>;
}): BuiltEntry {
  const label = file.fileName;
  const { postingRows } = splitZeroNetRows(file.rows);
  if (postingRows.length === 0) return emptyEntry({ label, txnDate: file.date });

  const sourceLines = postingRows.map((row) => ({
    crmAccount: row.account,
    netCents: toCents(row.totalNetAmount),
  }));
  const hash = computeGenLedgerHash({ date: file.date, lines: sourceLines });
  const docNumber = buildDocNumber({ hash, occurrence: 1 });

  const problems: string[] = [];
  const lines: JournalEntryLineInput[] = [];
  for (const sourceLine of sourceLines) {
    const target = mappings.get(rgAccountIdFromCrmName(sourceLine.crmAccount));
    if (!target) {
      problems.push(`${sourceLine.crmAccount}: not linked to a QuickBooks account.`);
      continue;
    }
    lines.push({
      postingType: sourceLine.netCents > 0 ? "Debit" : "Credit",
      accountId: target.qboAccountId,
      amountCents: Math.abs(sourceLine.netCents),
      description: sourceLine.crmAccount,
      ...resolveName({ target, qboAccount: accountMap.get(target.qboAccountId) ?? null }),
    });
  }
  if (problems.length > 0) {
    return { label, txnDate: file.date, docNumber, input: null, problems, isEmpty: false };
  }

  return {
    label,
    txnDate: file.date,
    docNumber,
    problems: [],
    isEmpty: false,
    input: {
      docNumber,
      txnDate: file.date,
      privateNote: `Javelin general ledger ${file.date} (${file.fileName})`,
      lines,
      source: { kind: "genLedger", sourceHash: hash, fileName: file.fileName, sourceLines },
    },
  };
}

export function buildGenLedgerEntries({
  files,
  mappings,
  accountMap,
}: {
  files: GenLedgerFileInput[];
  mappings: Map<string, LineTarget>;
  accountMap: Map<string, QboAccount>;
}): BuiltEntry[] {
  return files.map((file) => buildGenLedgerEntry({ file, mappings, accountMap }));
}
