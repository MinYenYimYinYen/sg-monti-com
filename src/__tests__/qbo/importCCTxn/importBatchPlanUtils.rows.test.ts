import { describe, expect, it } from "vitest";
import {
  isPostableStatus,
  isReconcilable,
  pickRowsInRange,
  STUCK_POSTING_MS,
} from "@/app/qbo/importCCTxn/_lib/importBatchPlanUtils";
import { makeRow } from "@/__tests__/qbo/importCCTxn/importTestHelpers";

describe("isPostableStatus", () => {
  it("accepts pending and failed rows only", () => {
    expect(isPostableStatus("pending")).toBe(true);
    expect(isPostableStatus("failed")).toBe(true);
    for (const status of ["posting", "posted", "skipped", "unknown"] as const) {
      expect(isPostableStatus(status)).toBe(false);
    }
  });
});

describe("pickRowsInRange", () => {
  const range = { startDate: "2026-10-01", endDate: "2026-10-31" };

  it("keeps postable charges inside the range, both end dates included", () => {
    const rows = [
      makeRow({ rowId: "a:1", transactionDate: "2026-10-01" }),
      makeRow({ rowId: "b:1", transactionDate: "2026-10-31" }),
      makeRow({ rowId: "c:1", transactionDate: "2026-09-30" }),
      makeRow({ rowId: "d:1", transactionDate: "2026-11-01" }),
    ];
    expect(pickRowsInRange({ rows, ...range }).map((row) => row.rowId)).toEqual(["a:1", "b:1"]);
  });

  it("leaves out rows that are not pending or failed", () => {
    const rows = (["posted", "posting", "skipped", "unknown"] as const).map((status) =>
      makeRow({ rowId: `${status}:1`, status, transactionDate: "2026-10-10" }),
    );
    expect(pickRowsInRange({ rows, ...range })).toEqual([]);
  });

  it("includes a failed row, which is certain not to be in QuickBooks", () => {
    const rows = [makeRow({ rowId: "f:1", status: "failed", transactionDate: "2026-10-10" })];
    expect(pickRowsInRange({ rows, ...range })).toHaveLength(1);
  });

  it("leaves out payments and refunds", () => {
    const rows = [
      makeRow({ rowId: "p:1", kind: "payment", transactionDate: "2026-10-10" }),
      makeRow({ rowId: "r:1", kind: "refund", transactionDate: "2026-10-10" }),
    ];
    expect(pickRowsInRange({ rows, ...range })).toEqual([]);
  });

  it("orders by date, then by row id, and does not change the list it was given", () => {
    const rows = [
      makeRow({ rowId: "z:1", transactionDate: "2026-10-05" }),
      makeRow({ rowId: "b:1", transactionDate: "2026-10-05" }),
      makeRow({ rowId: "m:1", transactionDate: "2026-10-02" }),
    ];
    expect(pickRowsInRange({ rows, ...range }).map((row) => row.rowId)).toEqual([
      "m:1",
      "b:1",
      "z:1",
    ]);
    expect(rows[0]?.rowId).toBe("z:1");
  });
});

describe("isReconcilable", () => {
  const nowMs = 1_000_000_000_000;

  it("always lets an unknown row be looked up", () => {
    expect(isReconcilable({ status: "unknown", updatedAtMs: nowMs, nowMs })).toBe(true);
  });

  it("does not let a row that was just sent be looked up, because it may be in flight", () => {
    expect(isReconcilable({ status: "posting", updatedAtMs: nowMs - 60_000, nowMs })).toBe(false);
  });

  it("lets a row stuck in posting for long enough be looked up", () => {
    expect(
      isReconcilable({ status: "posting", updatedAtMs: nowMs - STUCK_POSTING_MS, nowMs }),
    ).toBe(true);
  });

  it("does not look up a posting row with no timestamp, since it cannot tell how old it is", () => {
    expect(isReconcilable({ status: "posting", updatedAtMs: null, nowMs })).toBe(false);
  });

  it.each(["pending", "failed", "posted", "skipped"] as const)(
    "never looks up a %s row",
    (status) => {
      expect(isReconcilable({ status, updatedAtMs: 0, nowMs })).toBe(false);
    },
  );
});
