import { QboModificationMetaData, QboReference } from "@/app/qbo/_lib/types/QboCommonTypes";

// Intuit's Purchase entity, written from the Purchase reference page (minor version 75,
// confirmed by the user). Every documented field is listed. Fields we do not use are commented
// out so the full surface stays visible. Shapes for commented fields are in QboCommonTypes and
// QboContactTypes; import them when enabling a field.
//
// We only create PaymentType "CreditCard" purchases (see "Transactions" in planning/qboPlan.md).
// The page says AccountRef is required on every purchase, and TotalAmt must equal the sum of
// the Line amounts (QuickBooks calculates it and overwrites any value we send).

/** The page documents this as a plain String with these three values. */
export type QboPaymentType = "Cash" | "Check" | "CreditCard";

/**
 * Intuit has no reference page for Line. This shape was written from the Purchase samples.
 * Only the account-based detail is used. Fields that never appear in a sample are left out.
 */
export type QboPurchaseLine = {
  /** Assigned by QuickBooks. Absent on a line we send. */
  Id?: string;
  Amount: number;
  /** The line's note. The Purchase-level PrivateNote is the Memo on the Expense form. */
  Description?: string;
  DetailType: "AccountBasedExpenseLineDetail" | "ItemBasedExpenseLineDetail";
  AccountBasedExpenseLineDetail?: QboAccountBasedExpenseLineDetail;

  // ItemBasedExpenseLineDetail?: ...; // Only when Preferences.ProductAndServicesPrefs.ForPurchase is on. Not used.
  // ProjectRef?: QboReference; // Appears on sample lines. Projects are not used.
};

export type QboAccountBasedExpenseLineDetail = {
  /** The expense account. Must be active, or QuickBooks rejects the purchase (errors 610 and 2500). */
  AccountRef: QboReference;
  /** UNVERIFIED: only "NotBillable" appears in the samples. */
  BillableStatus?: string;
  /** Appears as { value: "NON" } in samples, which means not taxable. */
  TaxCodeRef?: QboReference;
};

export type QboPrintStatus = "NotSet" | "NeedToPrint" | "PrintComplete";

export type QboGlobalTaxCalculation = "TaxExcluded" | "TaxInclusive" | "NotApplicable";

export type QboPurchase = {
  /** Required for update. Assigned by QuickBooks on create. */
  Id: string;
  SyncToken: string;
  PaymentType: QboPaymentType;
  /** For CreditCard this is the credit card account. */
  AccountRef: QboReference;
  /** The party paid. Set `type` to "Vendor" and `value` to the vendor's Id. */
  EntityRef?: QboReference;
  Line: QboPurchaseLine[];
  /** YYYY-MM-DD. The posting date that affects the financial statements. Defaults to today. */
  TxnDate?: string;
  /**
   * Shown as the reference number. The marker design is deferred until posting is built. The
   * page says duplicates are rejected for Cash and CreditCard purchases (error 6140) unless the
   * URI carries include=allowduplicatedocnum, and that whether a custom value is honored
   * depends on a company preference.
   */
  DocNumber?: string;
  /** The Memo field on the Expense form in QuickBooks. */
  PrivateNote?: string;
  /** False is a charge, true is a refund. Only valid for CreditCard. */
  Credit?: boolean;
  /** Read only. Calculated by QuickBooks. */
  TotalAmt?: number;
  MetaData?: QboModificationMetaData;

  // Unused fields.
  // CurrencyRef?: QboCurrencyRef; // Required when multicurrency is enabled for the company.
  // PrintStatus?: QboPrintStatus; // Check only. Ignored for credit card purchases.
  // RemitToAddr?: QboPhysicalAddress; // Check only.
  // TxnSource?: string; // Internal.
  // LinkedTxn?: LinkedTxn[]; // Intuit names this type without defining it. TxnType can be ReimburseCharge.
  // GlobalTaxCalculation?: QboGlobalTaxCalculation;
  // TxnTaxDetail?: TxnTaxDetail; // Intuit names this type without defining it. Ignored when sales tax is off.
  // PaymentMethodRef?: QboReference;
  // PurchaseEx?: unknown; // Internal use. Appears in responses as a Java-style wrapper around a NameValue.
  // ExchangeRate?: number; // Multicurrency only.
  // DepartmentRef?: QboReference; // Only when department tracking is on.
  // IncludeInAnnualTPAR?: boolean; // AU locale only.
  // RecurDataRef?: QboReference; // Read only.
  // CustomField?: unknown[]; // Appears in responses as an empty list. Not on the reference page.
  // domain?: string; // In responses, undocumented. Always "QBO".
  // sparse?: boolean; // In responses, undocumented.
};

export type QboPurchaseSummaryLine = {
  Amount: number;
  Description: string | null;
  /** The expense account. Null on lines with no account detail, such as item-based lines. */
  AccountRef: QboReference | null;
};

/**
 * What the browser gets, cut down on the server. Our own shape, so it is one of the few places
 * these types are not Intuit's. It is enough to review what is already in QuickBooks and, in
 * Phase E, to find our own purchases again by DocNumber.
 */
export type QboPurchaseSummary = {
  Id: string;
  SyncToken: string;
  PaymentType: QboPaymentType;
  TxnDate: string | null;
  DocNumber: string | null;
  PrivateNote: string | null;
  /** True for a refund. QuickBooks omits it on non-credit-card purchases. */
  Credit: boolean;
  TotalAmt: number;
  /** For a credit card purchase this is the card account. */
  AccountRef: QboReference;
  EntityRef: QboReference | null;
  Lines: QboPurchaseSummaryLine[];
};

/** Inclusive dates, YYYY-MM-DD. Compared against each purchase's TxnDate. */
export type QboPurchaseRange = {
  startDate: string;
  endDate: string;
};

/** What we send for one credit card expense line. */
export type QboPurchaseLineCreate = {
  DetailType: "AccountBasedExpenseLineDetail";
  Amount: number;
  Description?: string;
  AccountBasedExpenseLineDetail: { AccountRef: QboReference };
};

/**
 * What we would send to create a credit card purchase (Phase E). Intuit's minimum is
 * PaymentType, AccountRef and Line. We add the vendor, the date and the memo.
 */
export type QboPurchaseCreate = {
  PaymentType: "CreditCard";
  AccountRef: QboReference;
  EntityRef: QboReference;
  Line: QboPurchaseLineCreate[];
  TxnDate: string;
  PrivateNote?: string;
  /** Left out until the DocNumber marker is designed (deferred to just before writes). */
  DocNumber?: string;
  // CurrencyRef?: QboCurrencyRef; // Needed if the company turns on multicurrency.
};
