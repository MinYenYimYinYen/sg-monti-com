import { PostJournalEntriesResult } from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import { postQboJournalEntries } from "@/app/qbo/journalEntry/_lib/qboJournalEntryServer";
import { validationError } from "@/app/qbo/journalEntry/_lib/qboJournalEntrySettleServer";
import {
  CkDepositRow,
  DepositRow,
  GenLedgerFileInput,
  JavelinKind,
  JavelinPlanEntry,
} from "@/app/javelin/JavelinTypes";
import { BuiltEntry, buildGenLedgerEntries } from "@/app/javelin/_lib/entryBuild";
import { buildDepositEntries } from "@/app/javelin/_lib/depositEntryBuild";
import { buildCkDepositEntries } from "@/app/javelin/_lib/ckDepositBuild";
import { pickPostable, planEntries } from "@/app/javelin/_lib/entryPlanUtils";
import {
  validateCkDepositRows,
  validateConfirmedDocNumbers,
  validateDepositRows,
  validateGenLedgerFiles,
} from "@/app/javelin/_lib/javelinInputUtils";
import {
  loadAccountMap,
  loadCkDepositLinks,
  loadDepositLinks,
  loadGenLedgerLinks,
  loadRelevantPostings,
} from "@/app/javelin/_lib/javelinContextServer";

// Server only. Rebuilds every entry from the CRM source data, so what is posted is derived
// here from stored links, never taken from the browser's lines.

type Planned = { built: BuiltEntry[]; plan: JavelinPlanEntry[] };

function throwIfAny(problems: string[]): void {
  if (problems.length > 0) throw validationError(problems.join(" "));
}

async function classify({
  kind,
  built,
  confirmedDocNumbers,
}: {
  kind: JavelinKind;
  built: BuiltEntry[];
  confirmedDocNumbers: string[];
}): Promise<Planned> {
  const accountMap = await loadAccountMap();
  const stored = await loadRelevantPostings({
    kind,
    docNumbers: built.flatMap((entry) => (entry.docNumber ? [entry.docNumber] : [])),
    dates: [...new Set(built.map((entry) => entry.txnDate))],
  });
  const plan = planEntries({
    built,
    stored,
    accountMap,
    confirmedDocNumbers: new Set(confirmedDocNumbers),
  });
  return { built, plan };
}

export async function planGenLedger({
  files,
  confirmedDocNumbers,
}: {
  files: GenLedgerFileInput[];
  confirmedDocNumbers: string[];
}): Promise<Planned> {
  throwIfAny([...validateGenLedgerFiles(files), ...validateConfirmedDocNumbers(confirmedDocNumbers)]);
  const [mappings, accountMap] = await Promise.all([loadGenLedgerLinks(), loadAccountMap()]);
  const built = buildGenLedgerEntries({ files, mappings, accountMap });
  return classify({ kind: "genLedger", built, confirmedDocNumbers });
}

export async function planDeposits({
  rows,
  fileName,
  confirmedDocNumbers,
}: {
  rows: DepositRow[];
  fileName: string;
  confirmedDocNumbers: string[];
}): Promise<Planned> {
  throwIfAny([...validateDepositRows(rows), ...validateConfirmedDocNumbers(confirmedDocNumbers)]);
  const [mappings, accountMap] = await Promise.all([loadDepositLinks(), loadAccountMap()]);
  const built = buildDepositEntries({ rows, fileName, mappings, accountMap });
  return classify({ kind: "deposit", built, confirmedDocNumbers });
}

export async function planCkDeposits({
  rows,
  confirmedDocNumbers,
}: {
  rows: CkDepositRow[];
  confirmedDocNumbers: string[];
}): Promise<Planned> {
  throwIfAny([
    ...validateCkDepositRows({ rows, todayIso: new Date().toISOString().slice(0, 10) }),
    ...validateConfirmedDocNumbers(confirmedDocNumbers),
  ]);
  const [mappings, accountMap] = await Promise.all([loadCkDepositLinks(), loadAccountMap()]);
  // The builder numbers equal deposits against what is already stored, so it needs those first.
  const stored = await loadRelevantPostings({
    kind: "ckDeposit",
    docNumbers: [],
    dates: [...new Set(rows.map((row) => row.date))],
  });
  const built = buildCkDepositEntries({ rows, stored, mappings, accountMap });
  return classify({ kind: "ckDeposit", built, confirmedDocNumbers });
}

/** Posts the entries the plan calls ready. The posting server checks and locks them again. */
export async function postPlanned({
  planned,
  postedByUserName,
}: {
  planned: Planned;
  postedByUserName: string;
}): Promise<PostJournalEntriesResult> {
  const entries = pickPostable(planned);
  if (entries.length === 0) {
    throw validationError("Nothing is ready to post. Review the entries and try again.");
  }
  return postQboJournalEntries({ entries, postedByUserName });
}
