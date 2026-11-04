import { describe, expect, it } from "vitest";
import {
  pickActiveVendors,
  sortVendorsByName,
  summarizeVendor,
} from "@/app/qbo/vendor/_lib/qboVendorUtils";
import { QboVendor, QboVendorSummary } from "@/app/qbo/vendor/types/QboVendorTypes";

function makeVendor(overrides: Partial<QboVendor> = {}): QboVendor {
  return {
    Id: "1",
    SyncToken: "0",
    DisplayName: "Hicks Hardware",
    Active: true,
    ...overrides,
  };
}

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

describe("summarizeVendor", () => {
  it("keeps only the five fields the mapping screen needs", () => {
    const summary = summarizeVendor(
      makeVendor({ Id: "41", SyncToken: "2", CompanyName: "Hicks Hardware Co" }),
    );
    expect(summary).toEqual({
      Id: "41",
      SyncToken: "2",
      DisplayName: "Hicks Hardware",
      Active: true,
      CompanyName: "Hicks Hardware Co",
    });
  });

  it("drops everything else, including private fields QuickBooks returns", () => {
    // Fields Intuit returns that must never reach the browser. They are not on QboVendor
    // (they are commented out there), so this builds the object the way a response arrives.
    const response = {
      ...makeVendor(),
      TaxIdentifier: "XXXXXXX6789",
      Balance: 390,
      PrimaryEmailAddr: { Address: "books@example.com" },
      PrimaryPhone: { FreeFormNumber: "(650) 555-7745" },
      BillAddr: { Line1: "15 Main St." },
    } as QboVendor;
    expect(Object.keys(summarizeVendor(response)).sort()).toEqual(
      ["Active", "CompanyName", "DisplayName", "Id", "SyncToken"].sort(),
    );
  });

  it("treats a vendor with no Active field as active, the way QuickBooks does", () => {
    const summary = summarizeVendor(makeVendor({ Active: undefined }));
    expect(summary.Active).toBe(true);
  });

  it("keeps an explicit inactive status", () => {
    expect(summarizeVendor(makeVendor({ Active: false })).Active).toBe(false);
  });

  it("uses null when there is no company name", () => {
    expect(summarizeVendor(makeVendor()).CompanyName).toBeNull();
  });
});

describe("sortVendorsByName", () => {
  it("sorts by display name, ignoring case", () => {
    const vendors = [
      makeSummary({ Id: "1", DisplayName: "walmart" }),
      makeSummary({ Id: "2", DisplayName: "Amazon" }),
      makeSummary({ Id: "3", DisplayName: "Home Depot" }),
    ];
    expect(sortVendorsByName(vendors).map((vendor) => vendor.DisplayName)).toEqual([
      "Amazon",
      "Home Depot",
      "walmart",
    ]);
  });

  it("does not change the list it was given", () => {
    const vendors = [
      makeSummary({ Id: "1", DisplayName: "B" }),
      makeSummary({ Id: "2", DisplayName: "A" }),
    ];
    sortVendorsByName(vendors);
    expect(vendors.map((vendor) => vendor.DisplayName)).toEqual(["B", "A"]);
  });

  it("returns an empty list for no vendors", () => {
    expect(sortVendorsByName([])).toEqual([]);
  });
});

describe("pickActiveVendors", () => {
  it("drops inactive vendors", () => {
    const active = makeSummary({ Id: "1" });
    const inactive = makeSummary({ Id: "2", Active: false });
    expect(pickActiveVendors([active, inactive])).toEqual([active]);
  });

  it("returns an empty list when every vendor is inactive", () => {
    expect(pickActiveVendors([makeSummary({ Active: false })])).toEqual([]);
  });
});
