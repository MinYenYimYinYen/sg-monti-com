import { describe, expect, it } from "vitest";
import {
  chunkItems,
  MAX_ROWS_PER_REQUEST,
  ROWS_PER_BATCH,
  validateBatchRange,
} from "@/app/qbo/importCCTxn/_lib/importBatchPlanUtils";

describe("limits", () => {
  it("uses Intuit's limit of 30 items per batch request", () => {
    expect(ROWS_PER_BATCH).toBe(30);
  });

  it("keeps one run to a whole number of batches", () => {
    expect(MAX_ROWS_PER_REQUEST % ROWS_PER_BATCH).toBe(0);
  });
});

describe("chunkItems", () => {
  const numbers = (count: number) => Array.from({ length: count }, (_, index) => index);

  it("splits a list into chunks of the given size, the last one shorter", () => {
    const chunks = chunkItems({ items: numbers(7), size: 3 });
    expect(chunks).toEqual([[0, 1, 2], [3, 4, 5], [6]]);
  });

  it("makes one chunk when the list fits", () => {
    expect(chunkItems({ items: numbers(30), size: 30 })).toHaveLength(1);
  });

  it("makes 31 rows into two batches of 30 and 1", () => {
    const chunks = chunkItems({ items: numbers(31), size: ROWS_PER_BATCH });
    expect(chunks.map((chunk) => chunk.length)).toEqual([30, 1]);
  });

  it("makes a full 300-row run into 10 batches", () => {
    expect(chunkItems({ items: numbers(MAX_ROWS_PER_REQUEST), size: ROWS_PER_BATCH })).toHaveLength(
      10,
    );
  });

  it("keeps every item exactly once, in order", () => {
    const chunks = chunkItems({ items: numbers(95), size: 30 });
    expect(chunks.flat()).toEqual(numbers(95));
  });

  it("returns no chunks for an empty list", () => {
    expect(chunkItems({ items: [], size: 30 })).toEqual([]);
  });

  it.each([0, -1, 1.5, Number.NaN])("refuses a chunk size of %s", (size) => {
    expect(() => chunkItems({ items: [1], size })).toThrow();
  });
});

describe("validateBatchRange", () => {
  it("accepts two real dates in order, including the same day", () => {
    expect(validateBatchRange({ startDate: "2026-10-01", endDate: "2026-10-31" })).toBeNull();
    expect(validateBatchRange({ startDate: "2026-10-05", endDate: "2026-10-05" })).toBeNull();
  });

  it("asks for dates when either is missing", () => {
    expect(validateBatchRange({ startDate: "", endDate: "2026-10-31" })).toBe(
      "Choose a start date and an end date.",
    );
    expect(validateBatchRange({ startDate: "2026-10-01", endDate: "" })).toBe(
      "Choose a start date and an end date.",
    );
  });

  it("refuses a date that is not a real calendar date", () => {
    expect(validateBatchRange({ startDate: "2026-02-30", endDate: "2026-03-01" })).not.toBeNull();
  });

  it("refuses text that is not strictly YYYY-MM-DD, because the dates reach a query", () => {
    expect(validateBatchRange({ startDate: "10/01/2026", endDate: "2026-10-31" })).not.toBeNull();
    expect(
      validateBatchRange({ startDate: "2026-10-01'; DROP", endDate: "2026-10-31" }),
    ).not.toBeNull();
  });

  it("refuses a start date after the end date", () => {
    expect(validateBatchRange({ startDate: "2026-10-31", endDate: "2026-10-01" })).toBe(
      "The start date must be on or before the end date.",
    );
  });
});
