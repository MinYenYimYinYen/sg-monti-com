import { describe, expect, it } from "vitest";
import { pickCreditCardAccounts, pickExpenseAccounts } from "@/app/qbo/account/_lib/qboAccountUtils";
import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";

function makeAccount(overrides: Partial<QboAccount> = {}): QboAccount {
  return {
    Id: "1",
    Name: "Account",
    SyncToken: "0",
    Active: true,
    AccountType: "Expense",
    AccountSubType: "OtherMiscellaneousServiceCost",
    Classification: "Expense",
    FullyQualifiedName: "Account",
    SubAccount: false,
    ...overrides,
  };
}

describe("pickCreditCardAccounts", () => {
  it("keeps only credit card accounts", () => {
    const visa = makeAccount({ Id: "10", AccountType: "Credit Card", Classification: "Liability" });
    const bank = makeAccount({ Id: "11", AccountType: "Bank", Classification: "Asset" });
    const rent = makeAccount({ Id: "12" });
    expect(pickCreditCardAccounts([visa, bank, rent])).toEqual([visa]);
  });

  it("includes inactive credit cards, so a mapping that points at one can be flagged", () => {
    const closedCard = makeAccount({
      Id: "13",
      AccountType: "Credit Card",
      Classification: "Liability",
      Active: false,
    });
    expect(pickCreditCardAccounts([closedCard])).toEqual([closedCard]);
  });

  it("returns an empty list when there are no accounts", () => {
    expect(pickCreditCardAccounts([])).toEqual([]);
  });
});

describe("pickExpenseAccounts", () => {
  it("keeps accounts classified as Expense, including Cost of Goods Sold and Other Expense", () => {
    const expense = makeAccount({ Id: "20" });
    const costOfGoods = makeAccount({ Id: "21", AccountType: "Cost of Goods Sold" });
    const otherExpense = makeAccount({ Id: "22", AccountType: "Other Expense" });
    const income = makeAccount({ Id: "23", AccountType: "Income", Classification: "Revenue" });
    expect(pickExpenseAccounts([expense, costOfGoods, otherExpense, income])).toEqual([
      expense,
      costOfGoods,
      otherExpense,
    ]);
  });

  it("drops accounts with no classification, which QuickBooks omits for non-posting accounts", () => {
    const nonPosting = makeAccount({ Id: "24", Classification: undefined });
    expect(pickExpenseAccounts([nonPosting])).toEqual([]);
  });

  it("includes inactive expense accounts", () => {
    const closed = makeAccount({ Id: "25", Active: false });
    expect(pickExpenseAccounts([closed])).toEqual([closed]);
  });
});
