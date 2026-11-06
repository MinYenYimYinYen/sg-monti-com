import { QboBatchWriteItem } from "@/app/qbo/_lib/types/QboCommonTypes";
import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";
import {
  JournalEntryInput,
  JournalEntryPostingContent,
  QboJournalEntryCreate,
} from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import { centsToDollars, sumSides } from "@/app/qbo/journalEntry/_lib/qboJournalEntryUtils";

// Pure helpers that check an entry against QuickBooks accounts and build what is stored and sent.

/**
 * Checks each line against the accounts loaded from QuickBooks: the account must exist and be
 * active, an Accounts Receivable line needs a Customer, and an Accounts Payable line needs a
 * Vendor. Whether the customer or vendor exists is left to QuickBooks, which is the final authority.
 */
export function checkEntryAgainstAccounts({
  entry,
  accountMap,
}: {
  entry: JournalEntryInput;
  accountMap: Map<string, QboAccount>;
}): string[] {
  const problems: string[] = [];
  entry.lines.forEach((line, index) => {
    const label = `Line ${index + 1}`;
    const account = accountMap.get(line.accountId);
    if (!account) {
      problems.push(`${label}: the account was not found in QuickBooks.`);
      return;
    }
    if (!account.Active) {
      problems.push(`${label}: "${account.Name}" is inactive in QuickBooks.`);
    }
    if (account.AccountType === "Accounts Receivable" && line.entityType !== "Customer") {
      problems.push(`${label}: "${account.Name}" is Accounts Receivable and needs a Customer.`);
    }
    if (account.AccountType === "Accounts Payable" && line.entityType !== "Vendor") {
      problems.push(`${label}: "${account.Name}" is Accounts Payable and needs a Vendor.`);
    }
  });
  return problems;
}

/** The stored shape of a valid entry. Run both checks first. */
export function buildPostingContent({
  entry,
  accountMap,
}: {
  entry: JournalEntryInput;
  accountMap: Map<string, QboAccount>;
}): JournalEntryPostingContent {
  return {
    docNumber: entry.docNumber,
    txnDate: entry.txnDate,
    ...(entry.privateNote ? { privateNote: entry.privateNote } : {}),
    lines: entry.lines.map((line) => ({
      postingType: line.postingType,
      accountId: line.accountId,
      accountName: accountMap.get(line.accountId)?.FullyQualifiedName ?? line.accountId,
      amountCents: line.amountCents,
      ...(line.description ? { description: line.description } : {}),
      ...(line.entityType && line.entityId
        ? { entityType: line.entityType, entityId: line.entityId }
        : {}),
    })),
    totalCents: sumSides(entry.lines).debitCents,
  };
}

/** What we send to QuickBooks. Built from the stored content, so a retry resends the same entry. */
export function buildJournalEntryPayload(
  content: JournalEntryPostingContent,
): QboJournalEntryCreate {
  return {
    DocNumber: content.docNumber,
    TxnDate: content.txnDate,
    ...(content.privateNote ? { PrivateNote: content.privateNote } : {}),
    Line: content.lines.map((line) => ({
      DetailType: "JournalEntryLineDetail" as const,
      Amount: centsToDollars(line.amountCents),
      ...(line.description ? { Description: line.description } : {}),
      JournalEntryLineDetail: {
        PostingType: line.postingType,
        AccountRef: { value: line.accountId },
        ...(line.entityType && line.entityId
          ? { Entity: { Type: line.entityType, EntityRef: { value: line.entityId } } }
          : {}),
      },
    })),
  };
}

/** The batch item for each entry. The bId is the DocNumber, which is unique per entry. */
export function buildJournalEntryBatchItems(
  contents: JournalEntryPostingContent[],
): QboBatchWriteItem<{ JournalEntry: QboJournalEntryCreate }>[] {
  return contents.map((content) => ({
    bId: content.docNumber,
    operation: "create" as const,
    JournalEntry: buildJournalEntryPayload(content),
  }));
}

export function chunkJournalEntries<T>({ items, size }: { items: T[]; size: number }): T[][] {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error("The chunk size must be a whole number of at least 1.");
  }
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }
  return chunks;
}

/**
 * Intuit query text to find entries by Ref no. Only DocNumbers that passed validation (letters,
 * digits, dot, dash, underscore) may be passed, never raw input.
 * UNVERIFIED: the IN operator on DocNumber has not been tried against live QuickBooks.
 */
export function buildJournalEntryDocNumberWhere(docNumbers: string[]): string {
  return `DocNumber IN (${docNumbers.map((docNumber) => `'${docNumber}'`).join(", ")})`;
}
