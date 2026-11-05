import { describe, expect, it } from "vitest";
import {
  collapseWhitespace,
  parseIsoDate,
  parseLast4,
  parseMoneyToCents,
  parseUsDateToIso,
} from "@/app/qbo/importCCTxn/_lib/importCsvValues";

describe("parseIsoDate", () => {
  it.each(["2026-10-27", "2026-01-05", "2026-12-31", "2028-02-29"])("accepts %s as it is", (raw) => {
    expect(parseIsoDate(raw)).toBe(raw);
  });

  it("trims surrounding spaces", () => {
    expect(parseIsoDate(" 2026-10-27 ")).toBe("2026-10-27");
  });

  it("accepts February 29 in a leap year only", () => {
    expect(parseIsoDate("2028-02-29")).toBe("2028-02-29");
    expect(parseIsoDate("2026-02-29")).toBeNull();
  });

  it.each(["2026-02-30", "2026-04-31", "2026-13-01", "2026-00-10", "2026-10-00", "2026-10-32"])(
    "rejects the impossible date %s",
    (raw) => {
      expect(parseIsoDate(raw)).toBeNull();
    },
  );

  it.each(["", "10/27/2026", "2026/10/27", "2026-1-5", "26-10-27", "20261027", "2026-10-27T00:00:00"])(
    "rejects the wrong format %j",
    (raw) => {
      expect(parseIsoDate(raw)).toBeNull();
    },
  );
});

describe("parseUsDateToIso", () => {
  it.each([
    ["10/27/2026", "2026-10-27"],
    ["1/5/2026", "2026-01-05"],
    ["01/05/2026", "2026-01-05"],
    ["12/31/2026", "2026-12-31"],
    [" 10/27/2026 ", "2026-10-27"],
  ])("reads %s as %s", (raw, iso) => {
    expect(parseUsDateToIso(raw)).toBe(iso);
  });

  it("accepts February 29 in a leap year only", () => {
    expect(parseUsDateToIso("02/29/2028")).toBe("2028-02-29");
    expect(parseUsDateToIso("02/29/2026")).toBeNull();
  });

  it.each(["02/30/2026", "04/31/2026", "13/01/2026", "00/10/2026", "10/00/2026", "10/32/2026"])(
    "rejects the impossible date %s",
    (raw) => {
      expect(parseUsDateToIso(raw)).toBeNull();
    },
  );

  it.each(["", "2026-10-27", "10-27-2026", "10/27/26", "October 27", "10/27", "10/27/2026/1"])(
    "rejects the wrong format %j",
    (raw) => {
      expect(parseUsDateToIso(raw)).toBeNull();
    },
  );
});

describe("parseMoneyToCents", () => {
  it.each([
    ["95.01", 9501],
    ["-53.68", -5368],
    ["562.16", 56216],
    ["585", 58500],
    ["0.29", 29],
    ["1.15", 115],
    ["19.99", 1999],
    ["8.2", 820],
    ["0.5", 50],
    ["$1,234.56", 123456],
    ["-$1,234.56", -123456],
    [" 21.46 ", 2146],
  ])("reads %s as %i cents", (raw, cents) => {
    expect(parseMoneyToCents(raw)).toBe(cents);
  });

  it("reads zero as zero, never negative zero", () => {
    expect(Object.is(parseMoneyToCents("0.00"), 0)).toBe(true);
    expect(Object.is(parseMoneyToCents("-0.00"), 0)).toBe(true);
  });

  it.each(["", "abc", "12.345", "1.2.3", "--5", "5-", "12,34,56x", ".50", "(5.00)", "1e3"])(
    "rejects %j",
    (raw) => {
      expect(parseMoneyToCents(raw)).toBeNull();
    },
  );
});

describe("parseLast4", () => {
  it("accepts exactly four digits, trimmed", () => {
    expect(parseLast4("2238")).toBe("2238");
    expect(parseLast4(" 0042 ")).toBe("0042");
  });

  it.each(["", "123", "12345", "22a8", "XXXX", "2238 2238"])("rejects %j", (raw) => {
    expect(parseLast4(raw)).toBeNull();
  });
});

describe("collapseWhitespace", () => {
  it("trims and collapses runs of any whitespace into one space", () => {
    expect(collapseWhitespace("  AMAZON   MKTPL*VQ0ST9ZQ3 ")).toBe("AMAZON MKTPL*VQ0ST9ZQ3");
    expect(collapseWhitespace("A\t\tB\nC")).toBe("A B C");
  });

  it("returns an empty string for blank input", () => {
    expect(collapseWhitespace("   ")).toBe("");
  });
});
