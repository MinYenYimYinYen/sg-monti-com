import { QboModificationMetaData, QboReference } from "@/app/qbo/_lib/types/QboCommonTypes";
import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

// Intuit's JournalEntry entity, written from the JournalEntry reference page (minor version 75).
// Every documented field is listed. Fields we do not use are commented out, so the full surface
// stays visible. Shapes for commented fields are in QboCommonTypes; import them when enabling a
// field. The company does not use multicurrency, so CurrencyRef and ExchangeRate are never sent.
//
// This app only creates journal entries. Update, sparse update, delete and read-by-id are not
// built. Corrections to a posted entry happen in QuickBooks.
//
// Business rules from the page that the app enforces before sending:
// - At least one debit line and one credit line, and total debits equal total credits.
// - A line on an Accounts Receivable account needs a Customer in Entity, and a line on an
//   Accounts Payable account needs a Vendor.

export type QboPostingType = "Debit" | "Credit";

/** The page and its samples show Customer and Vendor. Other entity types are not modeled. */
export type QboJournalEntryEntityType = "Customer" | "Vendor";

export type QboJournalEntryLineEntity = {
  Type: QboJournalEntryEntityType;
  EntityRef: QboReference;
};

export type QboJournalEntryLineDetail = {
  PostingType: QboPostingType;
  /** The account must be active, or QuickBooks rejects the entry (errors 610 and 2500). */
  AccountRef: QboReference;
  /** Required on Accounts Receivable (Customer) and Accounts Payable (Vendor) lines. */
  Entity?: QboJournalEntryLineEntity;

  // Tax fields for global companies. The page says that when TaxCodeRef is given, TaxApplicableOn
  // and TaxAmount are required. We are a US company and never send tax.
  // TaxCodeRef?: QboReference;
  // TaxApplicableOn?: "Sales" | "Purchase";
  // TaxAmount?: number;
  // TaxInclusiveAmt?: number; // AU locale, GlobalTaxCalculation TaxInclusive only.
};

/**
 * Intuit has no reference page for Line. This shape was written from the JournalEntry samples.
 * The page also lists DescriptionOnlyLine as a valid line type, but we never send one.
 */
export type QboJournalEntryLine = {
  /** Assigned by QuickBooks. Absent on a line we send. */
  Id?: string;
  Amount: number;
  Description?: string;
  DetailType: "JournalEntryLineDetail";
  JournalEntryLineDetail: QboJournalEntryLineDetail;

  // ProjectRef?: QboReference; // Appears on a sample line. Projects are not used.
};

export type QboJournalEntry = {
  /** Required for update. Assigned by QuickBooks on create. */
  Id: string;
  SyncToken: string;
  Line: QboJournalEntryLine[];
  /** YYYY-MM-DD. The posting date that affects the financial statements. Defaults to today. */
  TxnDate?: string;
  /**
   * The reference number. Duplicates are only rejected when the company preference
   * WarnDuplicateJournalNumber is on, so this app guards duplicates itself (see the posting
   * server). We never send include=allowduplicatedocnum.
   */
  DocNumber?: string;
  PrivateNote?: string;
  Adjustment?: boolean;
  /** Read only. Always zero; QuickBooks overwrites any value sent. */
  TotalAmt?: number;
  MetaData?: QboModificationMetaData;

  // Unused fields.
  // CurrencyRef?: QboCurrencyRef; // Required only if multicurrency is on. It is not.
  // GlobalTaxCalculation?: "TaxExcluded" | "TaxInclusive"; // Not applicable to US companies.
  // ExchangeRate?: number; // Multicurrency only.
  // TaxRateRef?: QboReference;
  // TxnTaxDetail?: unknown; // Intuit names this type without defining it. Ignored when sales tax is off.
  // RecurDataRef?: QboReference; // Read only.
  // HomeTotalAmt?: number; // Read only. Always zero.
  // domain?: string; // In responses, undocumented. Always "QBO".
  // sparse?: boolean; // In responses, undocumented.
};

/** What we send for one line. */
export type QboJournalEntryLineCreate = {
  DetailType: "JournalEntryLineDetail";
  Amount: number;
  Description?: string;
  JournalEntryLineDetail: {
    PostingType: QboPostingType;
    AccountRef: { value: string };
    Entity?: { Type: QboJournalEntryEntityType; EntityRef: { value: string } };
  };
};

