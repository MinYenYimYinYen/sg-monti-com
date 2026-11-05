import { describe, expect, it } from "vitest";
import { checkDuplicates } from "@/app/qbo/importCCTxn/_lib/importDuplicates";
import { RowIdentity } from "@/app/qbo/importCCTxn/types/ImportCCTxnTypes";

function identity(overrides: Partial<RowIdentity> = {}): RowIdentity {
  return {
    rowHash: "hash-coffee",
    last4: "2238",
    transactionDate: "2026-08-15",
    amountCents: 500,
    ...overrides,
  };
}

function repeat(row: RowIdentity, count: number): RowIdentity[] {
  return Array.from({ length: count }, () => row);
}

describe("checkDuplicates: identical rows (multiplicity)", () => {
  it("treats every row as new when nothing is stored", () => {
    const result = checkDuplicates({
      rows: [identity(), identity({ rowHash: "hash-gas" })],
      existingRows: [],
    });
    expect(result.map((row) => row.isDuplicate)).toEqual([false, false]);
  });

  it("numbers identical rows in a file 1, 2, 3, and keeps all of them as real purchases", () => {
    const result = checkDuplicates({ rows: repeat(identity(), 3), existingRows: [] });
    expect(result.map((row) => row.occurrence)).toEqual([1, 2, 3]);
    expect(result.map((row) => row.isDuplicate)).toEqual([false, false, false]);
  });

  it("marks only the first N of M identical rows as duplicates when N are stored", () => {
    const result = checkDuplicates({
      rows: repeat(identity(), 3),
      existingRows: repeat(identity(), 1),
    });
    expect(result.map((row) => row.isDuplicate)).toEqual([true, false, false]);
    expect(result.map((row) => row.occurrence)).toEqual([1, 2, 3]);
  });

  it("marks every row a duplicate when the database already holds as many as the file", () => {
    const result = checkDuplicates({
      rows: repeat(identity(), 2),
      existingRows: repeat(identity(), 2),
    });
    expect(result.map((row) => row.isDuplicate)).toEqual([true, true]);
  });

  it("marks the row a duplicate when the database holds more than the file", () => {
    const result = checkDuplicates({ rows: [identity()], existingRows: repeat(identity(), 2) });
    expect(result.map((row) => row.isDuplicate)).toEqual([true]);
  });

  it("counts each hash separately", () => {
    const gas = identity({ rowHash: "hash-gas", amountCents: 4000 });
    const result = checkDuplicates({
      rows: [identity(), gas, identity(), gas],
      existingRows: [gas],
    });
    expect(result.map((row) => row.isDuplicate)).toEqual([false, true, false, false]);
    expect(result.map((row) => row.occurrence)).toEqual([1, 1, 2, 2]);
  });

  it("returns one result per row, in the file's order, keeping each row's hash", () => {
    const rows = [
      identity({ rowHash: "a" }),
      identity({ rowHash: "b" }),
      identity({ rowHash: "c" }),
    ];
    expect(checkDuplicates({ rows, existingRows: [] }).map((row) => row.rowHash)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("returns nothing for an empty file", () => {
    expect(checkDuplicates({ rows: [], existingRows: [identity()] })).toEqual([]);
  });
});

describe("checkDuplicates: overlapping files", () => {
  // The first file covers 8/1 to 8/15. The second covers 8/13 to 8/31, so 8/13 to 8/15 appear in
  // both. 8/15 is a partly present day: one coffee in the first file, two in the second.
  const lunch = identity({ rowHash: "hash-lunch", transactionDate: "2026-08-13", amountCents: 1250 });
  const fuel = identity({ rowHash: "hash-fuel", transactionDate: "2026-08-14", amountCents: 4000 });
  const coffee = identity({ rowHash: "hash-coffee", transactionDate: "2026-08-15", amountCents: 500 });
  const hotel = identity({ rowHash: "hash-hotel", transactionDate: "2026-08-20", amountCents: 18000 });

  const firstFile = [lunch, fuel, coffee];
  const secondFile = [lunch, fuel, coffee, coffee, hotel];

  it("skips what the first file already stored and keeps what is new", () => {
    const result = checkDuplicates({ rows: secondFile, existingRows: firstFile });
    expect(result.map((row) => row.isDuplicate)).toEqual([true, true, true, false, false]);
  });

  it("keeps the second coffee as occurrence 2, so its Ref no. differs from the first", () => {
    const result = checkDuplicates({ rows: secondFile, existingRows: firstFile });
    expect(result[3]).toMatchObject({ rowHash: "hash-coffee", occurrence: 2, isDuplicate: false });
  });

  it("does not flag the second coffee as a possible duplicate of the first, which has the same hash", () => {
    const result = checkDuplicates({ rows: secondFile, existingRows: firstFile });
    expect(result[3]?.possibleDuplicateOfHash).toBeNull();
  });

  it("finds nothing new when the same file is imported twice", () => {
    const result = checkDuplicates({ rows: secondFile, existingRows: secondFile });
    expect(result.every((row) => row.isDuplicate)).toBe(true);
  });
});
