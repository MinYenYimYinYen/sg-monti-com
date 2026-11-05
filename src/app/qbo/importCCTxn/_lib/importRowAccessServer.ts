import { headers } from "next/headers";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoObject, cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";
import { AppError } from "@/lib/errors/AppError";
import UserModel from "@/app/auth/_models/UserModel";
import {
  ImportRow,
  ImportRowSkipReason,
  MANUAL_SKIP_REASONS,
} from "@/app/qbo/importCCTxn/types/ImportRowTypes";
import { ImportRowModel } from "@/app/qbo/importCCTxn/models/ImportRowModel";
import { ImportSkipReason } from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";
import { findRowsNeedingNewKey } from "@/app/qbo/importCCTxn/_lib/importMerchantKey";

function validationError(message: string): AppError {
  return new AppError({ message, type: "VALIDATION_ERROR", statusCode: 400 });
}

/** The proxy injects the caller's saId; imported rows record who imported them by userName. */
export async function getImportingUserName(): Promise<string> {
  const headerStore = await headers();
  const saId = headerStore.get("x-user-id");
  await connectToMongoDB();
  const user = saId ? await UserModel.findOne({ saId }).lean() : null;
  if (!user) {
    throw new AppError({ message: "Authentication required", type: "AUTH_ERROR", statusCode: 401 });
  }
  return user.userName;
}

/**
 * Rows that still need a decision or a retry. Posted rows are history and are not loaded.
 *
 * A row stores the merchant key it was imported under. If the key rules have changed since, the
 * stored key is brought up to date here, so the row matches mappings and skip rules made under
 * the current rules. The key is not part of the row's hash or its Ref no., so this changes
 * nothing about duplicate detection or posting.
 */
export async function loadOpenImportRows(): Promise<ImportRow[]> {
  await connectToMongoDB();
  const docs = await ImportRowModel.find({
    status: { $in: ["pending", "failed", "unknown", "posting", "skipped"] },
  })
    .sort({ transactionDate: 1, rowId: 1 })
    .lean();
  const rows = cleanMongoArray(docs) as ImportRow[];

  const changes = findRowsNeedingNewKey(rows);
  if (changes.length > 0) {
    await ImportRowModel.bulkWrite(
      changes.map((change) => ({
        updateOne: {
          filter: { rowId: change.rowId },
          update: { $set: { merchantKey: change.merchantKey } },
        },
      })),
    );
    const newKeys = new Map(changes.map((change) => [change.rowId, change.merchantKey]));
    return rows.map((row) => ({ ...row, merchantKey: newKeys.get(row.rowId) ?? row.merchantKey }));
  }
  return rows;
}

/**
 * Sets or clears a manual skip. Payment and refund skips are permanent, and a row that is
 * posted or in flight can no longer change.
 */
export async function setImportRowSkip({
  rowId,
  skipReason,
}: {
  rowId: string;
  skipReason: ImportRowSkipReason | null;
}): Promise<ImportRow> {
  await connectToMongoDB();
  const row = await ImportRowModel.findOne({ rowId }).lean();
  if (!row) throw validationError("That row no longer exists.");
  if (row.status !== "pending" && row.status !== "skipped") {
    throw validationError(`A ${row.status} row cannot be skipped or restored.`);
  }
  if (row.skipReason === "payment" || row.skipReason === "refund") {
    throw validationError("Payments and refunds are always skipped.");
  }
  if (skipReason !== null && !MANUAL_SKIP_REASONS.includes(skipReason)) {
    throw validationError(`"${skipReason}" cannot be set by hand.`);
  }

  const update =
    skipReason === null
      ? { $set: { status: "pending" }, $unset: { skipReason: 1 } }
      : { $set: { status: "skipped", skipReason } };
  const saved = await ImportRowModel.findOneAndUpdate({ rowId }, update, { new: true }).lean();
  return cleanMongoObject(saved!) as ImportRow;
}

/**
 * Sets or clears the expense account for one row. Only a row that can still be posted may
 * change: pending, or failed (certain not to be in QuickBooks). Whether the account is active
 * and an expense account is checked against live QuickBooks data when the row is posted.
 */
export async function setImportRowAccount({
  rowId,
  accountId,
}: {
  rowId: string;
  accountId: string | null;
}): Promise<ImportRow> {
  if (accountId !== null && accountId.trim().length === 0) {
    throw validationError("Choose an account.");
  }

  await connectToMongoDB();
  const row = await ImportRowModel.findOne({ rowId }).lean();
  if (!row) throw validationError("That row no longer exists.");
  if (row.status !== "pending" && row.status !== "failed") {
    throw validationError(`The account of a ${row.status} row cannot be changed.`);
  }

  const update = accountId === null ? { $unset: { accountId: 1 } } : { $set: { accountId } };
  // The status is in the filter too, so a row claimed for posting a moment ago is not changed.
  const saved = await ImportRowModel.findOneAndUpdate(
    { rowId, status: { $in: ["pending", "failed"] } },
    update,
    { new: true },
  ).lean();
  if (!saved) throw validationError("That row is being posted, so its account cannot change.");
  return cleanMongoObject(saved) as ImportRow;
}

/**
 * After an "always skip this merchant" rule is saved, skips that merchant's rows that are still
 * pending, so the rule also covers what was imported before it existed. The status filter is
 * what keeps this safe: a row that is posting, posted, failed or unknown is never touched, and
 * the claim in importPostServer moves a row out of pending atomically. Returns how many rows
 * changed.
 */
export async function skipPendingRowsForMerchant({
  merchantKey,
  skipReason,
}: {
  merchantKey: string;
  skipReason: ImportSkipReason;
}): Promise<number> {
  await connectToMongoDB();
  const result = await ImportRowModel.updateMany(
    { merchantKey, status: "pending" },
    { $set: { status: "skipped", skipReason } },
  );
  return result.modifiedCount;
}
