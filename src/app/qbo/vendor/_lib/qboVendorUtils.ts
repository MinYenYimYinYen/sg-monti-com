import { QboVendor, QboVendorSummary } from "@/app/qbo/vendor/types/QboVendorTypes";

// Pure helpers for vendors, free of fetch and the database so they can be tested.

/** Keeps only what may reach the browser. Addresses, phones, emails, TaxIdentifier and Balance stay behind. */
export function summarizeVendor(vendor: QboVendor): QboVendorSummary {
  return {
    Id: vendor.Id,
    SyncToken: vendor.SyncToken,
    DisplayName: vendor.DisplayName,
    Active: vendor.Active ?? true,
    CompanyName: vendor.CompanyName ?? null,
  };
}

/** Case-insensitive, so "amazon" and "Amazon" sort together. Returns a new list. */
export function sortVendorsByName(vendors: QboVendorSummary[]): QboVendorSummary[] {
  return [...vendors].sort((a, b) =>
    a.DisplayName.localeCompare(b.DisplayName, undefined, { sensitivity: "base" }),
  );
}

/** Callers that offer a choice use this. Inactive vendors are rejected on a purchase (errors 610 and 2500). */
export function pickActiveVendors(vendors: QboVendorSummary[]): QboVendorSummary[] {
  return vendors.filter((vendor) => vendor.Active);
}
