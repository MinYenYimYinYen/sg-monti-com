import { qboConst } from "@/app/qbo/_lib/qboConst";
import { loadQboAccounts } from "@/app/qbo/account/_lib/qboAccountServer";
import {
  JournalEntryBlocked,
  JournalEntryInput,
  JournalEntryPosting,
  JournalEntryPostingContent,
} from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import {
  isSafeDocNumber,
  validateJournalEntryInput,
} from "@/app/qbo/journalEntry/_lib/qboJournalEntryUtils";
import {
  buildPostingContent,
  checkEntryAgainstAccounts,
} from "@/app/qbo/journalEntry/_lib/qboJournalEntryPayloadUtils";
import { findJournalEntriesByDocNumber } from "@/app/qbo/journalEntry/_lib/qboJournalEntryLookupServer";
import {
  loadPostingsByDocNumber,
  savePendingPosting,
  validationError,
} from "@/app/qbo/journalEntry/_lib/qboJournalEntrySettleServer";

// Server only. Everything that happens before a single entry is sent: every entry is checked
// against fresh QuickBooks data, and the ones that pass are written down as pending. An entry that
// fails a check is blocked with its reasons and never sent.

/** Checks the request as a whole. Throws, because nothing in a malformed request can be trusted. */
export function validateRequest(entries: JournalEntryInput[]): void {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw validationError("Choose at least one journal entry to post.");
  }
  if (entries.length > qboConst.journalEntryMaxPerRequest) {
    throw validationError(
      `At most ${qboConst.journalEntryMaxPerRequest} entries can be posted in one go. Post the rest afterwards.`,
    );
  }
  if (entries.some((entry) => typeof entry !== "object" || entry === null)) {
    throw validationError("The request contains an entry that is not valid.");
  }
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!isSafeDocNumber(entry.docNumber)) continue;
    if (seen.has(entry.docNumber)) {
      throw validationError(`The DocNumber ${entry.docNumber} appears more than once in this request.`);
    }
    seen.add(entry.docNumber);
  }
}

function labelOf(entry: JournalEntryInput): string {
  return typeof entry.docNumber === "string" && entry.docNumber ? entry.docNumber : "(no DocNumber)";
}

function describeLocked(existing: JournalEntryPosting): string {
  return `This DocNumber is already ${existing.status}. A ${existing.status} entry cannot be sent again.`;
}

export type PreparedEntries = {
  ready: JournalEntryPostingContent[];
  blockedEntries: JournalEntryBlocked[];
};

export async function prepareEntries(entries: JournalEntryInput[]): Promise<PreparedEntries> {
  const blockedEntries: JournalEntryBlocked[] = [];
  const wellFormed: JournalEntryInput[] = [];
  for (const entry of entries) {
    const problems = validateJournalEntryInput({
      entry,
      docNumberMaxLength: qboConst.journalEntryDocNumberMaxLength,
    });
    if (problems.length > 0) blockedEntries.push({ docNumber: labelOf(entry), problems });
    else wellFormed.push(entry);
  }
  if (wellFormed.length === 0) return { ready: [], blockedEntries };

  const accounts = await loadQboAccounts();
  const accountMap = new Map(accounts.map((account) => [account.Id, account]));
  const checked: JournalEntryInput[] = [];
  for (const entry of wellFormed) {
    const problems = checkEntryAgainstAccounts({ entry, accountMap });
    if (problems.length > 0) blockedEntries.push({ docNumber: entry.docNumber, problems });
    else checked.push(entry);
  }
  if (checked.length === 0) return { ready: [], blockedEntries };

  const existingPostings = await loadPostingsByDocNumber(checked.map((entry) => entry.docNumber));
  const unlocked: JournalEntryInput[] = [];
  for (const entry of checked) {
    const existing = existingPostings.get(entry.docNumber);
    if (existing && existing.status !== "pending" && existing.status !== "failed") {
      blockedEntries.push({ docNumber: entry.docNumber, problems: [describeLocked(existing)] });
    } else {
      unlocked.push(entry);
    }
  }
  if (unlocked.length === 0) return { ready: [], blockedEntries };

  // QuickBooks only rejects a repeated DocNumber when a company preference is on, so we look
  // ourselves. An entry already there, hand-entered or not, is never adopted or sent again.
  const inQuickBooks = await findJournalEntriesByDocNumber(unlocked.map((entry) => entry.docNumber));
  const takenDocNumbers = new Set(inQuickBooks.map((found) => found.DocNumber));

  const ready: JournalEntryPostingContent[] = [];
  for (const entry of unlocked) {
    if (takenDocNumbers.has(entry.docNumber)) {
      blockedEntries.push({
        docNumber: entry.docNumber,
        problems: [
          "A journal entry with this DocNumber already exists in QuickBooks. Choose another DocNumber, or reconcile this one if you posted it.",
        ],
      });
      continue;
    }
    const content = buildPostingContent({ entry, accountMap });
    const saved = await savePendingPosting({
      content,
      existing: existingPostings.get(entry.docNumber),
    });
    if (saved.saved) ready.push(content);
    else blockedEntries.push({ docNumber: entry.docNumber, problems: [saved.problem] });
  }
  return { ready, blockedEntries };
}
