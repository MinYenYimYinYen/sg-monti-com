import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
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
import { ImportRow, PostPreview } from "@/app/qbo/importCCTxn/types/ImportRowTypes";
import { ImportRowModel } from "@/app/qbo/importCCTxn/models/ImportRowModel";
import {
  ImportCardAssignmentModel,
  ImportFormatAccountModel,
  ImportMerchantMappingModel,
} from "@/app/qbo/importCCTxn/models/ImportCCTxnMappingModels";
import { resolveCardAccountId } from "@/app/qbo/importCCTxn/_lib/importMappingUtils";
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
  const [mappingDoc, cardAssignmentDoc, formatAccountDoc] = await Promise.all([
    ImportMerchantMappingModel.findOne({ merchantKey: row.merchantKey, ownerUserName: null }).lean(),
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
  return {
    row,
    mapping,
    vendor: vendors[0] ? summarizeVendor(vendors[0]) : null,
    expenseAccount: mapping ? (accountMap.get(mapping.defaultAccountId) ?? null) : null,
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
