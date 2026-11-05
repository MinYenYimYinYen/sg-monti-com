import { describe, expect, it } from "vitest";
import {
  aggregateMessages,
  BatchCandidate,
  MAX_ROWS_PER_REQUEST,
  summarizeBatchPreview,
} from "@/app/qbo/importCCTxn/_lib/importBatchPlanUtils";
import { makeRow } from "@/__tests__/qbo/importCCTxn/importTestHelpers";

function candidate(overrides: {
  index: number;
  amountCents?: number;
  problems?: string[];
  warnings?: string[];
  isConfirmed?: boolean;
}): BatchCandidate {
  return {
    row: makeRow({
      rowId: `row-${overrides.index}:1`,
      amountCents: overrides.amountCents ?? 1000,
      transactionDate: "2026-10-10",
    }),
    problems: overrides.problems ?? [],
    warnings: overrides.warnings ?? [],
    isConfirmed: overrides.isConfirmed ?? true,
  };
}

const range = { startDate: "2026-10-01", endDate: "2026-10-31" };

describe("aggregateMessages", () => {
  it("counts identical messages once, in the order first seen", () => {
    expect(aggregateMessages(["b", "a", "b", "b"])).toEqual([
      { message: "b", count: 3 },
      { message: "a", count: 1 },
    ]);
  });

  it("returns nothing for no messages", () => {
    expect(aggregateMessages([])).toEqual([]);
  });
});

describe("summarizeBatchPreview", () => {
  it("counts and totals only the rows that will be sent", () => {
    const preview = summarizeBatchPreview({
      candidates: [
        candidate({ index: 1, amountCents: 1000 }),
        candidate({ index: 2, amountCents: 2550 }),
        candidate({ index: 3, amountCents: 9999, problems: ["The mapped vendor is inactive."] }),
      ],
      ...range,
      unsettledRowCount: 0,
    });
    expect(preview.readyCount).toBe(2);
    expect(preview.readyTotalCents).toBe(3550);
    expect(preview.readyRowIds).toEqual(["row-1:1", "row-2:1"]);
  });

  it("lists a row with a problem as blocked and never as ready", () => {
    const preview = summarizeBatchPreview({
      candidates: [candidate({ index: 1, problems: ["No vendor mapped."] })],
      ...range,
      unsettledRowCount: 0,
    });
    expect(preview.readyCount).toBe(0);
    expect(preview.readyRowIds).toEqual([]);
    expect(preview.blockedRows).toHaveLength(1);
    expect(preview.blockedRows[0]).toMatchObject({ rowId: "row-1:1", problems: ["No vendor mapped."] });
  });

  it("makes batches of 30: 31 ready rows are 2 batches", () => {
    const candidates = Array.from({ length: 31 }, (_, index) => candidate({ index }));
    const preview = summarizeBatchPreview({ candidates, ...range, unsettledRowCount: 0 });
    expect(preview.batchCount).toBe(2);
  });

  it("makes one batch of 30 for exactly 30 rows, and none for no rows", () => {
    const thirty = Array.from({ length: 30 }, (_, index) => candidate({ index }));
    expect(summarizeBatchPreview({ candidates: thirty, ...range, unsettledRowCount: 0 }).batchCount).toBe(1);
    expect(summarizeBatchPreview({ candidates: [], ...range, unsettledRowCount: 0 }).batchCount).toBe(0);
  });

  it("cuts the ready rows to the per-run cap and says how many wait", () => {
    const candidates = Array.from({ length: MAX_ROWS_PER_REQUEST + 5 }, (_, index) =>
      candidate({ index }),
    );
    const preview = summarizeBatchPreview({ candidates, ...range, unsettledRowCount: 0 });
    expect(preview.readyCount).toBe(MAX_ROWS_PER_REQUEST);
    expect(preview.readyRowIds).toHaveLength(MAX_ROWS_PER_REQUEST);
    expect(preview.deferredCount).toBe(5);
  });

  it("totals only the capped rows, so the confirmation matches what is sent", () => {
    const candidates = Array.from({ length: MAX_ROWS_PER_REQUEST + 1 }, (_, index) =>
      candidate({ index, amountCents: 100 }),
    );
    const preview = summarizeBatchPreview({ candidates, ...range, unsettledRowCount: 0 });
    expect(preview.readyTotalCents).toBe(MAX_ROWS_PER_REQUEST * 100);
  });

  it("counts unconfirmed ready rows without blocking them", () => {
    const preview = summarizeBatchPreview({
      candidates: [
        candidate({ index: 1, isConfirmed: true }),
        candidate({ index: 2, isConfirmed: false }),
        candidate({ index: 3, isConfirmed: false }),
      ],
      ...range,
      unsettledRowCount: 0,
    });
    expect(preview.unconfirmedCount).toBe(2);
    expect(preview.readyCount).toBe(3);
  });

  it("does not count a blocked row as unconfirmed", () => {
    const preview = summarizeBatchPreview({
      candidates: [candidate({ index: 1, isConfirmed: false, problems: ["No vendor mapped."] })],
      ...range,
      unsettledRowCount: 0,
    });
    expect(preview.unconfirmedCount).toBe(0);
  });

  it("combines identical warnings across the rows that will be sent", () => {
    const warning = "The transaction date is on or before the books-closed date (2023-12-31).";
    const preview = summarizeBatchPreview({
      candidates: [
        candidate({ index: 1, warnings: [warning] }),
        candidate({ index: 2, warnings: [warning] }),
      ],
      ...range,
      unsettledRowCount: 0,
    });
    expect(preview.warnings).toEqual([{ message: warning, count: 2 }]);
  });

  it("passes the range and the unsettled count through", () => {
    const preview = summarizeBatchPreview({ candidates: [], ...range, unsettledRowCount: 4 });
    expect(preview).toMatchObject({ ...range, unsettledRowCount: 4 });
  });
});
