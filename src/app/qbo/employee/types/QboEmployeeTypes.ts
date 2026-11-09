import { QboModificationMetaData } from "@/app/qbo/_lib/types/QboCommonTypes";

// Intuit's Employee entity, written from the Employee reference page (minor version 75). Every
// documented field is listed. Fields we do not use are commented out so the full surface stays
// visible. Shapes for the commented fields are in QboCommonTypes and QboContactTypes; import
// them when enabling a field.
//
// Read-only in this app. We read employees only for their names: QuickBooks requires a
// DisplayName to be unique across customers, vendors and employees, so an employee name blocks a
// new vendor name (see qboMergedSelect). No create or update shapes are modeled.
//
// Privacy: an Employee response also carries the masked SSN, birth date, pay rate, address and
// phone numbers. The server loader passes the browser only the name fields (see
// QboEmployeeSummary).
//
// Business rules from the page: DisplayName must be unique across all Customer, Employee and
// Vendor objects, and must not contain a colon, tab or newline. When QuickBooks Payroll is
// enabled, DisplayName is read only and is GivenName MiddleName FamilyName.

export type QboEmployee = {
  Id: string;
  SyncToken: string;
  /** Documented optional. Responses include it. Unique across customers, vendors and employees. */
  DisplayName?: string;
  /** Documented optional. The samples always include it. */
  Active?: boolean;
  GivenName?: string;
  MiddleName?: string;
  FamilyName?: string;
  EmployeeNumber?: string;
  MetaData?: QboModificationMetaData;

  // Unused fields.
  // PrimaryAddr?: QboPhysicalAddress; // Required on create when Payroll is enabled.
  // PrimaryEmailAddr?: QboEmailAddress;
  // Title?: string; // Not supported when Payroll is enabled.
  // BillableTime?: boolean;
  // BirthDate?: string; // Sensitive.
  // SSN?: string; // Masked in responses. Sensitive. Cannot be sent when Payroll is enabled.
  // PrimaryPhone?: QboTelephoneNumber;
  // ReleasedDate?: string;
  // CostRate?: number; // Pay rate. Sensitive.
  // Mobile?: QboTelephoneNumber;
  // Gender?: string; // Male or Female.
  // HiredDate?: string;
  // BillRate?: number; // Needs BillableTime. Not supported when Payroll is enabled.
  // Organization?: boolean; // True when the object is an organization, not a person.
  // Suffix?: string; // Not supported when Payroll is enabled.
  // PrintOnCheckName?: string; // Not supported when Payroll is enabled.
  // V4IDPseudonym?: string; // Read only. Internal use only.
  // domain?: string; // In responses, undocumented. Always "QBO".
  // sparse?: boolean; // In responses, undocumented.
};

/**
 * What the browser gets: the name and whether the employee is active, cut down on the server (see
 * the privacy note at the top). Our own shape. `Active` is true when QuickBooks omits it, which
 * is how QuickBooks treats it. `DisplayName` is built from the name parts when QuickBooks omits it.
 */
export type QboEmployeeSummary = {
  Id: string;
  DisplayName: string;
  Active: boolean;
};
