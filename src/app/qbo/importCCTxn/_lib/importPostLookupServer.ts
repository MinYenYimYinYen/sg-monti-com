import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { AppError } from "@/lib/errors/AppError";
import { qboApi } from "@/app/qbo/_lib/api/qboApi";
import { qboQueryAll } from "@/app/qbo/_lib/api/qboQuery";
import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";
import { QboVendor } from "@/app/qbo/vendor/types/QboVendorTypes";
import { summarizeVendor } from "@/app/qbo/vendor/_lib/qboVendorUtils";
import { QboPreferences } from "@/app/qbo/preferences/types/QboPreferencesTypes";
import {
  CardAssignment,
  FormatAccount,
  MerchantMapping,
} from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";
import { BatchPreview, ImportRow, PostPreview } from "@/app/qbo/importCCTxn/types/ImportRowTypes";
import { ImportRowModel } from "@/app/qbo/importCCTxn/models/ImportRowModel";
import {
  ImportCardAssignmentModel,
  ImportFormatAccountModel,
  ImportMerchantMappingModel,
} from "@/app/qbo/importCCTxn/models/ImportCCTxnMappingModels";
import {
  cardAssignmentKey,
  resolveCardAccountId,
} from "@/app/qbo/importCCTxn/_lib/importMappingUtils";
import {
  pickRowsInRange,
  summarizeBatchPreview,
  validateBatchRange,
} from "@/app/qbo/importCCTxn/_lib/importBatchPlanUtils";
import { buildCandidates, PostContext } from "@/app/qbo/importCCTxn/_lib/importPostContextUtils";
import { resolveRowAccountId } from "@/app/qbo/importCCTxn/_lib/importAccountUtils";
import { buildMerchantKey } from "@/app/qbo/importCCTxn/_lib/importMerchantKey";
import {
  buildDocNumberMarker,
  checkRowReadyToPost,
  PostCheckInput,
} from "@/app/qbo/importCCTxn/_lib/importPostUtils";

// Server only. Reads only: this file never writes to QuickBooks. The posting code is in
// importPostServer.ts, so every write path is in one small place.

export function validationError(message: string): AppError {
  return new AppError({ message, type: "VALIDATION_ERROR", statusCode: 400 });
}

export async function loadRow(rowId: string): Promise<ImportRow> {
  await connectToMongoDB();
  const doc = await ImportRowModel.findOne({ rowId }).lean();
  if (!doc) throw validationError("That row no longer exists.");
  return cleanMongoObject(doc) as ImportRow;
}

/**
 * Looks up exactly what this row needs from QuickBooks right now. A fresh read, not the
 * browser's session copy, so a vendor or account that went inactive since loading is caught.
 */
export async function buildCheckInput(row: ImportRow): Promise<PostCheckInput> {
  // The key comes from the description by the current rules, not from the stored key, which
  // could be out of date if the rules changed since the row was imported.
  const merchantKey = buildMerchantKey(row.description);
  const [mappingDoc, cardAssignmentDoc, formatAccountDoc] = await Promise.all([
    ImportMerchantMappingModel.findOne({ merchantKey, ownerUserName: null }).lean(),
    ImportCardAssignmentModel.findOne({ formatId: row.formatId, last4: row.last4 }).lean(),
    ImportFormatAccountModel.findOne({ formatId: row.formatId }).lean(),
  ]);
  const mapping = mappingDoc ? (cleanMongoObject(mappingDoc) as MerchantMapping) : null;
  const cardAssignment = cardAssignmentDoc
    ? (cleanMongoObject(cardAssignmentDoc) as CardAssignment)
    : undefined;
  const formatAccount = formatAccountDoc
    ? (cleanMongoObject(formatAccountDoc) as FormatAccount)
    : undefined;
  const cardAccountId = resolveCardAccountId({ cardAssignment, formatAccount });

  const [vendors, accounts, preferencesResponse] = await Promise.all([
    mapping
      ? qboQueryAll<QboVendor>({ entity: "Vendor", where: `Id = '${mapping.vendorId}'` })
      : Promise.resolve([] as QboVendor[]),
    qboQueryAll<QboAccount>({ entity: "Account", where: "Active IN (true, false)" }),
    qboApi<{ Preferences: QboPreferences }>({
      path: "/preferences",
      method: "GET",
      pathTemplate: "/preferences",
    }),
  ]);

  const accountMap = new Map(accounts.map((account) => [account.Id, account]));
  // The row's own account wins over the merchant's default.
  const expenseAccountId = resolveRowAccountId({ rowAccountId: row.accountId, mapping });
  return {
    row,
    mapping,
    vendor: vendors[0] ? summarizeVendor(vendors[0]) : null,
    expenseAccount: expenseAccountId ? (accountMap.get(expenseAccountId) ?? null) : null,
    cardAccount: cardAccountId ? (accountMap.get(cardAccountId) ?? null) : null,
    bookCloseDate: preferencesResponse.Preferences.AccountingInfoPrefs?.BookCloseDate ?? null,
  };
}

