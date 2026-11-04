import { describe, expect, it } from "vitest";
import {
  buildPurchaseWhere,
  monthToDateRange,
  toIsoDate,
  validatePurchaseRange,
} from "@/app/qbo/purchase/_lib/qboPurchaseUtils";

const BAD_DATES = /Enter a start and end date/;

describe("validatePurchaseRange", () => {
  const maxDays = 366;

  function check(startDate: string, endDate: string) {
    return validatePurchaseRange({ range: { startDate, endDate }, maxDays });
  }

  it("accepts a normal range", () => {
    expect(check("2026-10-01", "2026-10-31")).toBeNull();
  });

  it("accepts a single day", () => {
    expect(check("2026-10-01", "2026-10-01")).toBeNull();
  });

  it("accepts exactly the maximum number of days", () => {
    expect(check("2026-01-01", "2027-01-01")).toBeNull();
  });

  it("rejects one day more than the maximum", () => {
    expect(check("2026-01-01", "2027-01-02")).toMatch(/at most 366 days/);
  });

  it("rejects a start after the end", () => {
    expect(check("2026-10-31", "2026-10-01")).toMatch(/on or before/);
  });

  it("rejects blank dates", () => {
    expect(check("", "2026-10-01")).toMatch(BAD_DATES);
    expect(check("2026-10-01", "")).toMatch(BAD_DATES);
  });

  it("rejects dates that are not in YYYY-MM-DD form", () => {
    expect(check("10/01/2026", "10/31/2026")).toMatch(BAD_DATES);
  });

  it("rejects a date that does not exist", () => {
    expect(check("2026-02-31", "2026-03-05")).toMatch(BAD_DATES);
  });

  it("rejects anything that could change the meaning of the query text", () => {
    expect(check("2026-10-01' OR Id > '0", "2026-10-31")).toMatch(BAD_DATES);
    expect(check("2026-10-01", "2026-10-31'; --")).toMatch(BAD_DATES);
  });

  it("accepts a leap day only in a leap year", () => {
    expect(check("2028-02-29", "2028-03-01")).toBeNull();
    expect(check("2027-02-29", "2027-03-01")).toMatch(BAD_DATES);
  });
});

describe("buildPurchaseWhere", () => {
  it("compares TxnDate against both ends of the range", () => {
    expect(buildPurchaseWhere({ startDate: "2026-10-01", endDate: "2026-10-31" })).toBe(
      "TxnDate >= '2026-10-01' AND TxnDate <= '2026-10-31'",
    );
  });
});

describe("toIsoDate and monthToDateRange", () => {
  it("formats a local date with zero padding", () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("does not shift the date when the time is late in the evening", () => {
    expect(toIsoDate(new Date(2026, 10, 4, 23, 59))).toBe("2026-11-04");
  });

  it("runs from the first of the month through today", () => {
    expect(monthToDateRange(new Date(2026, 10, 4, 15, 30))).toEqual({
      startDate: "2026-11-01",
      endDate: "2026-11-04",
    });
  });

  it("gives a range that passes validation", () => {
    const range = monthToDateRange(new Date(2026, 10, 4));
    expect(validatePurchaseRange({ range, maxDays: 366 })).toBeNull();
  });
});
