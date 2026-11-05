import { describe, expect, it } from "vitest";
import { chaseFormat } from "@/app/qbo/importCCTxn/_lib/formats/chaseFormat";
import { FormatRowResult } from "@/app/qbo/importCCTxn/types/ImportCCTxnTypes";

function chaseCsvRow(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    Card: "3201",
    "Transaction Date": "10/21/2026",
    "Post Date": "10/22/2026",
    Description: "Amazon.com*BL82J1O73",
    Category: "Merchandise & Inventory",
    Type: "Sale",
    Amount: "-53.68",
    Memo: "",
    ...overrides,
  };
}

function errorsOf(result: FormatRowResult): string[] {
  if (result.success) throw new Error("Expected the row to be rejected.");
  return result.errors;
}

describe("chaseFormat.parseRow: charges", () => {
  it("reads a sale as a charge with the positive magnitude in cents", () => {
    expect(chaseFormat.parseRow(chaseCsvRow())).toEqual({
      success: true,
      data: {
        transactionDate: "2026-10-21",
        postedDate: "2026-10-22",
        last4: "3201",
        description: "Amazon.com*BL82J1O73",
        category: "Merchandise & Inventory",
        amountCents: 5368,
        kind: "charge",
      },
    });
  });

  it("collapses runs of spaces in the description and category", () => {
    const result = chaseFormat.parseRow(
      chaseCsvRow({ Description: "BP#3213900MONTICELLO   BP", Category: "Food  &  Drink" }),
    );
    expect(result).toMatchObject({
      success: true,
      data: { description: "BP#3213900MONTICELLO BP", category: "Food & Drink" },
    });
  });

  it("ignores the Memo column", () => {
    const withMemo = chaseFormat.parseRow(chaseCsvRow({ Memo: "something typed by the bank" }));
    expect(withMemo).toEqual(chaseFormat.parseRow(chaseCsvRow()));
  });

  it("allows an empty category", () => {
    expect(chaseFormat.parseRow(chaseCsvRow({ Category: "" }))).toMatchObject({
      success: true,
      data: { category: "" },
    });
  });
});

describe("chaseFormat.parseRow: classification by Type", () => {
  it("reads a payment as a payment, with a positive amount", () => {
    const result = chaseFormat.parseRow(
      chaseCsvRow({ Type: "Payment", Amount: "562.16", Description: "AUTOMATIC PAYMENT - THANK" }),
    );
    expect(result).toMatchObject({ success: true, data: { kind: "payment", amountCents: 56216 } });
  });

  it("reads a return as a refund, with a positive amount", () => {
    const result = chaseFormat.parseRow(chaseCsvRow({ Type: "Return", Amount: "12.50" }));
    expect(result).toMatchObject({ success: true, data: { kind: "refund", amountCents: 1250 } });
  });

  it("stops the import on a type it does not know, naming the type", () => {
    const errors = errorsOf(chaseFormat.parseRow(chaseCsvRow({ Type: "Fee", Amount: "-3.00" })));
    expect(errors).toEqual(['Unknown Type "Fee" (expected Sale, Payment or Return)']);
  });

  it("is case-sensitive about the type", () => {
    const errors = errorsOf(chaseFormat.parseRow(chaseCsvRow({ Type: "sale" })));
    expect(errors[0]).toContain('Unknown Type "sale"');
  });

  it("rejects a sale with a positive amount, since Chase writes charges as negative", () => {
    const errors = errorsOf(chaseFormat.parseRow(chaseCsvRow({ Amount: "53.68" })));
    expect(errors).toEqual(["Sale has a positive amount (53.68); expected a negative amount"]);
  });
});

describe("chaseFormat.parseRow: bad values", () => {
  it("rejects a card that is not four digits", () => {
    expect(errorsOf(chaseFormat.parseRow(chaseCsvRow({ Card: "32" })))).toEqual([
      'Card "32" is not a 4-digit card number',
    ]);
  });

  it("rejects an impossible transaction date", () => {
    expect(errorsOf(chaseFormat.parseRow(chaseCsvRow({ "Transaction Date": "02/30/2026" })))).toEqual([
      'Transaction Date "02/30/2026" is not a valid MM/DD/YYYY date',
    ]);
  });

  it("rejects a bad post date", () => {
    expect(errorsOf(chaseFormat.parseRow(chaseCsvRow({ "Post Date": "2026-10-22" })))).toEqual([
      'Post Date "2026-10-22" is not a valid MM/DD/YYYY date',
    ]);
  });

  it("rejects an empty description", () => {
    expect(errorsOf(chaseFormat.parseRow(chaseCsvRow({ Description: "   " })))).toEqual([
      "Description is empty",
    ]);
  });

  it("rejects an amount that is not money", () => {
    expect(errorsOf(chaseFormat.parseRow(chaseCsvRow({ Amount: "abc" })))).toEqual([
      'Amount "abc" is not a valid amount',
    ]);
  });

  it("rejects a zero amount", () => {
    expect(errorsOf(chaseFormat.parseRow(chaseCsvRow({ Amount: "0.00" })))).toEqual(["Amount is zero"]);
  });

  it("reports every problem in the row at once", () => {
    const errors = errorsOf(
      chaseFormat.parseRow(chaseCsvRow({ Card: "x", "Transaction Date": "nope", Type: "Fee" })),
    );
    expect(errors).toHaveLength(3);
  });

  it("treats a missing column as empty rather than crashing", () => {
    const errors = errorsOf(chaseFormat.parseRow({}));
    expect(errors.length).toBeGreaterThan(0);
  });
});