export async function previewPost({ rowId }: { rowId: string }): Promise<PostPreview> {
  const row = await loadRow(rowId);
  const input = await buildCheckInput(row);
  const check = checkRowReadyToPost(input);
  if (check.problems.length > 0 || !input.vendor || !input.expenseAccount || !input.cardAccount) {
    return { rowId, problems: check.problems, warnings: check.warnings, summary: null };
  }

  return {
    rowId,
    problems: [],
    warnings: check.warnings,
    summary: {
      vendorName: input.vendor.DisplayName,
      expenseAccountName: input.expenseAccount.FullyQualifiedName,
      cardAccountName: input.cardAccount.FullyQualifiedName,
      transactionDate: row.transactionDate,
      amountCents: row.amountCents,
      docNumber: buildDocNumberMarker({ rowHash: row.rowHash, occurrence: row.occurrence }),
    },
  };
}

/** Every row with the given ids, in no particular order. */
export async function loadRowsById(rowIds: string[]): Promise<ImportRow[]> {
  await connectToMongoDB();
  const docs = await ImportRowModel.find({ rowId: { $in: rowIds } }).lean();
  return cleanMongoArray(docs) as ImportRow[];
}

/**
 * Everything a posting run reads, loaded once: the mappings, card assignments and format
 * accounts from our database, and every vendor, every account and the preferences from
 * QuickBooks. A fresh read, not the browser's session copy. Checking each row against it
 * afterwards needs no more calls, so a month of rows costs the same reads as one row.
 */
export async function loadPostContext(): Promise<PostContext> {
  await connectToMongoDB();
  const [mappingDocs, cardAssignmentDocs, formatAccountDocs] = await Promise.all([
    ImportMerchantMappingModel.find({ ownerUserName: null }).lean(),
    ImportCardAssignmentModel.find({}).lean(),
    ImportFormatAccountModel.find({}).lean(),
  ]);
  const [vendors, accounts, preferencesResponse] = await Promise.all([
    qboQueryAll<QboVendor>({ entity: "Vendor", where: "Active IN (true, false)" }),
    qboQueryAll<QboAccount>({ entity: "Account", where: "Active IN (true, false)" }),
    qboApi<{ Preferences: QboPreferences }>({
      path: "/preferences",
      method: "GET",
      pathTemplate: "/preferences",
    }),
  ]);

  const mappings = cleanMongoArray(mappingDocs) as MerchantMapping[];
  const cardAssignments = cleanMongoArray(cardAssignmentDocs) as CardAssignment[];
  const formatAccounts = cleanMongoArray(formatAccountDocs) as FormatAccount[];
  return {
    mappingMap: new Map(mappings.map((mapping) => [mapping.merchantKey, mapping])),
    cardAssignmentMap: new Map(
      cardAssignments.map((cardAssignment) => [cardAssignmentKey(cardAssignment), cardAssignment]),
    ),
    formatAccountMap: new Map(formatAccounts.map((formatAccount) => [formatAccount.formatId, formatAccount])),
    vendorMap: new Map(vendors.map((vendor) => [vendor.Id, summarizeVendor(vendor)])),
    accountMap: new Map(accounts.map((account) => [account.Id, account])),
    bookCloseDate: preferencesResponse.Preferences.AccountingInfoPrefs?.BookCloseDate ?? null,
  };
}

/**
 * What posting a date range would send, without writing anything. Looks only at charges that can
 * still be posted. The rows listed as ready are exactly the ones the confirmation posts. QuickBooks
 * is not read at all when the range holds no rows.
 */
export async function previewBatch({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}): Promise<BatchPreview> {
  const problem = validateBatchRange({ startDate, endDate });
  if (problem) throw validationError(problem);

  await connectToMongoDB();
  const docs = await ImportRowModel.find({
    status: { $in: ["pending", "failed"] },
    kind: "charge",
    transactionDate: { $gte: startDate, $lte: endDate },
  }).lean();
  const rows = pickRowsInRange({ rows: cleanMongoArray(docs) as ImportRow[], startDate, endDate });
  const unsettledRowCount = await ImportRowModel.countDocuments({
    status: { $in: ["unknown", "posting"] },
  });

  if (rows.length === 0) {
    return summarizeBatchPreview({ candidates: [], startDate, endDate, unsettledRowCount });
  }
  const context = await loadPostContext();
  return summarizeBatchPreview({
    candidates: buildCandidates({ rows, context }),
    startDate,
    endDate,
    unsettledRowCount,
  });
}