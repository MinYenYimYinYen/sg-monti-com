import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";

// Pure helpers over the loaded accounts. Both include inactive accounts, so a mapping that
// points at one can be flagged; callers that offer a choice should filter on `Active`.

export function pickCreditCardAccounts(accounts: QboAccount[]): QboAccount[] {
  return accounts.filter((account) => account.AccountType === "Credit Card");
}

/**
 * Classification covers Expense, Other Expense and Cost of Goods Sold. Checked against the real
 * chart of accounts (285 accounts). Classification is absent on non-posting accounts, so those
 * are dropped.
 */
export function pickExpenseAccounts(accounts: QboAccount[]): QboAccount[] {
  return accounts.filter((account) => account.Classification === "Expense");
}
