import { describe, expect, it } from "vitest";
import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";
import { BuiltEntry } from "@/app/javelin/_lib/entryBuild";
import { planEntries, StoredPostingRef } from "@/app/javelin/_lib/entryPlanUtils";

const accountMap = new Map<string, QboAccount>([
  [
    "10",
    {
      Id: "10",
      Name: "Sales",
      SyncToken: "0",
      Active: true,
      AccountType: "Income",
      AccountSubType: "SalesOfProductIncome",
      FullyQualifiedName: "Sales",
      SubAccount: false,
    },
  ],
]);

function makeBuilt({ docNumber, txnDate = "2026-10-21" }: { docNumber: string; txnDate?: string }): BuiltEntry {
  return {
    label: docNumber,
    txnDate,
    docNumber,
    problems: [],
    isEmpty: false,
    input: {
      docNumber,
      txnDate,
      lines: [
        { postingType: "Debit", accountId: "10", amountCents: 500 },
        { postingType: "Credit", accountId: "10", amountCents: 500 },
      ],
      source: { kind: "genLedger", sourceHash: docNumber, fileName: "f.csv", sourceLines: [] },
    },
  };
}

function stored(overrides: Partial<StoredPostingRef> & Pick<StoredPostingRef, "docNumber">): StoredPostingRef {
  return {
    status: "posted",
    txnDate: "2026-10-21",
    source: { kind: "genLedger", sourceHash: "x", fileName: "f.csv", sourceLines: [] },
    ...overrides,
  };
}

function plan({ built, existing = [], confirmed = [] }: { built: BuiltEntry[]; existing?: StoredPostingRef[]; confirmed?: string[] }) {
  return planEntries({ built, stored: existing, accountMap, confirmedDocNumbers: new Set(confirmed) });
}

describe("planEntries", () => {
  it("marks a new entry ready", () => {
    expect(plan({ built: [makeBuilt({ docNumber: "SJa-1" })] })[0].status).toBe("ready");
  });

  it("marks the same source as a duplicate when it is posted, posting or unknown", () => {
    for (const status of ["posted", "posting", "unknown"] as const) {
      const [result] = plan({
        built: [makeBuilt({ docNumber: "SJa-1" })],
        existing: [stored({ docNumber: "SJa-1", status })],
      });
      expect(result.status).toBe("duplicate");
    }
  });

  it("lets a failed or pending entry be tried again", () => {
    for (const status of ["failed", "pending"] as const) {
      const [result] = plan({
        built: [makeBuilt({ docNumber: "SJa-1" })],
        existing: [stored({ docNumber: "SJa-1", status })],
      });
      expect(result.status).toBe("ready");
    }
  });

  it("flags different content on the same date as a possible duplicate", () => {
    const [result] = plan({
      built: [makeBuilt({ docNumber: "SJnew-1" })],
      existing: [stored({ docNumber: "SJold-1" })],
    });
    expect(result.status).toBe("possibleDuplicate");
    expect(result.matchedDocNumber).toBe("SJold-1");
  });

  it("posts a possible duplicate once the user confirms it", () => {
    const [result] = plan({
      built: [makeBuilt({ docNumber: "SJnew-1" })],
      existing: [stored({ docNumber: "SJold-1" })],
      confirmed: ["SJnew-1"],
    });
    expect(result.status).toBe("ready");
  });

  it("does not compare against a different date", () => {
    const [result] = plan({
      built: [makeBuilt({ docNumber: "SJnew-1" })],
      existing: [stored({ docNumber: "SJold-1", txnDate: "2026-10-20" })],
    });
    expect(result.status).toBe("ready");
  });

  it("only lets the first of two identical files in one upload post", () => {
    const results = plan({
      built: [makeBuilt({ docNumber: "SJa-1" }), makeBuilt({ docNumber: "SJa-1" })],
    });
    expect(results.map((r) => r.status)).toEqual(["ready", "duplicate"]);
  });

  it("blocks an entry whose built input is missing", () => {
    const blocked: BuiltEntry = {
      label: "f",
      txnDate: "2026-10-21",
      docNumber: "SJa-1",
      input: null,
      problems: ["310 - X: not linked to a QuickBooks account."],
      isEmpty: false,
    };
    const [result] = plan({ built: [blocked] });
    expect(result.status).toBe("blocked");
    expect(result.problems).toHaveLength(1);
  });

  it("blocks a line on an inactive account", () => {
    const inactive = new Map(accountMap);
    inactive.set("10", { ...accountMap.get("10")!, Active: false });
    const [result] = planEntries({
      built: [makeBuilt({ docNumber: "SJa-1" })],
      stored: [],
      accountMap: inactive,
      confirmedDocNumbers: new Set(),
    });
    expect(result.status).toBe("blocked");
  });
});
