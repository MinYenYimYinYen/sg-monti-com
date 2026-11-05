import { describe, expect, it } from "vitest";
import { planPostRows } from "@/app/qbo/importCCTxn/_lib/importPostContextUtils";
import {
  makeCardAccount,
  makeExpenseAccount,
  makeRow,
  makeVendorSummary,
} from "@/__tests__/qbo/importCCTxn/importTestHelpers";
import { makeContext } from "@/__tests__/qbo/importCCTxn/postContextTestHelpers";
import { ImportRow } from "@/app/qbo/importCCTxn/types/ImportRowTypes";

function plan({ rows, context = makeContext() }: { rows: ImportRow[]; context?: ReturnType<typeof makeContext> }) {
  return planPostRows({
    rowIds: rows.map((row) => row.rowId),
    rowMap: new Map(rows.map((row) => [row.rowId, row])),
    context,
  });
}

describe("planPostRows", () => {
  it("splits the rows into ones that can be sent and ones that cannot", () => {
    const good = makeRow({ rowId: "good:1", description: "ANTHROPIC" });
    const unmapped = makeRow({ rowId: "bad:1", description: "UNMAPPED SHOP" });
    const { readyRows, blockedRows } = plan({ rows: [good, unmapped] });
    expect(readyRows.map((ready) => ready.row.rowId)).toEqual(["good:1"]);
    expect(blockedRows.map((blocked) => blocked.rowId)).toEqual(["bad:1"]);
  });

  it("builds the purchase to send for a ready row, with its Ref no.", () => {
    const { readyRows } = plan({ rows: [makeRow({ rowId: "good:1" })] });
    expect(readyRows[0]?.purchase).toMatchObject({
      PaymentType: "CreditCard",
      DocNumber: "SGdec8e4a35041-1",
    });
    expect(readyRows[0]?.expenseAccountId).toBe("13");
  });

  it("keeps the ready rows in the order they were asked for", () => {
    const rows = ["c:1", "a:1", "b:1"].map((rowId) => makeRow({ rowId }));
    const { readyRows } = plan({ rows });
    expect(readyRows.map((ready) => ready.row.rowId)).toEqual(["c:1", "a:1", "b:1"]);
  });

  it("blocks a row that no longer exists instead of dropping it silently", () => {
    const { readyRows, blockedRows } = planPostRowsFor(["gone:1"]);
    expect(readyRows).toEqual([]);
    expect(blockedRows[0]).toMatchObject({
      rowId: "gone:1",
      problems: ["That row no longer exists."],
    });
  });

  it.each(["posted", "posting", "skipped", "unknown"] as const)(
    "blocks a row that is %s, so a posted row can never be sent again",
    (status) => {
      const { readyRows, blockedRows } = plan({ rows: [makeRow({ rowId: "r:1", status })] });
      expect(readyRows).toEqual([]);
      expect(blockedRows).toHaveLength(1);
    },
  );

  it("blocks a row whose vendor has gone inactive since mapping", () => {
    const context = makeContext({
      vendorMap: new Map([["77", makeVendorSummary({ Id: "77", Active: false })]]),
    });
    const { readyRows, blockedRows } = plan({ rows: [makeRow({ rowId: "r:1" })], context });
    expect(readyRows).toEqual([]);
    expect(blockedRows[0]?.problems.join(" ")).toContain("inactive");
  });

  it("blocks a row whose own account is not an expense account", () => {
    const context = makeContext({
      accountMap: new Map([
        ["13", makeExpenseAccount({ Id: "13" })],
        ["42", makeCardAccount({ Id: "42" })],
        ["7", makeExpenseAccount({ Id: "7", Classification: "Asset", FullyQualifiedName: "Cash" })],
      ]),
    });
    const { blockedRows } = plan({ rows: [makeRow({ rowId: "r:1", accountId: "7" })], context });
    expect(blockedRows[0]?.problems.join(" ")).toContain("not an expense account");
  });

  it("blocks a row with no card account instead of sending it", () => {
    const context = makeContext({ formatAccountMap: new Map() });
    const { readyRows, blockedRows } = plan({ rows: [makeRow({ rowId: "r:1" })], context });
    expect(readyRows).toEqual([]);
    expect(blockedRows[0]?.problems.join(" ")).toContain("credit card account");
  });
});

function planPostRowsFor(rowIds: string[]) {
  return planPostRows({ rowIds, rowMap: new Map(), context: makeContext() });
}
