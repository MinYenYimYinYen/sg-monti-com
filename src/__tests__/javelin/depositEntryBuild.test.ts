import { describe, expect, it } from "vitest";
import { buildDepositEntries } from "@/app/javelin/_lib/depositEntryBuild";
import { DepositRow } from "@/app/javelin/JavelinTypes";
import { link, testAccounts } from "@/__tests__/javelin/javelinTestHelpers";

/**
 * The CRM example from the Javelin readme: sales 4,292.29 (credit) against refund 466.98, fees
 * 126.20 and net deposit 3,699.11 (debits). Both sides total 4,292.29.
 */
const row: DepositRow = {
  date: "2026-06-02",
  salesAmount: 4292.29,
  refundAmount: 466.98,
  chargeBackAmount: 0,
  adjustmentAmount: 0,
  grossDepositAmount: 3825.31,
  fees: 126.2,
  netDeposit: 3699.11,
};

const mappings = new Map([
  ["salesAmount" as const, link("10")],
  ["refundAmount" as const, link("10")],
  ["fees" as const, link("20")],
  ["netDeposit" as const, link("20")],
]);

function build(rows: DepositRow[], links = mappings) {
  return buildDepositEntries({ rows, fileName: "dep.csv", mappings: links, accountMap: testAccounts });
}

describe("buildDepositEntries", () => {
  it("balances the CRM example and labels the refund line", () => {
    const [built] = build([row]);
    const lines = built.input!.lines;
    const sum = (side: "Debit" | "Credit") =>
      lines.filter((l) => l.postingType === side).reduce((total, l) => total + l.amountCents, 0);

    expect(sum("Debit")).toBe(429229);
    expect(sum("Credit")).toBe(429229);
    expect(lines.find((l) => l.description === "Refund")).toMatchObject({ postingType: "Debit" });
    expect(built.input?.source).toMatchObject({ kind: "deposit", netDepositCents: 369911 });
  });

  it("flips the side of a negative amount", () => {
    const [built] = build([{ ...row, refundAmount: -466.98 }]);
    expect(built.input?.lines.find((l) => l.description === "Refund")).toMatchObject({
      postingType: "Credit",
      amountCents: 46698,
    });
  });

  it("numbers identical rows on one date so each gets its own DocNumber", () => {
    const built = build([row, row]);
    expect(built[0].docNumber).not.toBe(built[1].docNumber);
    expect(built[0].docNumber!.endsWith("-1")).toBe(true);
    expect(built[1].docNumber!.endsWith("-2")).toBe(true);
  });

  it("gives the same DocNumber to the same source on a second build", () => {
    expect(build([row])[0].docNumber).toBe(build([row])[0].docNumber);
  });

  it("does not let the QuickBooks mapping change an entry's identity", () => {
    const remapped = new Map(mappings);
    remapped.set("fees", link("30", { defaultNameType: "Customer", defaultNameId: "77" }));
    expect(build([row], remapped)[0].docNumber).toBe(build([row])[0].docNumber);
  });

  it("reports an unlinked field as a problem", () => {
    const partial = new Map([["salesAmount" as const, link("10")]]);
    const [built] = build([row], partial);
    expect(built.input).toBeNull();
    expect(built.problems.length).toBeGreaterThan(0);
  });

  it("is empty when every field is zero", () => {
    const zero = { ...row, salesAmount: 0, refundAmount: 0, fees: 0, netDeposit: 0 };
    expect(build([zero])[0].isEmpty).toBe(true);
  });
});
