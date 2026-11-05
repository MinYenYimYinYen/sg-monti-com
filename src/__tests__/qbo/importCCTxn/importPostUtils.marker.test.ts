import { describe, expect, it } from "vitest";
import {
  buildDocNumberMarker,
  buildPurchaseCreate,
  centsToAmount,
} from "@/app/qbo/importCCTxn/_lib/importPostUtils";
import {
  makeCardAccount,
  makeExpenseAccount,
  makeRow,
  makeVendorSummary,
  REAL_ROW_HASH,
} from "@/__tests__/qbo/importCCTxn/importTestHelpers";

describe("buildDocNumberMarker", () => {
  it("builds the marker QuickBooks holds for the first live write", () => {
    // Staged write 1 posted this row, and QuickBooks kept the Ref no. exactly as sent.
    expect(buildDocNumberMarker({ rowHash: REAL_ROW_HASH, occurrence: 1 })).toBe("SGdec8e4a35041-1");
  });

  it("is the same every time, so a retry sends the value the first attempt sent", () => {
    const first = buildDocNumberMarker({ rowHash: REAL_ROW_HASH, occurrence: 2 });
    const second = buildDocNumberMarker({ rowHash: REAL_ROW_HASH, occurrence: 2 });
    expect(first).toBe(second);
  });

  it("differs by occurrence, so identical rows in one file never share a marker", () => {
    const first = buildDocNumberMarker({ rowHash: REAL_ROW_HASH, occurrence: 1 });
    const second = buildDocNumberMarker({ rowHash: REAL_ROW_HASH, occurrence: 2 });
    expect(first).not.toBe(second);
  });

  it("differs by row hash", () => {
    const other = "ffffffffffff".padEnd(64, "0");
    expect(buildDocNumberMarker({ rowHash: other, occurrence: 1 })).not.toBe(
      buildDocNumberMarker({ rowHash: REAL_ROW_HASH, occurrence: 1 }),
    );
  });

  it("stays within Intuit's 21 characters up to a six-digit occurrence", () => {
    const marker = buildDocNumberMarker({ rowHash: REAL_ROW_HASH, occurrence: 999999 });
    expect(marker.length).toBe(21);
  });

  it("refuses to build a marker longer than 21 characters", () => {
    expect(() => buildDocNumberMarker({ rowHash: REAL_ROW_HASH, occurrence: 1000000 })).toThrow(
      /longer than 21/,
    );
  });

  it("uses only characters the Ref no. lookup accepts", () => {
    expect(buildDocNumberMarker({ rowHash: REAL_ROW_HASH, occurrence: 1 })).toMatch(
      /^[A-Za-z0-9 _.-]{1,21}$/,
    );
  });
});

describe("centsToAmount", () => {
  it.each([
    [9526, 95.26],
    [9501, 95.01],
    [1, 0.01],
    [10, 0.1],
    [29, 0.29],
    [100, 1],
    [115, 1.15],
    [1005, 10.05],
    [58500, 585],
    [0, 0],
  ])("turns %i cents into %d dollars", (cents, dollars) => {
    expect(centsToAmount(cents)).toBe(dollars);
  });
});

describe("buildPurchaseCreate", () => {
  const build = (rowOverrides: Parameters<typeof makeRow>[0] = {}) =>
    buildPurchaseCreate({
      row: makeRow(rowOverrides),
      vendor: makeVendorSummary({ Id: "77" }),
      expenseAccount: makeExpenseAccount({ Id: "13" }),
      cardAccount: makeCardAccount({ Id: "42" }),
    });

  it("builds the credit card expense that was posted in staged write 1", () => {
    expect(build()).toEqual({
      PaymentType: "CreditCard",
      AccountRef: { value: "42" },
      EntityRef: { value: "77", type: "Vendor" },
      TxnDate: "2026-10-26",
      DocNumber: "SGdec8e4a35041-1",
      Line: [
        {
          DetailType: "AccountBasedExpenseLineDetail",
          Amount: 95.01,
          AccountBasedExpenseLineDetail: { AccountRef: { value: "13" } },
        },
      ],
    });
  });

  it("uses the transaction date, not the posted date", () => {
    const purchase = build({ transactionDate: "2026-10-26", postedDate: "2026-10-28" });
    expect(purchase.TxnDate).toBe("2026-10-26");
  });

  it("converts whole cents to dollars without drift", () => {
    expect(build({ amountCents: 9526 }).Line[0]?.Amount).toBe(95.26);
    expect(build({ amountCents: 29 }).Line[0]?.Amount).toBe(0.29);
    expect(build({ amountCents: 58500 }).Line[0]?.Amount).toBe(585);
  });

  it("sends a Ref no. of at most 21 characters", () => {
    expect((build().DocNumber ?? "").length).toBeLessThanOrEqual(21);
  });

  it("gives identical rows in one file different Ref nos., by occurrence", () => {
    expect(build({ occurrence: 1 }).DocNumber).not.toBe(build({ occurrence: 2 }).DocNumber);
  });

  it("sends exactly one line, so the purchase total is the row amount", () => {
    expect(build().Line).toHaveLength(1);
  });
});
