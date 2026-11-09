import { QboModificationMetaData, QboReference } from "@/app/qbo/_lib/types/QboCommonTypes";

// Intuit's Customer entity, written from the Customer reference page (minor version 75). Every
// documented field is listed. Fields we do not use are commented out so the full surface stays
// visible. Shapes for the commented fields are in QboCommonTypes and QboContactTypes; import
// them when enabling a field.
//
// Read-only in this app. We read customers only to offer a name for Accounts Receivable lines,
// which QuickBooks requires to carry a Customer. No create or update shapes are modeled.
//
// Privacy: a Customer response also carries addresses, phone numbers, emails, masked tax
// identifiers and balances. The server loader passes the browser only the fields the mapping
// screen needs (see QboCustomerSummary).
//
// Business rules from the page: DisplayName must be unique across all Customer, Vendor and
// Employee objects. A customer can be a top level customer, a sub-customer or a job (`Job` and
// `ParentRef`), nested up to four levels under a top level customer.

export type QboCustomer = {
  Id: string;
  SyncToken: string;
  /** Conditionally required on create; always present in responses. Unique across customers, vendors and employees. */
  DisplayName: string;
  /** Documented optional. The samples always include it. Inactive customers should not be offered. */
  Active?: boolean;
  CompanyName?: string;
  GivenName?: string;
  FamilyName?: string;
  /** Read only. Takes the form Customer:Job:Sub-job, so it tells a sub-customer from a top level one. */
  FullyQualifiedName?: string;
  /** True for a job or sub-customer. False or absent for a top level customer. */
  Job?: boolean;
  /** Set when `Job` is true. */
  ParentRef?: QboReference;
  /** Read only. Zero is the top level. */
  Level?: number;
  MetaData?: QboModificationMetaData;

  // Unused fields.
  // Title?: string;
  // MiddleName?: string;
  // Suffix?: string;
  // PrimaryEmailAddr?: QboEmailAddress;
  // ResaleNum?: string;
  // SecondaryTaxIdentifier?: string; // Masked in responses (last five characters). Sensitive.
  // DefaultTaxCodeRef?: QboReference;
  // PreferredDeliveryMethod?: string; // Print, Email or None.
  // SalesTermRef?: QboReference;
  // CustomerTypeRef?: QboReference; // Only returned when a customer type is assigned.
  // Fax?: QboTelephoneNumber;
  // BillWithParent?: boolean; // Valid only for a job or sub-customer.
  // CurrencyRef?: QboCurrencyRef; // Cannot be changed once set.
  // Mobile?: QboTelephoneNumber;
  // BalanceWithJobs?: number; // Read only.
  // PrimaryPhone?: QboTelephoneNumber;
  // OpenBalanceDate?: string; // Write on create.
  // Taxable?: boolean;
  // AlternatePhone?: QboTelephoneNumber;
  // Notes?: string;
  // WebAddr?: QboWebSiteAddress;
  // Balance?: number; // Not needed for mapping, so it stays on the server.
  // ShipAddr?: QboPhysicalAddress;
  // PaymentMethodRef?: QboReference;
  // IsProject?: boolean;
  // Source?: string; // Valid value: QBCommerce.
  // PrimaryTaxIdentifier?: string; // Masked in responses (last five characters). Sensitive.
  // PrintOnCheckName?: string;
  // BillAddr?: QboPhysicalAddress;
  // TaxExemptionReasonId?: number; // Automated sales tax companies only.
  // domain?: string; // In responses, undocumented. Always "QBO".
  // sparse?: boolean; // In responses, undocumented.
};

/**
 * What the browser gets: the few fields the mapping screen needs, cut down on the server (see
 * the privacy note at the top). Our own shape. `Active` is true when QuickBooks omits it, which
 * is how QuickBooks treats it. `FullyQualifiedName` falls back to `DisplayName`.
 */
export type QboCustomerSummary = {
  Id: string;
  DisplayName: string;
  FullyQualifiedName: string;
  Active: boolean;
  /** True for a job or sub-customer. Pickers list top level customers first. */
  Job: boolean;
  CompanyName: string | null;
};
