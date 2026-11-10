import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";
import { AccountMappingModel } from "@/app/account/AccountMappingModel";
import { AccountMappingDoc } from "@/app/account/AccountMappingTypes";
import { loadQboAccounts } from "@/app/qbo/account/_lib/qboAccountServer";
import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";
import { JournalEntryPostingModel } from "@/app/qbo/journalEntry/models/JournalEntryPostingModel";
import { JournalEntryPosting } from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import { DepositFieldMappingModel } from "@/app/javelin/depositMapping/DepositFieldMappingModel";
import { DepositFieldMappingDoc } from "@/app/javelin/depositMapping/DepositFieldMappingTypes";
import {
  CkDepositLinkKey,
  DepositField,
  DepositLinkKey,
  JavelinKind,
} from "@/app/javelin/JavelinTypes";
import { DEPOSIT_FIELDS } from "@/app/javelin/_lib/depositFields";
import { CK_DEPOSIT_LINK_KEYS } from "@/app/javelin/_lib/ckDepositFields";
import { LineTarget } from "@/app/javelin/_lib/entryBuild";
import { StoredPostingRef } from "@/app/javelin/_lib/entryPlanUtils";

// Server only. Reads our own database and QuickBooks accounts. It never writes.

export async function loadAccountMap(): Promise<Map<string, QboAccount>> {
  const accounts = await loadQboAccounts();
  return new Map(accounts.map((account) => [account.Id, account]));
}

export async function loadGenLedgerLinks(): Promise<Map<string, LineTarget>> {
  await connectToMongoDB();
  const docs = cleanMongoArray(await AccountMappingModel.find().lean()) as AccountMappingDoc[];
  return new Map(docs.map((doc) => [doc.rgAccountId, doc]));
}

async function loadDepositLinkDocs(): Promise<DepositFieldMappingDoc[]> {
  await connectToMongoDB();
  return cleanMongoArray(await DepositFieldMappingModel.find().lean()) as DepositFieldMappingDoc[];
}

/** The WorkWave export columns only. The check deposit accounts share the collection but not this map. */
export async function loadDepositLinks(): Promise<Map<DepositField, LineTarget>> {
  const docs = await loadDepositLinkDocs();
  const fieldDocs = docs.filter((doc): doc is DepositFieldMappingDoc & { field: DepositField } =>
    DEPOSIT_FIELDS.includes(doc.field as DepositField),
  );
  return new Map(fieldDocs.map((doc) => [doc.field, doc]));
}

export async function loadCkDepositLinks(): Promise<Map<DepositLinkKey, LineTarget>> {
  const docs = await loadDepositLinkDocs();
  return new Map(
    docs
      .filter((doc) => CK_DEPOSIT_LINK_KEYS.includes(doc.field as CkDepositLinkKey))
      .map((doc) => [doc.field, doc]),
  );
}

/**
 * Stored postings that could collide with the entries being planned: the same DocNumbers, or
 * the same kind on the same dates. A small, indexed lookup however many postings exist.
 */
export async function loadRelevantPostings({
  kind,
  docNumbers,
  dates,
}: {
  kind: JavelinKind;
  docNumbers: string[];
  dates: string[];
}): Promise<StoredPostingRef[]> {
  await connectToMongoDB();
  const docs = await JournalEntryPostingModel.find({
    $or: [
      { docNumber: { $in: docNumbers } },
      { "source.kind": kind, txnDate: { $in: dates } },
    ],
  }).lean();
  return cleanMongoArray(docs) as JournalEntryPosting[];
}
