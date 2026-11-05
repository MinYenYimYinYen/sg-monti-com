import { describe, expect, it } from "vitest";
import { capitalOneFormat } from "@/app/qbo/importCCTxn/_lib/formats/capitalOneFormat";
import { FormatRowResult } from "@/app/qbo/importCCTxn/types/ImportCCTxnTypes";

function capitalOneCsvRow(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    "Transaction Date": "2026-10-27",
    "Posted Date": "2026-10-28",
    "Card No.": "2238",
    Description: "ANTHROPIC",
    Category: "Merchandise",
    Debit: "95.91",
    Credit: "",
    ...overrides,
  };
}

function errorsOf(result: FormatRowResult): string[] {
  if (result.success) throw new Error("Expected the row to be rejected.");
  return result.errors;
}

function capitalOneCsvRowResult(overrides: Record<string, string>): FormatRowResult {
  return capitalOneFormat.parseRow(capitalOneCsvRow(overrides));
}

describe("capitalOneFormat.parseRow: charges", () => {
  it("reads a debit as a charge in cents", () => {
    expect(capitalOneFormat.parseRow(capitalOneCsvRow())).toEqual({
      success: true,
      data: {
        transactionDate: "2026-10-27",
        postedDate: "2026-10-28",
        last4: "2238",
        description: "ANTHROPIC",
        category: "Merchandise",
        amountCents: 9591,
        kind: "charge",
      },
    });
  });

  it("reads the live charge that was posted in staged write 1", () => {
    const result = capitalOneFormat.parseRow(
      capitalOneCsvRow({ "Transaction Date": "2026-10-26", "Posted Date": "2026-10-27", Debit: "95.01" }),
    );
    expect(result).toMatchObject({
      success: true,
      data: { transactionDate: "2026-10-26", postedDate: "2026-10-27", amountCents: 9501 },
    });
  });
});

describe("capitalOneFormat.parseRow: credits", () => {
  it("reads a credit in the Payment/Credit category as a payment", () => {
    const result = capitalOneFormat.parseRow(
      capitalOneCsvRow({ Category: "Payment/Credit", Debit: "", Credit: "500.00" }),
    );
    expect(result).toMatchObject({ success: true, data: { kind: "payment", amountCents: 50000 } });
  });

  it("reads any other credit as a refund", () => {
    const result = capitalOneCsvRowResult({ Category: "Internet", Debit: "", Credit: "585" });
    expect(result).toMatchObject({ success: true, data: { kind: "refund", amountCents: 58500 } });
  });

  it("matches the payment category exactly, including case", () => {
    const result = capitalOneCsvRowResult({ Category: "payment/credit", Debit: "", Credit: "10.00" });
    expect(result).toMatchObject({ success: true, data: { kind: "refund" } });
  });
});

describe("capitalOneFormat.parseRow: debit and credit columns", () => {
  it("rejects a row with both a debit and a credit", () => {
    expect(errorsOf(capitalOneCsvRowResult({ Debit: "5.00", Credit: "5.00" }))).toEqual([
      "Both Debit and Credit have a value; expected exactly one",
    ]);
  });

  it("rejects a row with neither", () => {
    expect(errorsOf(capitalOneCsvRowResult({ Debit: "", Credit: "" }))).toEqual([
      "Neither Debit nor Credit has a value; expected exactly one",
    ]);
  });

  it("treats a whitespace-only value as empty", () => {
    expect(capitalOneCsvRowResult({ Debit: "  ", Credit: "5.00" })).toMatchObject({ success: true });
  });

  it("rejects an amount that is not money", () => {
    expect(errorsOf(capitalOneCsvRowResult({ Debit: "abc" }))).toEqual([
      'Amount "abc" is not a valid amount',
    ]);
  });

  it("rejects a zero amount", () => {
    expect(errorsOf(capitalOneCsvRowResult({ Debit: "0.00" }))).toEqual([
      'Amount "0.00" must be greater than zero',
    ]);
  });

  it("rejects a negative amount, since the direction comes from the column", () => {
    expect(errorsOf(capitalOneCsvRowResult({ Debit: "-5.00" }))).toEqual([
      'Amount "-5.00" must be greater than zero',
    ]);
  });
});

describe("capitalOneFormat.parseRow: bad values", () => {
  it("rejects a card that is not four digits", () => {
    expect(errorsOf(capitalOneCsvRowResult({ "Card No.": "223" }))).toEqual([
      'Card No. "223" is not a 4-digit card number',
    ]);
  });

  it("rejects a bad transaction date and a bad posted date", () => {
    const errors = errorsOf(
      capitalOneCsvRowResult({ "Transaction Date": "2026-13-40", "Posted Date": "soon" }),
    );
    expect(errors).toEqual([
      'Transaction Date "2026-13-40" is not a valid YYYY-MM-DD date',
      'Posted Date "soon" is not a valid YYYY-MM-DD date',
    ]);
  });

  it("rejects the US-style dates Capital One does not write, so a format change is noticed", () => {
    const errors = errorsOf(
      capitalOneCsvRowResult({ "Transaction Date": "10/27/2026", "Posted Date": "10/28/2026" }),
    );
    expect(errors).toEqual([
      'Transaction Date "10/27/2026" is not a valid YYYY-MM-DD date',
      'Posted Date "10/28/2026" is not a valid YYYY-MM-DD date',
    ]);
  });

  it("rejects an impossible calendar date", () => {
    const errors = errorsOf(capitalOneCsvRowResult({ "Transaction Date": "2026-02-30" }));
    expect(errors).toEqual(['Transaction Date "2026-02-30" is not a valid YYYY-MM-DD date']);
  });

  it("rejects an empty description", () => {
    expect(errorsOf(capitalOneCsvRowResult({ Description: "" }))).toEqual(["Description is empty"]);
  });

  it("allows an empty category", () => {
    expect(capitalOneCsvRowResult({ Category: "" })).toMatchObject({ success: true });
  });
});
