import { describe, expect, it } from "vitest";
import { interpretReconcile } from "@/app/qbo/importCCTxn/_lib/importPostOutcomeUtils";
import { makePurchase } from "@/__tests__/qbo/purchase/purchaseTestHelpers";

describe("interpretReconcile", () => {
  const row = { transactionDate: "2026-10-26", amountCents: 9501 };

  it("returns the row to pending when nothing carries the Ref no., so it is safe to post again", () => {
    expect(interpretReconcile({ row, purchases: [] })).toEqual({
      outcome: "pending",
      purchaseId: null,
      message: "Not found in QuickBooks, so it is safe to post again.",
    });
  });

  it("marks the row posted when one purchase matches in date and amount", () => {
    const purchases = [makePurchase({ Id: "26011", TxnDate: "2026-10-26", TotalAmt: 95.01 })];
    expect(interpretReconcile({ row, purchases })).toEqual({
      outcome: "posted",
      purchaseId: "26011",
      message: "Found in QuickBooks by its Ref no.",
    });
  });

  it("compares amounts in whole cents, so floating point cannot cause a false mismatch", () => {
    // 1.15 * 100 and 0.29 * 100 are not whole numbers in floating point.
    const dollarFifteen = [makePurchase({ Id: "5", TxnDate: "2026-10-26", TotalAmt: 1.15 })];
    const twentyNine = [makePurchase({ Id: "6", TxnDate: "2026-10-26", TotalAmt: 0.29 })];
    const date = "2026-10-26";
    expect(
      interpretReconcile({ row: { transactionDate: date, amountCents: 115 }, purchases: dollarFifteen })
        .outcome,
    ).toBe("posted");
    expect(
      interpretReconcile({ row: { transactionDate: date, amountCents: 29 }, purchases: twentyNine })
        .outcome,
    ).toBe("posted");
  });

  it("stays unknown when more than one purchase carries the Ref no.", () => {
    const purchases = [makePurchase({ Id: "1" }), makePurchase({ Id: "2" })];
    const decision = interpretReconcile({ row, purchases });
    expect(decision.outcome).toBe("unknown");
    expect(decision.message).toContain("2 purchases");
  });

  it("stays unknown when the date differs", () => {
    const purchases = [makePurchase({ TxnDate: "2026-10-27", TotalAmt: 95.01 })];
    expect(interpretReconcile({ row, purchases }).outcome).toBe("unknown");
  });

  it("stays unknown when the amount differs", () => {
    const purchases = [makePurchase({ TxnDate: "2026-10-26", TotalAmt: 95.02 })];
    expect(interpretReconcile({ row, purchases }).outcome).toBe("unknown");
  });

  it("stays unknown when the purchase has no total to compare", () => {
    const purchases = [makePurchase({ TxnDate: "2026-10-26", TotalAmt: undefined })];
    expect(interpretReconcile({ row, purchases }).outcome).toBe("unknown");
  });
});
