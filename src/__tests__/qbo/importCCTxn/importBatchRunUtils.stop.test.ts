import { describe, expect, it } from "vitest";
import {
  countOutcomes,
  describeStop,
  settledRun,
  shouldStopAfter,
  summarizeRun,
} from "@/app/qbo/importCCTxn/_lib/importBatchRunUtils";
import { PostOutcome, PostRowsResult } from "@/app/qbo/importCCTxn/types/ImportRowTypes";
import { makeRow } from "@/__tests__/qbo/importCCTxn/importTestHelpers";

describe("shouldStopAfter", () => {
  it("keeps going when every row in the batch posted", () => {
    expect(shouldStopAfter(["posted", "posted", "posted"])).toBe(false);
  });

  it.each(["failed", "unknown", "pending"] as const)(
    "stops when any one row in the batch is %s",
    (outcome) => {
      expect(shouldStopAfter(["posted", outcome, "posted"])).toBe(true);
    },
  );

  it("does not stop for an empty batch, which means nothing was sent", () => {
    expect(shouldStopAfter([])).toBe(false);
  });
});

describe("countOutcomes", () => {
  it("counts each outcome", () => {
    const outcomes: PostOutcome[] = ["posted", "posted", "failed", "unknown", "pending", "posted"];
    expect(countOutcomes(outcomes)).toEqual({ posted: 3, failed: 1, unknown: 1, pending: 1 });
  });

  it("is all zeros for no outcomes", () => {
    expect(countOutcomes([])).toEqual({ posted: 0, failed: 0, unknown: 0, pending: 0 });
  });
});

describe("describeStop", () => {
  it("says which batch stopped the run, what happened in it, and how many rows were held back", () => {
    const message = describeStop({
      batchNumber: 2,
      batchCount: 5,
      outcomes: ["posted", "posted", "failed"],
      notAttemptedCount: 90,
    });
    expect(message).toBe(
      "Stopped after batch 2 of 5 because not every row posted (2 posted, 1 failed). 90 rows were not sent.",
    );
  });

  it("names rows that need checking in QuickBooks", () => {
    const message = describeStop({
      batchNumber: 1,
      batchCount: 3,
      outcomes: ["unknown", "unknown"],
      notAttemptedCount: 60,
    });
    expect(message).toContain("2 need checking in QuickBooks");
  });

  it("names rows sent back unposted", () => {
    const message = describeStop({
      batchNumber: 1,
      batchCount: 3,
      outcomes: ["pending"],
      notAttemptedCount: 60,
    });
    expect(message).toContain("1 sent back unposted");
  });

  it("uses the singular for one held-back row", () => {
    const message = describeStop({
      batchNumber: 1,
      batchCount: 2,
      outcomes: ["failed"],
      notAttemptedCount: 1,
    });
    expect(message).toContain("1 row was not sent.");
  });

  it("does not say stopped when the last batch had a problem, since nothing was held back", () => {
    const message = describeStop({
      batchNumber: 3,
      batchCount: 3,
      outcomes: ["posted", "failed"],
      notAttemptedCount: 0,
    });
    expect(message).toBe("Batch 3 of 3 did not fully post (1 posted, 1 failed).");
    expect(message).not.toContain("Stopped");
  });
});

describe("summarizeRun", () => {
  function run(overrides: Partial<PostRowsResult>): PostRowsResult {
    return { results: [], blockedRows: [], notAttemptedRowIds: [], stopReason: null, ...overrides };
  }

  it("counts what posted and totals it in cents, so it can be compared with the statement", () => {
    const summary = summarizeRun(
      run({
        results: [
          { row: makeRow({ rowId: "a:1", amountCents: 9501 }), outcome: "posted" },
          { row: makeRow({ rowId: "b:1", amountCents: 2146 }), outcome: "posted" },
          { row: makeRow({ rowId: "c:1", amountCents: 5000 }), outcome: "failed" },
        ],
      }),
    );
    expect(summary).toMatchObject({ postedCount: 2, postedCents: 11647, failedCount: 1 });
  });

  it("does not add rows that did not post into the posted total", () => {
    const summary = summarizeRun(
      run({ results: [{ row: makeRow({ amountCents: 7000 }), outcome: "unknown" }] }),
    );
    expect(summary).toMatchObject({ postedCount: 0, postedCents: 0, unknownCount: 1 });
  });

  it("accounts for blocked rows and held-back rows", () => {
    const summary = summarizeRun(
      run({
        blockedRows: [
          {
            rowId: "x:1",
            description: "X",
            transactionDate: "2026-10-01",
            amountCents: 100,
            problems: ["No vendor mapped."],
          },
        ],
        notAttemptedRowIds: ["y:1", "z:1"],
      }),
    );
    expect(summary).toMatchObject({ blockedCount: 1, notAttemptedCount: 2 });
  });

  it("counts rows sent back unposted", () => {
    const summary = summarizeRun(
      run({ results: [{ row: makeRow(), outcome: "pending" }] }),
    );
    expect(summary.pendingCount).toBe(1);
  });
});

describe("settledRun", () => {
  it("wraps looked-up rows as a run with nothing blocked or held back", () => {
    const results = [{ row: makeRow(), outcome: "posted" as const }];
    expect(settledRun(results)).toEqual({
      results,
      blockedRows: [],
      notAttemptedRowIds: [],
      stopReason: null,
    });
  });
});
