import { PostJournalEntriesResult } from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import { postQboJournalEntries } from "@/app/qbo/journalEntry/_lib/qboJournalEntryServer";
import { validationError } from "@/app/qbo/journalEntry/_lib/qboJournalEntrySettleServer";
import { DepositRow, GenLedgerFileInput, JavelinKind, JavelinPlanEntry } from "@/app/javelin/JavelinTypes";
import { BuiltEntry, buildGenLedgerEntries } from "@/app/javelin/_lib/entryBuild";
import { buildDepositEntries } from "@/app/javelin/_lib/depositEntryBuild";
import { pickPostable, planEntries } from "@/app/javelin/_lib/entryPlanUtils";
import {
  validateConfirmedDocNumbers,
  validateDepositRows,
  validateGenLedgerFiles,
} from "@/app/javelin/_lib/javelinInputUtils";
import {
  loadAccountMap,
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
