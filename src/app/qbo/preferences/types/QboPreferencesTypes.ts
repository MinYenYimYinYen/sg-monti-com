import { QboCurrencyRef, QboModificationMetaData } from "@/app/qbo/_lib/types/QboCommonTypes";
import { QboNameValue } from "@/app/qbo/_lib/types/QboContactTypes";

// Intuit's Preferences entity, written from the Preferences reference page (minor version 75,
// confirmed by the user). The page lists each section as a bare `object`, so the fields inside
// come from its sample JSON. Sections and fields we do not use are commented out. Read with
// GET /preferences. Writing is not planned. There is one Preferences record per company, and
// its Query example on the page shows a bare object instead of the usual QueryResponse
// envelope, so we use the Read endpoint.
//
// Privacy: the full object holds the company's email templates and other settings. The server
// returns only QboPreferencesSummary to the browser.
//
// The page warns that many preferences control the QuickBooks screens and are not honored by
// API requests, so a preference is a hint about behavior, not a guarantee.

export type QboAccountingInfoPrefs = {
  /**
   * YYYY-MM-DD. Present on the live company (2023-12-31). UNVERIFIED as a posting guard: whether
   * the API refuses purchases dated on or before it (error 6210) is not proven, and Intuit's
   * errors page says the API cannot tell you the close date.
   */
  BookCloseDate?: string;
  TrackDepartments?: boolean;
  UseAccountNumbers?: boolean;

  // FirstMonthOfFiscalYear?: QboMonth;
  // TaxYearMonth?: QboMonth;
  // ClassTrackingPerTxn?: boolean;
  // ClassTrackingPerTxnLine?: boolean;
  // TaxForm?: string;
  // CustomerTerminology?: string;
  // DepartmentTerminology?: string;
};

export type QboCurrencyPrefs = {
  /** When true, CurrencyRef becomes required on a Purchase. */
  MultiCurrencyEnabled?: boolean;
  HomeCurrency?: QboCurrencyRef;
};

export type QboOtherPrefs = {
  /**
   * Extra settings as name and value pairs. The page's sample shows, among others,
   * WarnDuplicateCheckNumber, WarnDuplicateBillNumber, ProjectsEnabled, DateFormat.
   */
  NameValue?: QboNameValue[];
};

export type QboPreferences = {
  Id: string;
  SyncToken: string;
  AccountingInfoPrefs?: QboAccountingInfoPrefs;
  CurrencyPrefs?: QboCurrencyPrefs;
  OtherPrefs?: QboOtherPrefs;
  MetaData?: QboModificationMetaData;

  // Unused sections. Fields come from the page's sample JSON.
  // EmailMessagesPrefs?: { InvoiceMessage?, EstimateMessage?, SalesReceiptMessage?, StatementMessage? }; // Each { Subject, Message }.
  // ProductAndServicesPrefs?: { ForSales?, ForPurchase?, QuantityWithPriceAndRate?, QuantityOnHand? };
  // ReportPrefs?: { ReportBasis?: string; CalcAgingReportFromTxnDate?: boolean };
  // SalesFormsPrefs?: { CustomTxnNumbers?, AllowDiscount?, AllowDeposit?, AllowEstimates?, AllowShipping?, DefaultTerms?, ... }; // Many fields.
  // VendorAndPurchasesPrefs?: { BillableExpenseTracking?, TrackingByCustomer?, POCustomField? };
  // TaxPrefs?: { UsingSalesTax?: boolean; TaxGroupCodeRef?: QboReference };
  // TimeTrackingPrefs?: { WorkWeekStartDate?, MarkTimeEntriesBillable?, ShowBillRateToAll?, UseServices?, BillCustomers? };
  // domain?: string; // In responses, undocumented. Always "QBO".
  // sparse?: boolean; // In responses, undocumented.
};
