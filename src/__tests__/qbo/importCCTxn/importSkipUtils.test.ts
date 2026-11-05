import { describe, expect, it } from "vitest";
import {
  applySkipRuleToRows,
  countAutoSkipped,
  isRestorableSkip,
  isSkippableByRule,
  sortSkipRules,
} from "@/app/qbo/importCCTxn/_lib/importSkipUtils";
import { makeRow } from "@/__tests__/qbo/importCCTxn/importTestHelpers";

const skipRule = { merchantKey: "HOBBY SUPPLY", reason: "inventoryPurchase" } as const;

describe("isRestorableSkip", () => {
  it("lets a person restore a row skipped as an inventory purchase", () => {
    expect(isRestorableSkip({ status: "skipped", skipReason: "inventoryPurchase" })).toBe(true);
  });

  it("lets a person restore a possible duplicate they left out", () => {
    expect(isRestorableSkip({ status: "skipped", skipReason: "duplicate" })).toBe(true);
  });

  it.each(["payment", "refund"] as const)("never restores a %s", (skipReason) => {
    expect(isRestorableSkip({ status: "skipped", skipReason })).toBe(false);
  });

  it("is false for a row that is not skipped", () => {
    expect(isRestorableSkip({ status: "pending", skipReason: undefined })).toBe(false);
  });
});

describe("isSkippableByRule", () => {
  it("skips a pending row of the merchant", () => {
    const row = makeRow({ merchantKey: "HOBBY SUPPLY", status: "pending" });
    expect(isSkippableByRule({ row, skipRule })).toBe(true);
  });

  it("leaves another merchant alone", () => {
    const row = makeRow({ merchantKey: "AMAZON MKTPL", status: "pending" });
    expect(isSkippableByRule({ row, skipRule })).toBe(false);
  });

  it("matches the whole key, never part of it", () => {
    const row = makeRow({ merchantKey: "HOBBY SUPPLY CO", status: "pending" });
    expect(isSkippableByRule({ row, skipRule })).toBe(false);
  });

  it.each(["posting", "posted", "failed", "unknown", "skipped"] as const)(
    "never touches a row that is %s, so a rule cannot interfere with posting",
    (status) => {
      const row = makeRow({ merchantKey: "HOBBY SUPPLY", status });
      expect(isSkippableByRule({ row, skipRule })).toBe(false);
    },
  );
});

describe("applySkipRuleToRows", () => {
  it("skips the merchant's pending rows with the rule's reason", () => {
    const rows = [makeRow({ rowId: "a:1", merchantKey: "HOBBY SUPPLY", status: "pending" })];
    const [result] = applySkipRuleToRows({ rows, skipRule });
    expect(result).toMatchObject({ status: "skipped", skipReason: "inventoryPurchase" });
  });

  it("leaves every other row exactly as it was", () => {
    const other = makeRow({ rowId: "b:1", merchantKey: "AMAZON MKTPL", status: "pending" });
    const posted = makeRow({ rowId: "c:1", merchantKey: "HOBBY SUPPLY", status: "posted" });
    const result = applySkipRuleToRows({ rows: [other, posted], skipRule });
    expect(result[0]).toBe(other);
    expect(result[1]).toBe(posted);
  });

  it("does not change the list it was given", () => {
    const rows = [makeRow({ merchantKey: "HOBBY SUPPLY", status: "pending" })];
    applySkipRuleToRows({ rows, skipRule });
    expect(rows[0]?.status).toBe("pending");
  });

  it("returns an empty list for no rows", () => {
    expect(applySkipRuleToRows({ rows: [], skipRule })).toEqual([]);
  });
});

describe("countAutoSkipped", () => {
  it("counts only the payments and refunds, which cannot be restored", () => {
    const rows = [
      { status: "skipped", skipReason: "payment" },
      { status: "skipped", skipReason: "refund" },
      { status: "skipped", skipReason: "inventoryPurchase" },
      { status: "skipped", skipReason: "duplicate" },
    ] as const;
    expect(countAutoSkipped([...rows])).toBe(2);
  });

  it("is zero when nothing is skipped", () => {
    expect(countAutoSkipped([])).toBe(0);
  });
});

describe("sortSkipRules", () => {
  it("sorts by merchant key without changing the list it was given", () => {
    const rules = [
      { merchantKey: "ZEBRA", reason: "inventoryPurchase" as const },
      { merchantKey: "ACME", reason: "inventoryPurchase" as const },
    ];
    expect(sortSkipRules(rules).map((rule) => rule.merchantKey)).toEqual(["ACME", "ZEBRA"]);
    expect(rules[0]?.merchantKey).toBe("ZEBRA");
  });
});
