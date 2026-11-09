import { describe, expect, it } from "vitest";
import { buildGenLedgerEntry } from "@/app/javelin/_lib/entryBuild";
import { computeGenLedgerHash } from "@/app/javelin/_lib/entrySourceHash";
import { link, testAccounts } from "@/__tests__/javelin/javelinTestHelpers";

describe("computeGenLedgerHash", () => {
  const lines = [
    { crmAccount: "310 - WEED", netCents: 1000 },
    { crmAccount: "349 - DISCOUNT", netCents: -1000 },
  ];

  it("ignores the order of the rows in the file", () => {
    const forward = computeGenLedgerHash({ date: "2026-10-21", lines });
    const reversed = computeGenLedgerHash({ date: "2026-10-21", lines: [...lines].reverse() });
    expect(reversed).toBe(forward);
  });

  it("changes with the date or an amount", () => {
    const base = computeGenLedgerHash({ date: "2026-10-21", lines });
    expect(computeGenLedgerHash({ date: "2026-10-22", lines })).not.toBe(base);
    const changed = [{ ...lines[0], netCents: 1001 }, lines[1]];
    expect(computeGenLedgerHash({ date: "2026-10-21", lines: changed })).not.toBe(base);
  });
});

describe("buildGenLedgerEntry", () => {
  const file = {
    fileName: "2026-10-21.csv",
    date: "2026-10-21",
    rows: [
      { account: "310 - WEED", totalNetAmount: 100.5 },
      { account: "349 - DISCOUNT", totalNetAmount: -100.5 },
      { account: "360 - ZERO", totalNetAmount: 0 },
    ],
  };

  it("builds a balanced entry with the debit and credit on the right sides", () => {
    const mappings = new Map([
      ["310", link("10")],
      ["349", link("20")],
    ]);
    const built = buildGenLedgerEntry({ file, mappings, accountMap: testAccounts });

    expect(built.problems).toEqual([]);
    expect(built.input?.lines).toEqual([
      expect.objectContaining({ postingType: "Debit", accountId: "10", amountCents: 10050 }),
      expect.objectContaining({ postingType: "Credit", accountId: "20", amountCents: 10050 }),
    ]);
    expect(built.input?.source).toMatchObject({ kind: "genLedger", fileName: "2026-10-21.csv" });
    expect(built.docNumber).toMatch(/^SJ[0-9a-f]{12}-1$/);
    expect(built.docNumber!.length).toBeLessThanOrEqual(21);
  });

  it("reports an account that has no link and builds nothing", () => {
    const mappings = new Map([["310", link("10")]]);
    const built = buildGenLedgerEntry({ file, mappings, accountMap: testAccounts });

    expect(built.input).toBeNull();
    expect(built.problems).toEqual(["349 - DISCOUNT: not linked to a QuickBooks account."]);
  });

  it("puts the default customer on a receivable line and no name on others", () => {
    const mappings = new Map([
      ["310", link("30", { defaultNameType: "Customer", defaultNameId: "77" })],
      ["349", link("20", { defaultNameType: "Customer", defaultNameId: "77" })],
    ]);
    const built = buildGenLedgerEntry({ file, mappings, accountMap: testAccounts });

    expect(built.input?.lines[0]).toMatchObject({ entityType: "Customer", entityId: "77" });
    expect(built.input?.lines[1].entityType).toBeUndefined();
  });

  it("is empty when every line nets to zero", () => {
    const built = buildGenLedgerEntry({
      file: { ...file, rows: [{ account: "360 - ZERO", totalNetAmount: 0 }] },
      mappings: new Map(),
      accountMap: testAccounts,
    });
    expect(built.isEmpty).toBe(true);
    expect(built.input).toBeNull();
  });
});
