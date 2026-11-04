import { describe, expect, it } from "vitest";
import { summarizePurchase } from "@/app/qbo/purchase/_lib/qboPurchaseUtils";
import { QboPurchase } from "@/app/qbo/purchase/types/QboPurchaseTypes";
import { makePurchase } from "@/__tests__/qbo/purchase/purchaseTestHelpers";

describe("summarizePurchase", () => {
  it("keeps the fields the browser needs", () => {
    const summary = summarizePurchase(
      makePurchase({
        DocNumber: "SG-1",
        PrivateNote: "Lunch",
        EntityRef: { type: "Vendor", name: "Panera", value: "7" },
        Credit: false,
      }),
    );
    expect(summary).toMatchObject({
      Id: "247",
      SyncToken: "0",
      PaymentType: "CreditCard",
      TxnDate: "2026-10-15",
      DocNumber: "SG-1",
      PrivateNote: "Lunch",
      Credit: false,
      TotalAmt: 10,
      AccountRef: { name: "Visa", value: "42" },
      EntityRef: { type: "Vendor", name: "Panera", value: "7" },
    });
    expect(summary.Lines).toEqual([
      {
        Amount: 10,
        Description: null,
        AccountRef: { name: "Meals and Entertainment", value: "13" },
      },
    ]);
  });

  it("uses null or false for fields QuickBooks omits", () => {
    const summary = summarizePurchase(makePurchase({ TxnDate: undefined }));
    expect(summary.TxnDate).toBeNull();
    expect(summary.DocNumber).toBeNull();
    expect(summary.PrivateNote).toBeNull();
    expect(summary.EntityRef).toBeNull();
    expect(summary.Credit).toBe(false);
  });

  it("falls back to the sum of the lines when TotalAmt is missing", () => {
    const summary = summarizePurchase(
      makePurchase({
        TotalAmt: undefined,
        Line: [
          { DetailType: "AccountBasedExpenseLineDetail", Amount: 0.1 },
          { DetailType: "AccountBasedExpenseLineDetail", Amount: 0.2 },
        ],
      }),
    );
    expect(summary.TotalAmt).toBe(0.3);
  });

  it("gives item-based lines a null account", () => {
    const summary = summarizePurchase(
      makePurchase({ Line: [{ DetailType: "ItemBasedExpenseLineDetail", Amount: 125 }] }),
    );
    expect(summary.Lines[0]?.AccountRef).toBeNull();
  });

  it("copes with a purchase that has no lines", () => {
    const noLines = { ...makePurchase(), Line: undefined } as unknown as QboPurchase;
    expect(summarizePurchase(noLines).Lines).toEqual([]);
  });

  it("drops fields that are not part of the summary", () => {
    const response = {
      ...makePurchase(),
      PurchaseEx: { any: [] },
      CustomField: [],
      domain: "QBO",
    } as QboPurchase;
    expect(Object.keys(summarizePurchase(response)).sort()).toEqual(
      [
        "AccountRef",
        "Credit",
        "DocNumber",
        "EntityRef",
        "Id",
        "Lines",
        "PaymentType",
        "PrivateNote",
        "SyncToken",
        "TotalAmt",
        "TxnDate",
      ].sort(),
    );
  });
});
