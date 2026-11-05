import {
  ImportCsvRow,
  ImportRowKind,
  RowIdentity,
} from "@/app/qbo/importCCTxn/types/ImportCCTxnTypes";
import {
  CardAssignment,
  SkipRule,
} from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";
import {
  ImportPreview,
  ImportRowSkipReason,
  ImportRowStatus,
} from "@/app/qbo/importCCTxn/types/ImportRowTypes";
import { importFormats } from "@/app/qbo/importCCTxn/_lib/importFormatRegistry";
import { computeRowHash } from "@/app/qbo/importCCTxn/_lib/importRowHash";
import { checkDuplicates } from "@/app/qbo/importCCTxn/_lib/importDuplicates";
import { buildMerchantKey } from "@/app/qbo/importCCTxn/_lib/importMerchantKey";
import { cardAssignmentKey } from "@/app/qbo/importCCTxn/_lib/importMappingUtils";

// Pure planning for an import. The browser sends parsed rows, but the server trusts nothing it
// can recompute: hashes, merchant keys and classification-driven skips are all derived here.

export type PlannedImportRow = ImportCsvRow & {
  rowHash: string;
  occurrence: number;
  merchantKey: string;
  isDuplicate: boolean;
  possibleDuplicateOfHash: string | null;
  status: ImportRowStatus;
  skipReason: ImportRowSkipReason | null;
};

export type ImportPlan = {
  plannedRows: PlannedImportRow[];
  unassignedLast4s: string[];
};

const KINDS: ImportRowKind[] = ["charge", "payment", "refund"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Shape check for rows that arrive from the browser. Returns every problem found. */
export function validateParsedRows(rows: ImportCsvRow[]): string[] {
  const problems: string[] = [];
  if (rows.length === 0) return ["The import has no rows."];

  const formatId = rows[0].formatId;
  if (!importFormats.some((format) => format.id === formatId)) {
    return [`Unknown format "${formatId}".`];
  }

  rows.forEach((row) => {
    const where = `Row ${row.rowNumber}`;
    if (row.formatId !== formatId) problems.push(`${where}: mixed formats in one import.`);
    if (!/^\d{4}$/.test(row.last4)) problems.push(`${where}: invalid card number.`);
    if (!ISO_DATE.test(row.transactionDate) || !ISO_DATE.test(row.postedDate)) {
      problems.push(`${where}: invalid date.`);
    }
    if (!row.description.trim()) problems.push(`${where}: empty description.`);
    if (!Number.isInteger(row.amountCents) || row.amountCents <= 0) {
      problems.push(`${where}: amount must be a positive whole number of cents.`);
    }
    if (!KINDS.includes(row.kind)) problems.push(`${where}: unknown row kind "${row.kind}".`);
  });
  return problems;
}

function automaticSkipReason({
  row,
  merchantKey,
  skipRuleMap,
}: {
  row: ImportCsvRow;
  merchantKey: string;
  skipRuleMap: Map<string, SkipRule>;
}): ImportRowSkipReason | null {
  if (row.kind === "payment") return "payment";
  if (row.kind === "refund") return "refund";
  return skipRuleMap.get(merchantKey)?.reason ?? null;
}

export function buildImportPlan({
  rows,
  existingRows,
  cardAssignments,
  skipRules,
}: {
  rows: ImportCsvRow[];
  existingRows: RowIdentity[];
  cardAssignments: CardAssignment[];
  skipRules: SkipRule[];
}): ImportPlan {
  const hashes = rows.map((row) => computeRowHash(row));
  const duplicateChecks = checkDuplicates({
    rows: rows.map((row, index) => ({
      rowHash: hashes[index],
      last4: row.last4,
      transactionDate: row.transactionDate,
      amountCents: row.amountCents,
    })),
    existingRows,
  });

  const skipRuleMap = new Map(skipRules.map((skipRule) => [skipRule.merchantKey, skipRule]));

  const plannedRows = rows.map((row, index): PlannedImportRow => {
    const merchantKey = buildMerchantKey(row.description);
    const skipReason = automaticSkipReason({ row, merchantKey, skipRuleMap });
    const check = duplicateChecks[index];
    return {
      ...row,
      rowHash: check.rowHash,
      occurrence: check.occurrence,
      merchantKey,
      isDuplicate: check.isDuplicate,
      possibleDuplicateOfHash: check.possibleDuplicateOfHash,
      status: skipReason ? "skipped" : "pending",
      skipReason,
    };
  });

  const assignedKeys = new Set(cardAssignments.map((assignment) => cardAssignmentKey(assignment)));
  const unassigned = new Set<string>();
  for (const row of rows) {
    if (!assignedKeys.has(cardAssignmentKey(row))) unassigned.add(row.last4);
  }

  return { plannedRows, unassignedLast4s: [...unassigned].sort() };
}

export function summarizePlan(plan: ImportPlan): ImportPreview {
  const newRows = plan.plannedRows.filter((row) => !row.isDuplicate);
  const skippedCounts: Partial<Record<ImportRowSkipReason, number>> = {};
  for (const row of newRows) {
    if (row.skipReason) skippedCounts[row.skipReason] = (skippedCounts[row.skipReason] ?? 0) + 1;
  }

  return {
    formatId: plan.plannedRows[0].formatId,
    newCount: newRows.length,
    duplicateCount: plan.plannedRows.length - newRows.length,
    skippedCounts,
    possibleDuplicates: newRows
      .filter((row) => row.possibleDuplicateOfHash !== null)
      .map((row) => ({
        rowNumber: row.rowNumber,
        transactionDate: row.transactionDate,
        description: row.description,
        amountCents: row.amountCents,
      })),
    unassignedLast4s: plan.unassignedLast4s,
  };
}
