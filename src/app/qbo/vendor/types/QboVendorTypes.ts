import { QboModificationMetaData } from "@/app/qbo/_lib/types/QboCommonTypes";

// Intuit's Vendor entity, written from the Vendor reference page (minor version 75, confirmed
// by the user). Every documented field is listed. Fields we do not use are commented out so
// the full surface stays visible. Shapes for the commented fields are in QboCommonTypes and
// QboContactTypes; import them when enabling a field.
//
// Privacy: a Vendor response also carries addresses, phone numbers, emails, the masked
// TaxIdentifier and Balance. The server loader passes the browser only the fields the mapping
// screen needs (see "Loading reference data" in planning/qboPlan.md).
//
// Business rules from the page: DisplayName must be unique across all Customer, Employee and
// Vendor objects (error 6240 when it is not). DisplayName, Title, GivenName, MiddleName,
// FamilyName, Suffix and PrintOnCheckName must not contain a colon, tab or newline.

export type QboVendor = {
  Id: string;
  SyncToken: string;
  DisplayName: string;
  /** Documented optional. The samples always include it. Inactive vendors cannot be posted to. */
  Active?: boolean;
  CompanyName?: string;
  GivenName?: string;
  FamilyName?: string;
  /** Name or number of the account associated with this vendor. */
  AcctNum?: string;
  PrintOnCheckName?: string;
  MetaData?: QboModificationMetaData;

  // Unused fields.
  // Title?: string;
  // MiddleName?: string;
  // Suffix?: string;
  // PrimaryEmailAddr?: QboEmailAddress;
  // OtherContactInfo?: ContactInfo; // Intuit names this type without defining it.
  // TermRef?: QboReference;
  // Source?: string; // Valid value: QBCommerce.
  // T4AEligible?: boolean; // CA locale only.
  // Fax?: QboTelephoneNumber;
  // CurrencyRef?: QboCurrencyRef; // Cannot be changed once set.
  // Mobile?: QboTelephoneNumber;
  // PrimaryPhone?: QboTelephoneNumber;
  // AlternatePhone?: QboTelephoneNumber;
  // Vendor1099?: boolean;
  // CostRate?: number;
  // BillRate?: number;
  // WebAddr?: QboWebSiteAddress;
  // T5018Eligible?: boolean; // CA locale only.
  // VendorPaymentBankDetail?: VendorPaymentBankDetail; // Intuit names this type without defining it.
  // TaxIdentifier?: string; // Masked in responses (last four characters only). Sensitive.
  // HasTPAR?: boolean; // AU locale only.
  // BillAddr?: QboPhysicalAddress;
  // Balance?: number; // Read only. Not needed for mapping, so it stays on the server.
  // domain?: string; // In responses, undocumented. Always "QBO".
  // sparse?: boolean; // In responses, undocumented.
};

/**
 * What the browser gets: the few fields the mapping screen needs, cut down on the server (see
 * the privacy note at the top). Our own shape, so it is the one place these types are not
 * Intuit's. `Active` is true when QuickBooks omits it, which is how QuickBooks treats it.
 */
export type QboVendorSummary = {
  Id: string;
  SyncToken: string;
  DisplayName: string;
  Active: boolean;
  CompanyName: string | null;
};

/**
 * The fields we would send to create a vendor (Phase E). Intuit's minimum is a DisplayName or
 * a name part. We always send DisplayName, because it is what the user picks and must be unique.
 */
export type QboVendorCreate = {
  DisplayName: string;
  // CompanyName?: string;
  // PrintOnCheckName?: string; // Defaults to DisplayName when omitted.
};
