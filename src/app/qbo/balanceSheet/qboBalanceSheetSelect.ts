import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { QboAccountBalance } from "@/app/qbo/balanceSheet/types/QboBalanceSheetTypes";

const selectAccountBalances = (state: AppState) => state.qboBalanceSheet.accountBalances;

/** Keyed `accountId|asOfDate`. Use `balanceKey` to build the key. */
const selectBalanceMap = createSelector([selectAccountBalances], (balances) =>
  new Map<string, QboAccountBalance>(
    balances.map((balance) => [balanceKey(balance), balance]),
  ),
);

export function balanceKey({
  accountId,
  asOfDate,
}: {
  accountId: string;
  asOfDate: string;
}): string {
  return `${accountId}|${asOfDate}`;
}

export const qboBalanceSheetSelect = {
  accountBalances: selectAccountBalances,
  balanceMap: selectBalanceMap,
};
