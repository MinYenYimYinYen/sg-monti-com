import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";
import { JournalEntryLineInput } from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import { DepositField, DepositRow } from "@/app/javelin/JavelinTypes";
import {
  DEPOSIT_FIELD_DESCRIPTIONS,
  DEPOSIT_FIELD_LABELS,
  DEPOSIT_FIELDS,
  effectiveSide,
} from "@/app/javelin/_lib/depositFields";
import { toCents } from "@/app/javelin/_lib/genLedgerRows";
import { computeDepositHash } from "@/app/javelin/_lib/entrySourceHash";
import {
  BuiltEntry,
  buildDocNumber,
  emptyEntry,
  LineTarget,
  resolveName,
} from "@/app/javelin/_lib/entryBuild";

// Pure. The deposit side of entry building: one WorkWave deposit row becomes one journal entry.

export function depositFieldCents(row: DepositRow): Record<DepositField, number> {
  return {
    salesAmount: toCents(row.salesAmount),
    refundAmount: toCents(row.refundAmount),
    chargeBackAmount: toCents(row.chargeBackAmount),
    adjustmentAmount: toCents(row.adjustmentAmount),
    fees: toCents(row.fees),
    netDeposit: toCents(row.netDeposit),
  };
}

export function buildDepositEntries({
  rows,
  fileName,
  mappings,
  accountMap,
}: {
  rows: DepositRow[];
  fileName: string;
  mappings: Map<DepositField, LineTarget>;
  accountMap: Map<string, QboAccount>;
}): BuiltEntry[] {
  // Identical rows on one date are real separate deposits, so they are told apart by occurrence.
  const occurrenceByHash = new Map<string, number>();

  return rows.map((row, rowIndex) => {
    const label = `${row.date} (row ${rowIndex + 1})`;
    const fieldCents = depositFieldCents(row);
    const activeFields = DEPOSIT_FIELDS.filter((field) => fieldCents[field] !== 0);
    if (activeFields.length === 0) return emptyEntry({ label, txnDate: row.date });

    const hash = computeDepositHash({ date: row.date, fieldCents });
    const occurrence = (occurrenceByHash.get(hash) ?? 0) + 1;
    occurrenceByHash.set(hash, occurrence);
    const docNumber = buildDocNumber({ hash, occurrence });

    const problems: string[] = [];
    const lines: JournalEntryLineInput[] = [];
    for (const field of activeFields) {
      const target = mappings.get(field);
      if (!target) {
        problems.push(`${DEPOSIT_FIELD_LABELS[field]}: not linked to a QuickBooks account.`);
        continue;
      }
      const cents = fieldCents[field];
      const description = DEPOSIT_FIELD_DESCRIPTIONS[field];
      lines.push({
        postingType: effectiveSide({ field, cents }) === "debit" ? "Debit" : "Credit",
        accountId: target.qboAccountId,
        amountCents: Math.abs(cents),
        ...(description ? { description } : {}),
        ...resolveName({ target, qboAccount: accountMap.get(target.qboAccountId) ?? null }),
      });
    }
    if (problems.length > 0) {
      return { label, txnDate: row.date, docNumber, input: null, problems, isEmpty: false };
    }

    return {
      label,
      txnDate: row.date,
      docNumber,
      problems: [],
      isEmpty: false,
      input: {
        docNumber,
        txnDate: row.date,
        privateNote: `Javelin deposit ${row.date} (${fileName})`,
        lines,
        source: {
          kind: "deposit",
          sourceHash: hash,
          occurrence,
          fileName,
          sourceFields: fieldCents,
          netDepositCents: fieldCents.netDeposit,
        },
      },
    };
  });
}
