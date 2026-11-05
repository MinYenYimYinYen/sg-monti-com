import { describe, expect, it } from "vitest";
import { checkDuplicates } from "@/app/qbo/importCCTxn/_lib/importDuplicates";
import { RowIdentity } from "@/app/qbo/importCCTxn/types/ImportCCTxnTypes";

function identity(overrides: Partial<RowIdentity> = {}): RowIdentity {
  return {
    rowHash: "hash-stored",
    last4: "2238",
    transactionDate: "2026-08-15",
    amountCents: 500,
    ...overrides,
  };
}

describe("checkDuplicates: possible duplicates (same card, amount and date, different hash)", () => {
  const stored = identity({ rowHash: "hash-stored" });

  it("flags a new row that matches a stored row's card, amount and date but not its hash", () => {
    const [result] = checkDuplicates({
      rows: [identity({ rowHash: "hash-new" })],
      existingRows: [stored],
    });
    expect(result).toMatchObject({ isDuplicate: false, possibleDuplicateOfHash: "hash-stored" });
  });

  it("does not flag a different card", () => {
    const [result] = checkDuplicates({
      rows: [identity({ rowHash: "hash-new", last4: "3201" })],
      existingRows: [stored],
    });
    expect(result?.possibleDuplicateOfHash).toBeNull();
  });

  it("does not flag a different amount", () => {
    const [result] = checkDuplicates({
      rows: [identity({ rowHash: "hash-new", amountCents: 501 })],
      existingRows: [stored],
    });
    expect(result?.possibleDuplicateOfHash).toBeNull();
  });

  it("does not flag a different date", () => {
    const [result] = checkDuplicates({
      rows: [identity({ rowHash: "hash-new", transactionDate: "2026-08-16" })],
      existingRows: [stored],
    });
    expect(result?.possibleDuplicateOfHash).toBeNull();
  });

  it("never flags a row that is a certain duplicate", () => {
    const lookalike = identity({ rowHash: "hash-other" });
    const [result] = checkDuplicates({ rows: [stored], existingRows: [stored, lookalike] });
    expect(result).toMatchObject({ isDuplicate: true, possibleDuplicateOfHash: null });
  });

  it("does not treat a row's own stored twin as a lookalike", () => {
    // The file holds two of the same row and one is stored. The second is new, and the only
    // stored row with its card, amount and date is its own twin, which has the same hash.
    const result = checkDuplicates({ rows: [stored, stored], existingRows: [stored] });
    expect(result[1]).toMatchObject({ isDuplicate: false, possibleDuplicateOfHash: null });
  });

  it("compares new rows with stored rows only, never with each other within one file", () => {
    // Every row in a file is a posted transaction from the card company, even if two look alike.
    const result = checkDuplicates({
      rows: [identity({ rowHash: "hash-first" }), identity({ rowHash: "hash-second" })],
      existingRows: [],
    });
    expect(result.map((row) => row.possibleDuplicateOfHash)).toEqual([null, null]);
  });

  it("flags every lookalike row in the file against the stored one", () => {
    const result = checkDuplicates({
      rows: [identity({ rowHash: "hash-a" }), identity({ rowHash: "hash-b" })],
      existingRows: [stored],
    });
    expect(result.map((row) => row.possibleDuplicateOfHash)).toEqual(["hash-stored", "hash-stored"]);
  });
});
