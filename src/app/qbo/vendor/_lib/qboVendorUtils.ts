import { QboVendor, QboVendorSummary } from "@/app/qbo/vendor/types/QboVendorTypes";
import { normalizeQboName } from "@/app/qbo/_lib/qboNameUtils";

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

// Creating a vendor

/** Trims and collapses runs of whitespace, which also turns a pasted tab or line break into a space. */
export function normalizeVendorName(name: string): string {
  return normalizeQboName(name);
}

/** A message for the user, or null when the name may be sent. Intuit forbids a colon in a DisplayName. */
export function validateVendorName(name: string): string | null {
  if (normalizeVendorName(name).length === 0) return "Enter a vendor name.";
  if (name.includes(":")) return "A vendor name cannot contain a colon.";
  return null;
}

/**
 * The vendor with this name, ignoring case and extra spaces, which is how QuickBooks decides a
 * name is taken. An active vendor wins if there is more than one match. Compares in memory, so
 * a name with an apostrophe never goes into a query.
 */
export function findVendorByName({
  vendors,
  displayName,
}: {
  vendors: QboVendorSummary[];
  displayName: string;
}): QboVendorSummary | null {
  const wanted = normalizeVendorName(displayName).toLowerCase();
  if (wanted.length === 0) return null;
  const matches = vendors.filter(
    (vendor) => normalizeVendorName(vendor.DisplayName).toLowerCase() === wanted,
  );
  return matches.find((vendor) => vendor.Active) ?? matches[0] ?? null;
}

/** Keeps the session's vendor list in step after a create. A vendor already listed is left alone. */
export function addVendorToList({
  vendors,
  vendor,
}: {
  vendors: QboVendorSummary[];
  vendor: QboVendorSummary;
}): QboVendorSummary[] {
  if (vendors.some((existing) => existing.Id === vendor.Id)) return vendors;
  return sortVendorsByName([...vendors, vendor]);
}

/** The error codes qboHttp keeps on an AppError's data, as strings (JSON may deliver numbers). */
export function readFaultCodes(data: unknown): string[] {
  const errors = (data as { errors?: unknown } | null | undefined)?.errors;
  if (!Array.isArray(errors)) return [];
  return errors
    .map((error) => (error as { code?: unknown } | null)?.code)
    .filter((code) => code !== undefined && code !== null)
    .map((code) => String(code));
}

/**
 * What a failed create request means. 6240 is Intuit's duplicate name error, which also covers a
 * customer or employee with the same name. A network error or a server error may have happened
 * after the vendor was saved, so the outcome is uncertain and is settled by reading the vendors
 * again. Anything else was rejected before anything was created.
 */
export type VendorCreateFailure = "duplicateName" | "uncertain" | "rejected";

export function classifyVendorCreateFailure({
  type,
  statusCode,
  faultCodes,
}: {
  type: string;
  statusCode: number;
  faultCodes: string[];
}): VendorCreateFailure {
  if (faultCodes.includes("6240")) return "duplicateName";
  if (type === "NETWORK_ERROR" || statusCode >= 500) return "uncertain";
  return "rejected";
}
