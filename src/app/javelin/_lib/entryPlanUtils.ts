import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";
import {
  JournalEntryInput,
  JournalEntryPosting,
  JournalEntryPostingLine,
} from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import { qboConst } from "@/app/qbo/_lib/qboConst";
import {
  sumSides,
  validateJournalEntryInput,
} from "@/app/qbo/journalEntry/_lib/qboJournalEntryUtils";
import { checkEntryAgainstAccounts } from "@/app/qbo/journalEntry/_lib/qboJournalEntryPayloadUtils";
import { JavelinPlanEntry } from "@/app/javelin/JavelinTypes";
import { BuiltEntry, buildDocNumber } from "@/app/javelin/_lib/entryBuild";

// Pure. Classifies each built entry against what is already stored, so duplicates are caught
// before anything is sent. The unique docNumber index and the atomic claim in the posting
// server are the backstop; this is what tells the user.

/** What the classifier needs of a stored posting. */
export type StoredPostingRef = Pick<JournalEntryPosting, "docNumber" | "status" | "txnDate" | "source">;

/** Statuses that mean the entry exists, or may exist, in QuickBooks. */
const OCCUPIED_STATUSES: JournalEntryPosting["status"][] = ["posted", "posting", "unknown"];

export function isOccupied(posting: StoredPostingRef): boolean {
  return OCCUPIED_STATUSES.includes(posting.status);
}

function netDepositOf(posting: StoredPostingRef): number | null {
  return posting.source?.kind === "deposit" ? posting.source.netDepositCents : null;
}

function ckAmountOf(posting: StoredPostingRef): number | null {
  return posting.source?.kind === "ckDeposit" ? posting.source.amountCents : null;
}

function describeLines({
  input,
  accountMap,
}: {
  input: JournalEntryInput;
  accountMap: Map<string, QboAccount>;
}): JournalEntryPostingLine[] {
  return input.lines.map((line) => ({
    ...line,
    accountName: accountMap.get(line.accountId)?.FullyQualifiedName ?? line.accountId,
  }));
}

/**
 * Looks for a stored entry of the same kind on the same date with different content. A general
 * ledger day matches on kind and date alone. A credit card deposit also needs the same net
 * deposit, because several different deposits can land on one date, and a check deposit the same
 * total.
 */
export function findLookalike({
  input,
  stored,
}: {
  input: JournalEntryInput;
  stored: StoredPostingRef[];
}): StoredPostingRef | undefined {
  const source = input.source;
  if (!source) return undefined;
  return stored.find((posting) => {
    if (!isOccupied(posting) || posting.docNumber === input.docNumber) return false;
    if (posting.source?.kind !== source.kind || posting.txnDate !== input.txnDate) return false;
    if (source.kind === "deposit") return netDepositOf(posting) === source.netDepositCents;
    if (source.kind === "ckDeposit") return ckAmountOf(posting) === source.amountCents;
    return true;
  });
}

export function planEntries({
  built,
  stored,
  accountMap,
  confirmedDocNumbers,
}: {
  built: BuiltEntry[];
  stored: StoredPostingRef[];
  accountMap: Map<string, QboAccount>;
  /** Possible duplicates the user chose to post anyway. */
  confirmedDocNumbers: Set<string>;
}): JavelinPlanEntry[] {
  const storedByDocNumber = new Map(stored.map((posting) => [posting.docNumber, posting]));
  // Two identical files in one upload share a DocNumber. Only the first may post.
  const seenInThisRun = new Set<string>();

  return built.map((entry): JavelinPlanEntry => {
    const base = { label: entry.label, txnDate: entry.txnDate, docNumber: entry.docNumber };
    if (entry.isEmpty) {
      return { ...base, status: "empty", problems: [], lines: [], totalCents: 0 };
    }
    if (!entry.input) {
      return { ...base, status: "blocked", problems: entry.problems, lines: [], totalCents: 0 };
    }

    const { input } = entry;
    const lines = describeLines({ input, accountMap });
    const totalCents = sumSides(input.lines).debitCents;
    const netDepositCents = input.source?.kind === "deposit" ? input.source.netDepositCents : undefined;
    const filled = { ...base, lines, totalCents, ...(netDepositCents !== undefined ? { netDepositCents } : {}) };

    const exact = storedByDocNumber.get(input.docNumber);
    if (exact && isOccupied(exact)) {
      return { ...filled, status: "duplicate", problems: [], matchedDocNumber: exact.docNumber };
    }
    if (seenInThisRun.has(input.docNumber)) {
      return {
        ...filled,
        status: "duplicate",
        problems: ["The same data appears earlier in this upload."],
        matchedDocNumber: input.docNumber,
      };
    }
    seenInThisRun.add(input.docNumber);

    const shapeProblems = validateJournalEntryInput({
      entry: input,
      docNumberMaxLength: qboConst.journalEntryDocNumberMaxLength,
    });
    // Account checks only make sense on a well-formed entry, and only when accounts have loaded.
    const accountProblems =
      shapeProblems.length === 0 && accountMap.size > 0
        ? checkEntryAgainstAccounts({ entry: input, accountMap })
        : [];
    const problems = [...shapeProblems, ...accountProblems];
    if (problems.length > 0) return { ...filled, status: "blocked", problems };

    const lookalike = findLookalike({ input, stored });
    if (lookalike && !confirmedDocNumbers.has(input.docNumber)) {
      return {
        ...filled,
        status: "possibleDuplicate",
        problems: [],
        matchedDocNumber: lookalike.docNumber,
      };
    }
    // An equal check deposit earlier in this same batch is not stored yet, so the lookalike search
    // cannot see it. Its occurrence number says it is there.
    if (
      input.source?.kind === "ckDeposit" &&
      input.source.occurrence > 1 &&
      !confirmedDocNumbers.has(input.docNumber)
    ) {
      return {
        ...filled,
        status: "possibleDuplicate",
        problems: [],
        matchedDocNumber: buildDocNumber({
          hash: input.source.sourceHash,
          occurrence: input.source.occurrence - 1,
        }),
      };
    }
    return { ...filled, status: "ready", problems: [] };
  });
}

/** The entries a post run sends. A confirmed possible duplicate is classified ready by planEntries. */
export function pickPostable({
  built,
  plan,
}: {
  built: BuiltEntry[];
  plan: JavelinPlanEntry[];
}): JournalEntryInput[] {
  const inputs: JournalEntryInput[] = [];
  built.forEach((entry, index) => {
    if (plan[index].status === "ready" && entry.input) inputs.push(entry.input);
  });
  return inputs;
}

export function sumPlanTotals(plan: JavelinPlanEntry[]): { count: number; totalCents: number } {
  const ready = plan.filter((entry) => entry.status === "ready");
  return {
    count: ready.length,
    totalCents: ready.reduce((total, entry) => total + entry.totalCents, 0),
  };
}
