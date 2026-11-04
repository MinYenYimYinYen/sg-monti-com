import { QboNameValue } from "@/app/qbo/_lib/types/QboContactTypes";

// Intuit's CompanyInfo entity, written from the CompanyInfo reference page (minor version 75,
// confirmed by the user). Every documented field is listed. Fields we do not use are commented
// out. Read with GET /companyinfo/<realmId>. Writing is not planned.
//
// Privacy: EmployerId is the company's EIN. Never return it, or the whole object, to the
// browser. The connection test returns only a few chosen fields.

export type QboCompanyInfo = {
  Id: string;
  SyncToken: string;
  CompanyName: string;
  /** Optional on the page, though it is the legal name shown on government paperwork. */
  LegalName?: string;
  /** The country name used for financial calculations. Reads showed "USA", writes use "US". */
  Country?: string;
  /**
   * Settings without a field of their own. The ones we read: SubscriptionStatus (the page for
   * error 6190 points here to check whether writes will be accepted) and OfferingSku.
   */
  NameValue?: QboNameValue[];

  // Unused fields. Shapes are in QboContactTypes; import them when enabling a field.
  // CompanyAddr?: QboPhysicalAddress; // "Required for update" on the page.
  // LegalAddr?: QboPhysicalAddress;
  // CustomerCommunicationAddr?: QboPhysicalAddress;
  // SupportedLanguages?: string; // Comma separated.
  // Email?: QboEmailAddress;
  // WebAddr?: QboWebSiteAddress;
  // FiscalYearStartMonth?: QboMonth;
  // PrimaryPhone?: QboTelephoneNumber;
  // EmployerId?: string; // The EIN. Sensitive, see the note at the top.
  // MetaData?: QboModificationMetaData; // Read only.
  // CompanyStartDate?: string; // Read only. Documented as DateTime, but the sample shows "2015-06-05".
  // domain?: string; // In responses, undocumented. Always "QBO".
  // sparse?: boolean; // In responses, undocumented.
};