/** What we send to create a journal entry. Intuit's minimum is Line; we always add DocNumber and TxnDate. */
export type QboJournalEntryCreate = {
  Line: QboJournalEntryLineCreate[];
  DocNumber: string;
  TxnDate: string;
  PrivateNote?: string;
};

// Our own shapes below. They are not Intuit's.

/** One line of an entry the caller wants posted. Amounts are whole cents so sums cannot drift. */
export type JournalEntryLineInput = {
  postingType: QboPostingType;
  accountId: string;
  amountCents: number;
  description?: string;
  /** Both or neither of entityType and entityId. */
  entityType?: QboJournalEntryEntityType;
  entityId?: string;
};

/**
 * Where an entry came from, kept on our stored posting only. QuickBooks never sees it. The hash
 * is of the source data (not the QBO lines), so remapping an account later cannot change an
 * entry's identity. Optional on a posting: entries posted by hand have no source.
 *
 * - genLedger: one day's CRM General Ledger file. sourceLines are the CRM account names with
 *   their net amounts, so history shows what the CRM said and not only where it landed.
 * - deposit: one row of the WorkWave deposit export. sourceFields are its amounts in cents,
 *   keyed by deposit field. occurrence numbers identical rows in one file, like credit card rows.
 */
export type JournalEntrySource =
  | {
      kind: "genLedger";
      sourceHash: string;
      fileName: string;
      sourceLines: { crmAccount: string; netCents: number }[];
    }
  | {
      kind: "deposit";
      sourceHash: string;
      occurrence: number;
      fileName: string;
      sourceFields: Record<string, number>;
      /** What hit the bank. Shown as the amount of the last credit card payment entry. */
      netDepositCents: number;
    };

export type JournalEntrySourceKind = JournalEntrySource["kind"];

/** One entry the caller wants posted. DocNumber is required: it is how an uncertain outcome is verified. */
export type JournalEntryInput = {
  docNumber: string;
  /** YYYY-MM-DD. */
  txnDate: string;
  privateNote?: string;
  lines: JournalEntryLineInput[];
  source?: JournalEntrySource;
};

/** A line as stored. The account name is kept so history reads without loading accounts. */
export type JournalEntryPostingLine = JournalEntryLineInput & {
  accountName: string;
};

/**
 * Pending: saved, not sent. Posting: claimed and sent, no answer yet. Posted: QuickBooks answered
 * with the entry and its Id. Failed: QuickBooks rejected it, so it is certain not to exist.
 * Unknown: the request may or may not have landed; reconcile before any retry.
 */
export type JournalEntryPostingStatus = "pending" | "posting" | "posted" | "failed" | "unknown";

/** What a posting attempt concluded. Pending means nothing was created and a retry is safe. */
export type JournalEntryPostOutcome = "posted" | "failed" | "unknown" | "pending";

export type JournalEntryPostingContent = {
  docNumber: string;
  txnDate: string;
  privateNote?: string;
  lines: JournalEntryPostingLine[];
  /** The sum of the debit lines, which equals the sum of the credit lines. */
  totalCents: number;
  source?: JournalEntrySource;
};

/**
 * One stored attempt per DocNumber. Posted means QuickBooks said so. Verified (verifiedAt set)
 * means a separate read by DocNumber found exactly this entry.
 */
export type JournalEntryPosting = CreatedUpdated &
  JournalEntryPostingContent & {
    status: JournalEntryPostingStatus;
    qboId?: string;
    qboSyncToken?: string;
    postMessage?: string;
    postedByUserName?: string;
    postedAt?: string;
    verifiedAt?: string;
  };

export type JournalEntryPostResult = {
  posting: JournalEntryPosting;
  outcome: JournalEntryPostOutcome;
};

/** An entry that was not sent, with the reasons. */
export type JournalEntryBlocked = {
  docNumber: string;
  problems: string[];
};

export type PostJournalEntriesResult = {
  results: JournalEntryPostResult[];
  blockedEntries: JournalEntryBlocked[];
  /** Saved as pending but never sent, because an earlier batch did not fully post. */
  notAttemptedDocNumbers: string[];
  stopReason: string | null;
};

export type ReconcileJournalEntriesResult = {
  results: JournalEntryPostResult[];
  skipped: JournalEntryBlocked[];
};

/** Inclusive dates, YYYY-MM-DD. Compared against each posting's txnDate. */
export type JournalEntryRange = {
  startDate: string;
  endDate: string;
};
