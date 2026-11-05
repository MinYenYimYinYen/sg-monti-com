import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { parseImportCsvText } from "@/app/qbo/importCCTxn/_lib/importCsvParser";
import {
  CAPITAL_ONE_HEADER,
  capitalOneLine,
  CHASE_HEADER,
  chaseLine,
  csvText,
  parseErrors,
  parseRows,
} from "@/__tests__/qbo/importCCTxn/csvTestHelpers";

// The sample files are the redacted bank exports kept beside the plan. Reading them here means
// the tests fail if the importer stops accepting what the banks actually send.
const SAMPLE_DIR = path.resolve(__dirname, "../../../app/qbo/planning/sampleData");
const readSample = (name: string) => readFileSync(path.join(SAMPLE_DIR, name), "utf8");

describe("parseImportCsvText: the sample bank exports", () => {
  it("parses the Capital One sample into five rows with the right kinds", () => {
    const result = parseImportCsvText(readSample("CapitalOne Sample.csv"));
    if (!result.success) throw new Error(result.errors.join(" | "));

    expect(result.formatId).toBe("capitalOne");
    expect(result.formatLabel).toBe("Capital One");
    expect(result.rows.map((row) => row.kind)).toEqual([
      "charge",
      "charge",
      "charge",
      "refund",
      "charge",
    ]);
    expect(result.rows.map((row) => row.amountCents)).toEqual([9591, 2146, 9501, 58500, 6299]);
    expect(result.rows.map((row) => row.rowNumber)).toEqual([2, 3, 4, 5, 6]);
  });

  it("parses the Chase sample into five rows with the right kinds", () => {
    const result = parseImportCsvText(readSample("Chase Sample.csv"));
    if (!result.success) throw new Error(result.errors.join(" | "));

    expect(result.formatId).toBe("chase");
    expect(result.rows.map((row) => row.kind)).toEqual([
      "charge",
      "charge",
      "payment",
      "charge",
      "charge",
    ]);
    expect(result.rows.map((row) => row.last4)).toEqual(["3201", "3335", "2636", "3335", "3201"]);
    expect(result.rows.map((row) => row.amountCents)).toEqual([5368, 1584, 56216, 25601, 9095]);
  });

  it("tags every row with its format", () => {
    const rows = parseRows(readSample("Chase Sample.csv"));
    expect(rows.every((row) => row.formatId === "chase")).toBe(true);
  });

  it("converts dates to ISO", () => {
    const [first] = parseRows(readSample("CapitalOne Sample.csv"));
    expect(first).toMatchObject({ transactionDate: "2026-10-27", postedDate: "2026-10-28" });
  });
});

describe("parseImportCsvText: header handling", () => {
  it("ignores a UTF-8 byte order mark on the first header, which Excel adds when saving a CSV", () => {
    const text = `\uFEFF${csvText(CHASE_HEADER, chaseLine())}`;
    expect(parseRows(text)).toHaveLength(1);
  });

  it("trims spaces around header names", () => {
    const padded = CHASE_HEADER.split(",").map((name) => ` ${name} `).join(",");
    expect(parseRows(csvText(padded, chaseLine()))).toHaveLength(1);
  });

  it("accepts the columns in any order", () => {
    const reversedHeader = CAPITAL_ONE_HEADER.split(",").reverse().join(",");
    const reversedLine = capitalOneLine().split(",").reverse().join(",");
    expect(parseRows(csvText(reversedHeader, reversedLine))[0]).toMatchObject({
      formatId: "capitalOne",
      amountCents: 9591,
    });
  });

  it("reports a changed header with the importer's changed-columns message", () => {
    const errors = parseErrors(csvText(`${CHASE_HEADER},Extra`, `${chaseLine()},x`));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("This looks like a Chase import, but the columns have changed.");
  });

  it("reports an unknown header with the columns it saw", () => {
    const errors = parseErrors(csvText("Date,Total", "10/01/2026,5.00"));
    expect(errors[0]).toContain('Unrecognized CSV columns: "Date", "Total"');
  });

  it("rejects an empty file", () => {
    expect(parseErrors("")).toEqual(["The file has no header row."]);
  });

  it("rejects a file with a header and no transactions", () => {
    expect(parseErrors(CHASE_HEADER)).toEqual(["The file has no transaction rows."]);
  });
});
