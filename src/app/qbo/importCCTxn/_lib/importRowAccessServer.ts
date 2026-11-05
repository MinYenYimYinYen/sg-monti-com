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

/** Rows that still need a decision or a retry. Posted rows are history and are not loaded. */
export async function loadOpenImportRows(): Promise<ImportRow[]> {
  await connectToMongoDB();
  const docs = await ImportRowModel.find({
    status: { $in: ["pending", "failed", "unknown", "posting", "skipped"] },
  })
    .sort({ transactionDate: 1, rowId: 1 })
    .lean();
  return cleanMongoArray(docs) as ImportRow[];
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
