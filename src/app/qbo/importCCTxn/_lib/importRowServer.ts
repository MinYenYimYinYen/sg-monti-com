import { randomUUID } from "crypto";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";
import { AppError } from "@/lib/errors/AppError";
import { ImportCsvRow, RowIdentity } from "@/app/qbo/importCCTxn/types/ImportCCTxnTypes";
import {
  CardAssignment,
  SkipRule,
} from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";
import {
  ImportCommitResult,
  ImportPreview,
  ImportRow,
  ImportRowSkipReason,
} from "@/app/qbo/importCCTxn/types/ImportRowTypes";
import {
  ImportCardAssignmentModel,
  ImportSkipRuleModel,
} from "@/app/qbo/importCCTxn/models/ImportCCTxnMappingModels";
import { ImportRowModel } from "@/app/qbo/importCCTxn/models/ImportRowModel";
import {
  buildImportPlan,
  ImportPlan,
  PlannedImportRow,
  summarizePlan,
  validateParsedRows,
} from "@/app/qbo/importCCTxn/_lib/importRowBuild";

const DUPLICATE_KEY_ERROR_CODE = 11000;

function validationError(message: string): AppError {
  return new AppError({ message, type: "VALIDATION_ERROR", statusCode: 400 });
}

async function planImport(rows: ImportCsvRow[]): Promise<ImportPlan> {
  const problems = validateParsedRows(rows);
  if (problems.length > 0) throw validationError(problems.join(" "));

  await connectToMongoDB();
  const formatId = rows[0].formatId;
  const dates = rows.map((row) => row.transactionDate).sort();

  // Only stored rows in the file's date window can match, so the lookup stays small.
  const existingDocs = await ImportRowModel.find({
    formatId,
    transactionDate: { $gte: dates[0], $lte: dates[dates.length - 1] },
  })
    .select("rowHash last4 transactionDate amountCents")
    .lean();
  const existingRows: RowIdentity[] = existingDocs.map((doc) => ({
    rowHash: doc.rowHash,
    last4: doc.last4,
    transactionDate: doc.transactionDate,
    amountCents: doc.amountCents,
  }));

  const [cardAssignmentDocs, skipRuleDocs] = await Promise.all([
    ImportCardAssignmentModel.find({ formatId }).lean(),
    ImportSkipRuleModel.find({}).lean(),
  ]);

  return buildImportPlan({
    rows,
    existingRows,
    cardAssignments: cleanMongoArray(cardAssignmentDocs) as CardAssignment[],
    skipRules: cleanMongoArray(skipRuleDocs) as SkipRule[],
  });
}

export async function previewImport({ rows }: { rows: ImportCsvRow[] }): Promise<ImportPreview> {
  return summarizePlan(await planImport(rows));
}

function toImportRow({
  row,
  confirmedDuplicates,
  importBatchId,
  fileName,
  importedByUserName,
}: {
  row: PlannedImportRow;
  confirmedDuplicates: Set<number>;
  importBatchId: string;
  fileName: string;
  importedByUserName: string;
}): ImportRow {
  const markedDuplicate =
    row.possibleDuplicateOfHash !== null && confirmedDuplicates.has(row.rowNumber);
  const skipReason: ImportRowSkipReason | undefined =
    row.skipReason ?? (markedDuplicate ? "duplicate" : undefined);
  return {
    rowId: `${row.rowHash}:${row.occurrence}`,
    formatId: row.formatId,
    rowHash: row.rowHash,
    occurrence: row.occurrence,
    last4: row.last4,
    transactionDate: row.transactionDate,
    postedDate: row.postedDate,
    description: row.description,
    category: row.category,
    amountCents: row.amountCents,
    kind: row.kind,
    merchantKey: row.merchantKey,
    status: skipReason ? "skipped" : "pending",
    ...(skipReason ? { skipReason } : {}),
    ...(row.possibleDuplicateOfHash ? { possibleDuplicateOfHash: row.possibleDuplicateOfHash } : {}),
    importBatchId,
    fileName,
    importedByUserName,
  };
}

/**
 * Stores the file's new rows. `duplicateRowNumbers` are possible duplicates the user confirmed;
 * they are kept, as skipped, so the file's rows all remain on record.
 */
export async function commitImport({
  rows,
  fileName,
  duplicateRowNumbers,
  importedByUserName,
}: {
  rows: ImportCsvRow[];
  fileName: string;
  duplicateRowNumbers: number[];
  importedByUserName: string;
}): Promise<ImportCommitResult> {
  const plan = await planImport(rows);
  if (plan.unassignedLast4s.length > 0) {
    throw validationError(
      `Assign a responsible user to card ${plan.unassignedLast4s.join(", ")} before importing.`,
    );
  }

  const confirmedDuplicates = new Set(duplicateRowNumbers);
  const importBatchId = randomUUID();
  const newRows = plan.plannedRows.filter((row) => !row.isDuplicate);
  const docs = newRows.map((row) =>
    toImportRow({ row, confirmedDuplicates, importBatchId, fileName, importedByUserName }),
  );

  if (docs.length > 0) {
    try {
      await ImportRowModel.insertMany(docs, { ordered: false });
    } catch (error) {
      // A concurrent import of the same file can win the unique rowId. Those rows are stored
      // by the other import, so only other failures are real.
      const writeErrors = (error as { writeErrors?: { err?: { code?: number } }[] }).writeErrors;
      const onlyDuplicateKeys =
        Array.isArray(writeErrors) &&
        writeErrors.length > 0 &&
        writeErrors.every((writeError) => writeError.err?.code === DUPLICATE_KEY_ERROR_CODE);
      if (!onlyDuplicateKeys) throw error;
    }
  }

  const stored = await ImportRowModel.find({ importBatchId }).lean();
  return {
    importBatchId,
    insertedRows: cleanMongoArray(stored) as ImportRow[],
    duplicateCount: plan.plannedRows.length - newRows.length,
  };
}
