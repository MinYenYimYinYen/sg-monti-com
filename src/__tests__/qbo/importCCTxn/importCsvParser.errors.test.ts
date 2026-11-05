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

describe("parseImportCsvText: row numbers in errors", () => {
  it("counts the header as line 1, so the first data row is row 2", () => {
    const errors = parseErrors(csvText(CHASE_HEADER, chaseLine({ card: "x" })));
    expect(errors).toEqual(['Row 2: Card "x" is not a 4-digit card number']);
  });

  it("names the row that is bad, matching the spreadsheet line", () => {
    const errors = parseErrors(
      csvText(CHASE_HEADER, chaseLine(), chaseLine(), chaseLine({ amount: "abc" }), chaseLine()),
    );
    expect(errors).toEqual(['Row 4: Amount "abc" is not a valid amount']);
  });

  it("collects every problem from every bad row, in file order", () => {
    const errors = parseErrors(
      csvText(
        CHASE_HEADER,
        chaseLine({ card: "x" }),
        chaseLine(),
        chaseLine({ type: "Fee" }),
        chaseLine({ transactionDate: "13/13/2026" }),
      ),
    );
    expect(errors.map((error) => error.slice(0, 5))).toEqual(["Row 2", "Row 4", "Row 5"]);
  });

  it("fails the whole file when only one row is bad, on purpose", () => {
    const result = parseImportCsvText(
      csvText(CAPITAL_ONE_HEADER, capitalOneLine(), capitalOneLine(), capitalOneLine({ card: "1" })),
    );
    expect(result.success).toBe(false);
  });

  it("reports a row with the wrong number of fields against its own row number", () => {
    const errors = parseErrors(csvText(CHASE_HEADER, "3201,10/21/2026"));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.every((error) => error.startsWith("Row 2:"))).toBe(true);
  });

  it("reports a quoted field that never closes", () => {
    const errors = parseErrors(csvText(CHASE_HEADER, chaseLine(), '3201,10/21/2026,"unterminated'));
    expect(errors.some((error) => error.startsWith("Row 3:"))).toBe(true);
  });
});

describe("parseImportCsvText: blank lines", () => {
  it("skips a trailing blank line, which bank exports end with", () => {
    expect(parseRows(`${csvText(CHASE_HEADER, chaseLine())}\n\n`)).toHaveLength(1);
  });

  // Blank lines are dropped before rows are counted, so a row after one is numbered by its
  // position among data rows, not by its physical line. This pins that down so a change to it is
  // deliberate. Banks do not send blank lines in the middle of a file.
  it("numbers rows after a blank line by position among data rows", () => {
    const rows = parseRows(csvText(CHASE_HEADER, chaseLine(), "", chaseLine()));
    expect(rows.map((row) => row.rowNumber)).toEqual([2, 3]);
  });
});

describe("parseImportCsvText: quoted fields and line endings", () => {
  it("keeps a comma inside a quoted description", () => {
    const text = csvText(CHASE_HEADER, chaseLine({ description: '"HOME DEPOT, STORE 12"' }));
    expect(parseRows(text)[0]?.description).toBe("HOME DEPOT, STORE 12");
  });

  it("accepts Windows line endings", () => {
    const text = [CHASE_HEADER, chaseLine(), chaseLine()].join("\r\n");
    expect(parseRows(text)).toHaveLength(2);
  });
});
