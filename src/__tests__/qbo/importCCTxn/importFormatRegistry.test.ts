import { describe, expect, it } from "vitest";
import { detectImportFormat } from "@/app/qbo/importCCTxn/_lib/importFormatRegistry";
import { chaseFormat } from "@/app/qbo/importCCTxn/_lib/formats/chaseFormat";
import { capitalOneFormat } from "@/app/qbo/importCCTxn/_lib/formats/capitalOneFormat";

function detectedId(headers: string[]): string | null {
  const detection = detectImportFormat(headers);
  return detection.success ? detection.format.id : null;
}

function detectionError(headers: string[]): string {
  const detection = detectImportFormat(headers);
  if (detection.success) throw new Error("Expected the header to be rejected.");
  return detection.error;
}

describe("detectImportFormat: exact matches", () => {
  it("recognizes the Chase header", () => {
    expect(detectedId(chaseFormat.columns)).toBe("chase");
  });

  it("recognizes the Capital One header", () => {
    expect(detectedId(capitalOneFormat.columns)).toBe("capitalOne");
  });

  it("ignores column order", () => {
    expect(detectedId([...chaseFormat.columns].reverse())).toBe("chase");
    expect(detectedId([...capitalOneFormat.columns].reverse())).toBe("capitalOne");
  });
});

describe("detectImportFormat: a known format whose columns changed", () => {
  it("names the format and lists an added column", () => {
    const error = detectionError([...chaseFormat.columns, "Reference"]);
    expect(error).toContain("This looks like a Chase import, but the columns have changed.");
    expect(error).toContain('Added: "Reference".');
    expect(error).not.toContain("Missing:");
  });

  it("lists a missing column", () => {
    const error = detectionError(capitalOneFormat.columns.filter((column) => column !== "Category"));
    expect(error).toContain("This looks like a Capital One import, but the columns have changed.");
    expect(error).toContain('Missing: "Category".');
    expect(error).not.toContain("Added:");
  });

  it("lists both when a column was renamed", () => {
    const renamed = chaseFormat.columns.map((column) => (column === "Post Date" ? "Posted On" : column));
    const error = detectionError(renamed);
    expect(error).toContain('Added: "Posted On".');
    expect(error).toContain('Missing: "Post Date".');
  });

  it("is case-sensitive, so a lowercase header counts as changed", () => {
    const lowered = chaseFormat.columns.map((column) => (column === "Card" ? "card" : column));
    const error = detectionError(lowered);
    expect(error).toContain('Added: "card".');
    expect(error).toContain('Missing: "Card".');
  });

  it("says the importer must be updated", () => {
    expect(detectionError([...chaseFormat.columns, "Extra"])).toContain(
      "The importer must be updated before this file can be used.",
    );
  });

  it("still reports the close format when exactly half the columns are shared", () => {
    // Chase has 8 columns, so sharing 4 of them is the threshold.
    const half = [...chaseFormat.columns.slice(0, 4), "A", "B", "C", "D"];
    expect(detectionError(half)).toContain("looks like a Chase import");
  });

  it("calls it unrecognized when fewer than half the columns are shared", () => {
    const fewer = [...chaseFormat.columns.slice(0, 3), "A", "B", "C", "D", "E"];
    expect(detectionError(fewer)).toContain("Unrecognized CSV columns");
  });
});

describe("detectImportFormat: an unknown header", () => {
  it("lists the columns it saw and the known formats", () => {
    const error = detectionError(["Date", "Merchant", "Total"]);
    expect(error).toContain('Unrecognized CSV columns: "Date", "Merchant", "Total".');
    expect(error).toContain("Known formats: Capital One, Chase.");
  });

  it("rejects a header that shares too few columns with any format", () => {
    const error = detectionError(["Transaction Date", "Description", "Foo", "Bar", "Baz", "Qux"]);
    expect(error).toContain("Unrecognized CSV columns");
  });

  it("rejects an empty header", () => {
    expect(detectionError([])).toContain("Unrecognized CSV columns");
  });
});
