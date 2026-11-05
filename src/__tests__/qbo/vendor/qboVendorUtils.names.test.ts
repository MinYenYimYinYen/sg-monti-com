import { describe, expect, it } from "vitest";
import {
  addVendorToList,
  findVendorByName,
  normalizeVendorName,
  validateVendorName,
} from "@/app/qbo/vendor/_lib/qboVendorUtils";
import { QboVendorSummary } from "@/app/qbo/vendor/types/QboVendorTypes";

function makeSummary(overrides: Partial<QboVendorSummary> = {}): QboVendorSummary {
  return {
    Id: "1",
    SyncToken: "0",
    DisplayName: "Hicks Hardware",
    Active: true,
    CompanyName: null,
    ...overrides,
  };
}

describe("normalizeVendorName", () => {
  it("trims and collapses runs of whitespace into one space", () => {
    expect(normalizeVendorName("  Home   Depot ")).toBe("Home Depot");
  });

  it("turns a tab or line break into a space", () => {
    expect(normalizeVendorName("Home\tDepot\nStore")).toBe("Home Depot Store");
  });

  it("keeps capital letters exactly as typed", () => {
    expect(normalizeVendorName("McDonald's")).toBe("McDonald's");
  });

  it("returns an empty string for blank input", () => {
    expect(normalizeVendorName("   ")).toBe("");
  });
});

describe("validateVendorName", () => {
  it("accepts an ordinary name, with an apostrophe or an ampersand", () => {
    expect(validateVendorName("Lowe's")).toBeNull();
    expect(validateVendorName("Smith & Sons")).toBeNull();
  });

  it("rejects a blank name", () => {
    expect(validateVendorName("   ")).toBe("Enter a vendor name.");
    expect(validateVendorName("")).toBe("Enter a vendor name.");
  });

  it("rejects a colon, which Intuit forbids in a DisplayName", () => {
    expect(validateVendorName("Parent: Child")).toBe("A vendor name cannot contain a colon.");
  });
});

describe("findVendorByName", () => {
  const vendors = [
    makeSummary({ Id: "1", DisplayName: "Amazon" }),
    makeSummary({ Id: "2", DisplayName: "Lowe's" }),
    makeSummary({ Id: "3", DisplayName: "Old Supply Co", Active: false }),
  ];

  it("finds a vendor ignoring case", () => {
    expect(findVendorByName({ vendors, displayName: "AMAZON" })?.Id).toBe("1");
  });

  it("finds a vendor ignoring extra spaces", () => {
    expect(findVendorByName({ vendors, displayName: "  amazon  " })?.Id).toBe("1");
  });

  it("finds a name with an apostrophe without any query escaping", () => {
    expect(findVendorByName({ vendors, displayName: "lowe's" })?.Id).toBe("2");
  });

  it("finds an inactive vendor, so the caller can say it is inactive", () => {
    const found = findVendorByName({ vendors, displayName: "old supply co" });
    expect(found).toMatchObject({ Id: "3", Active: false });
  });

  it("prefers the active vendor when an inactive one has the same name", () => {
    const duplicates = [
      makeSummary({ Id: "8", DisplayName: "Shell", Active: false }),
      makeSummary({ Id: "9", DisplayName: "SHELL", Active: true }),
    ];
    expect(findVendorByName({ vendors: duplicates, displayName: "shell" })?.Id).toBe("9");
  });

  it("does not match a name that only contains the typed text", () => {
    expect(findVendorByName({ vendors, displayName: "Amaz" })).toBeNull();
    expect(findVendorByName({ vendors, displayName: "Amazon Web Services" })).toBeNull();
  });

  it("returns null for a blank name, never the first vendor", () => {
    expect(findVendorByName({ vendors, displayName: "   " })).toBeNull();
  });

  it("returns null when there are no vendors", () => {
    expect(findVendorByName({ vendors: [], displayName: "Amazon" })).toBeNull();
  });
});

describe("addVendorToList", () => {
  it("adds a new vendor and keeps the list sorted by name", () => {
    const vendors = [
      makeSummary({ Id: "1", DisplayName: "Amazon" }),
      makeSummary({ Id: "2", DisplayName: "Walmart" }),
    ];
    const result = addVendorToList({
      vendors,
      vendor: makeSummary({ Id: "3", DisplayName: "Home Depot" }),
    });
    expect(result.map((vendor) => vendor.DisplayName)).toEqual(["Amazon", "Home Depot", "Walmart"]);
  });

  it("leaves the list alone when the vendor is already in it", () => {
    const vendors = [makeSummary({ Id: "1", DisplayName: "Amazon" })];
    const result = addVendorToList({ vendors, vendor: makeSummary({ Id: "1" }) });
    expect(result).toBe(vendors);
  });

  it("does not change the list it was given", () => {
    const vendors = [makeSummary({ Id: "1", DisplayName: "Amazon" })];
    addVendorToList({ vendors, vendor: makeSummary({ Id: "2", DisplayName: "Zed" }) });
    expect(vendors).toHaveLength(1);
  });
});
