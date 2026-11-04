import { describe, expect, it } from "vitest";
import {
  describeExpenseAccounts,
  netPurchaseTotal,
  pickCreditCardPurchases,
  sortPurchasesNewestFirst,
} from "@/app/qbo/purchase/_lib/qboPurchaseUtils";
import { makeSummary } from "@/__tests__/qbo/purchase/purchaseTestHelpers";

describe("sortPurchasesNewestFirst", () => {
  it("puts the latest date first", () => {
    const sorted = sortPurchasesNewestFirst([
      makeSummary({ Id: "1", TxnDate: "2026-10-01" }),
      makeSummary({ Id: "2", TxnDate: "2026-10-20" }),
      makeSummary({ Id: "3", TxnDate: "2026-10-10" }),
    ]);
    expect(sorted.map((purchase) => purchase.Id)).toEqual(["2", "3", "1"]);
  });

  it("breaks a date tie on the numeric Id, so 100 comes before 99", () => {
    const sorted = sortPurchasesNewestFirst([
      makeSummary({ Id: "99", TxnDate: "2026-10-01" }),
      makeSummary({ Id: "100", TxnDate: "2026-10-01" }),
    ]);
    expect(sorted.map((purchase) => purchase.Id)).toEqual(["100", "99"]);
  });

  it("puts purchases with no date last", () => {
    const sorted = sortPurchasesNewestFirst([
      makeSummary({ Id: "1", TxnDate: null }),
      makeSummary({ Id: "2", TxnDate: "2026-10-01" }),
    ]);
    expect(sorted.map((purchase) => purchase.Id)).toEqual(["2", "1"]);
  });

  it("does not change the list it was given", () => {
    const purchases = [
      makeSummary({ Id: "1", TxnDate: "2026-10-01" }),
      makeSummary({ Id: "2", TxnDate: "2026-10-20" }),
    ];
    sortPurchasesNewestFirst(purchases);
    expect(purchases.map((purchase) => purchase.Id)).toEqual(["1", "2"]);
  });
});

describe("pickCreditCardPurchases", () => {
  it("keeps only credit card purchases", () => {
    const card = makeSummary({ Id: "1" });
    const check = makeSummary({ Id: "2", PaymentType: "Check" });
    const cash = makeSummary({ Id: "3", PaymentType: "Cash" });
    expect(pickCreditCardPurchases([card, check, cash])).toEqual([card]);
  });
});

describe("netPurchaseTotal", () => {
  it("adds charges and subtracts refunds", () => {
    const total = netPurchaseTotal([
      makeSummary({ TotalAmt: 100 }),
      makeSummary({ TotalAmt: 25.5 }),
      makeSummary({ TotalAmt: 30, Credit: true }),
    ]);
    expect(total).toBe(95.5);
  });

  it("rounds away floating point noise", () => {
    const total = netPurchaseTotal([
      makeSummary({ TotalAmt: 0.1 }),
      makeSummary({ TotalAmt: 0.2 }),
    ]);
    expect(total).toBe(0.3);
  });

  it("is zero for no purchases", () => {
    expect(netPurchaseTotal([])).toBe(0);
  });
});

describe("describeExpenseAccounts", () => {
  it("names the account when every line uses the same one", () => {
    const account = { name: "Fuel", value: "5" };
    const purchase = makeSummary({
      Lines: [
        { Amount: 1, Description: null, AccountRef: account },
        { Amount: 2, Description: null, AccountRef: account },
      ],
    });
    expect(describeExpenseAccounts(purchase)).toBe("Fuel");
  });

  it("says Split when lines use different accounts", () => {
    const purchase = makeSummary({
      Lines: [
        { Amount: 1, Description: null, AccountRef: { name: "Fuel", value: "5" } },
        { Amount: 2, Description: null, AccountRef: { name: "Meals", value: "6" } },
      ],
    });
    expect(describeExpenseAccounts(purchase)).toBe("Split (2)");
  });

  it("falls back to the account id when there is no name", () => {
    const purchase = makeSummary({
      Lines: [{ Amount: 1, Description: null, AccountRef: { value: "5" } }],
    });
    expect(describeExpenseAccounts(purchase)).toBe("5");
  });

  it("is blank when no line has an account", () => {
    const purchase = makeSummary({ Lines: [{ Amount: 1, Description: null, AccountRef: null }] });
    expect(describeExpenseAccounts(purchase)).toBe("");
  });
});
