import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import {
  pickCreditCardAccounts,
  pickExpenseAccounts,
} from "@/app/qbo/account/_lib/qboAccountUtils";

const selectAccounts = (state: AppState) => state.qboAccount.accounts;

const selectAccountMap = createSelector([selectAccounts], (accounts) =>
  new Grouper(accounts).toUniqueMap((a) => a.Id),
);

const selectCreditCardAccounts = createSelector([selectAccounts], pickCreditCardAccounts);

const selectExpenseAccounts = createSelector([selectAccounts], pickExpenseAccounts);

export const qboAccountSelect = {
  accounts: selectAccounts,
  accountMap: selectAccountMap,
  creditCardAccounts: selectCreditCardAccounts,
  expenseAccounts: selectExpenseAccounts,
};
