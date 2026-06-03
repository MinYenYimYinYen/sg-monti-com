import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { deepEqual } from "@/lib/primatives/typeUtils/deepEqual";
import { DepositField, DepositRow } from "@/app/javelin/JavelinTypes";

// Natural side for each field when value is positive.
// "credit" means the value goes in the Credits column; "debit" means Debits.
const FIELD_NATURAL_SIDE: Record<DepositField, "debit" | "credit"> = {
  salesAmount: "credit",
  refundAmount: "debit",
  chargeBackAmount: "debit",
  adjustmentAmount: "debit",
  fees: "debit",
  netDeposit: "debit",
};

export const DEPOSIT_FIELDS: DepositField[] = [
  "salesAmount",
  "refundAmount",
  "chargeBackAmount",
  "adjustmentAmount",
  "fees",
  "netDeposit",
];

const selectDepositState = (state: AppState) => state.deposit;

const selectRows = createSelector(
  [selectDepositState],
  (deposit) => deposit.rows,
);

const selectFileName = createSelector(
  [selectDepositState],
  (deposit) => deposit.fileName,
);

const selectWarnings = createSelector(
  [selectDepositState],
  (deposit) => deposit.warnings,
);

const selectErrors = createSelector(
  [selectDepositState],
  (deposit) => deposit.errors,
);

const selectJournalNoPrefix = createSelector(
  [selectDepositState],
  (deposit) => deposit.journalNoPrefix,
);

const selectSavedAccountMap = createSelector(
  [selectDepositState],
  (deposit) => deposit.savedAccountMap,
);

const selectLiveAccountMap = createSelector(
  [selectDepositState],
  (deposit) => deposit.liveAccountMap,
);

const selectHasUnsavedMappingChanges = createSelector(
  [selectSavedAccountMap, selectLiveAccountMap],
  (saved, live) => !deepEqual(saved, live, []),
);

const selectUnmappedFields = createSelector(
  [selectRows, selectLiveAccountMap],
  (rows, liveAccountMap) => {
    // Only fields that appear (non-zero) in at least one row require a QB account mapping.
    // Fields that are zero across all rows are excluded from the output and don't need mapping.
    const activeFields = DEPOSIT_FIELDS.filter((field) =>
      rows.some((row) => row[field] !== 0),
    );
    return activeFields.filter((field) => !liveAccountMap[field]?.qbName);
  },
);

const selectAllAccountsMapped = createSelector(
  [selectUnmappedFields],
  (unmapped) => unmapped.length === 0,
);

type DepositRowBalance = {
  rowIndex: number;
  date: string;
  totalDebits: number;
  totalCredits: number;
  delta: number;
  isBalanced: boolean;
};

function computeRowBalance(row: DepositRow, rowIndex: number): DepositRowBalance {
  let totalDebits = 0;
  let totalCredits = 0;

  for (const field of DEPOSIT_FIELDS) {
    const value = row[field];
    if (value === 0) continue;

    const naturalSide = FIELD_NATURAL_SIDE[field];
    const isPositive = value > 0;
    const absValue = Math.abs(value);

    // If positive: use natural side. If negative: flip side.
    const effectiveSide =
      isPositive
        ? naturalSide
        : naturalSide === "debit" ? "credit" : "debit";

    if (effectiveSide === "debit") {
      totalDebits += absValue;
    } else {
      totalCredits += absValue;
    }
  }

  const delta = totalDebits - totalCredits;
  return {
    rowIndex,
    date: row.date,
    totalDebits,
    totalCredits,
    delta,
    isBalanced: Math.abs(delta) < 0.001,
  };
}

const selectRowBalances = createSelector(
  [selectRows],
  (rows) => rows.map((row, index) => computeRowBalance(row, index)),
);

const selectOutOfBalanceRows = createSelector(
  [selectRowBalances],
  (balances) => balances.filter((b) => !b.isBalanced),
);

const selectAllRowsBalanced = createSelector(
  [selectOutOfBalanceRows],
  (outOfBalance) => outOfBalance.length === 0,
);

export const depositSelect = {
  rows: selectRows,
  fileName: selectFileName,
  warnings: selectWarnings,
  errors: selectErrors,
  journalNoPrefix: selectJournalNoPrefix,
  savedAccountMap: selectSavedAccountMap,
  liveAccountMap: selectLiveAccountMap,
  hasUnsavedMappingChanges: selectHasUnsavedMappingChanges,
  unmappedFields: selectUnmappedFields,
  allAccountsMapped: selectAllAccountsMapped,
  rowBalances: selectRowBalances,
  outOfBalanceRows: selectOutOfBalanceRows,
  allRowsBalanced: selectAllRowsBalanced,
};
