import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";
import { JournalEntryLineInput } from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import { CkDepositRow, DepositLinkKey } from "@/app/javelin/JavelinTypes";
import { toCents } from "@/app/javelin/_lib/genLedgerRows";
import { computeCkDepositHash } from "@/app/javelin/_lib/entrySourceHash";
import { CK_DEPOSIT_LINK_LABELS } from "@/app/javelin/_lib/ckDepositFields";
import { isOccupied, StoredPostingRef } from "@/app/javelin/_lib/entryPlanUtils";
import {
  BuiltEntry,
  buildDocNumber,
  LineTarget,
  resolveName,
} from "@/app/javelin/_lib/entryBuild";

// Pure. A checking deposit moves money from the RealGreen check holding account (staged) to the
// checking account (deposited): debit the checking deposit account, credit the holding account.

/**
 * Equal deposits on one date share a hash, so each takes the lowest occurrence number that no
 * stored entry (posted, posting or unknown) and no earlier row of this batch already holds. A
 * failed or pending entry holds nothing, so a retry sends the same Ref no. again. Occurrence
 * above 1 is what makes the plan call the row a possible duplicate.
 */
export function buildCkDepositEntries({
  rows,
  stored,
  mappings,
  accountMap,
}: {
  rows: CkDepositRow[];
  stored: StoredPostingRef[];
  mappings: Map<DepositLinkKey, LineTarget>;
  accountMap: Map<string, QboAccount>;
}): BuiltEntry[] {
  const takenDocNumbers = new Set(
    stored.filter(isOccupied).map((posting) => posting.docNumber),
  );

  return rows.map((row, rowIndex) => {
    const label = `${row.date} (row ${rowIndex + 1})`;
    const amountCents = toCents(row.amount);
    const hash = computeCkDepositHash({ date: row.date, amountCents });
    let occurrence = 1;
    while (takenDocNumbers.has(buildDocNumber({ hash, occurrence }))) occurrence += 1;
    const docNumber = buildDocNumber({ hash, occurrence });
    takenDocNumbers.add(docNumber);

    const depositTarget = mappings.get("ckDepositAccount");
    const holdingTarget = mappings.get("ckHoldingAccount");
    const problems: string[] = [];
    if (!depositTarget) {
      problems.push(`${CK_DEPOSIT_LINK_LABELS.ckDepositAccount}: not linked to a QuickBooks account.`);
    }
    if (!holdingTarget) {
      problems.push(`${CK_DEPOSIT_LINK_LABELS.ckHoldingAccount}: not linked to a QuickBooks account.`);
    }
    if (depositTarget && holdingTarget && depositTarget.qboAccountId === holdingTarget.qboAccountId) {
      problems.push("Both check deposit accounts are linked to the same QuickBooks account.");
    }
    if (!depositTarget || !holdingTarget || problems.length > 0) {
      return { label, txnDate: row.date, docNumber, input: null, problems, isEmpty: false };
    }

    const lines: JournalEntryLineInput[] = [
      {
        postingType: "Debit",
        accountId: depositTarget.qboAccountId,
        amountCents,
        ...resolveName({
          target: depositTarget,
          qboAccount: accountMap.get(depositTarget.qboAccountId) ?? null,
        }),
      },
      {
        postingType: "Credit",
        accountId: holdingTarget.qboAccountId,
        amountCents,
        ...resolveName({
          target: holdingTarget,
          qboAccount: accountMap.get(holdingTarget.qboAccountId) ?? null,
        }),
      },
    ];

    return {
      label,
      txnDate: row.date,
      docNumber,
      problems: [],
      isEmpty: false,
      input: {
        docNumber,
        txnDate: row.date,
        privateNote: `Javelin check deposit ${row.date}`,
        lines,
        source: { kind: "ckDeposit", sourceHash: hash, occurrence, amountCents },
      },
    };
  });
}
