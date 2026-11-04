import { QboReference } from "@/app/qbo/_lib/types/QboCommonTypes";

// Intuit's Account entity, written from the Account reference page (minor version 75).
// Every documented field is listed. Fields we do not use are commented out, so the full
// surface stays visible without re-reading Intuit's documentation. Account is read-only in
// this app for now, so the create and update request shapes are not modeled.

/**
 * UNVERIFIED: written from memory, because the Account page names AccountTypeEnum without
 * defining it. Check against Intuit's AccountTypeEnum page before relying on a value.
 */
export type QboAccountType =
  | "Bank"
  | "Other Current Asset"
  | "Fixed Asset"
  | "Other Asset"
  | "Accounts Receivable"
  | "Equity"
  | "Expense"
  | "Other Expense"
  | "Cost of Goods Sold"
  | "Accounts Payable"
  | "Credit Card"
  | "Long Term Liability"
  | "Other Current Liability"
  | "Income"
  | "Other Income";

export type QboAccountClassification = "Asset" | "Equity" | "Expense" | "Liability" | "Revenue";

export type QboAccount = {
  Id: string;
  Name: string;
  SyncToken: string;
  /** Only present when the company uses account numbers. */
  AcctNum?: string;
  /** Inactive accounts may not be posted to. */
  Active: boolean;
  AccountType: QboAccountType;
  AccountSubType: string;
  /** Read only. Not supported for non-posting accounts, so it can be absent. */
  Classification?: QboAccountClassification;
  /** Read only. Parent:Account:SubAccount, up to 5 levels. */
  FullyQualifiedName: string;
  /** Read only. True when this account is a sub-account. */
  SubAccount: boolean;
  /** Set when SubAccount is true. */
  ParentRef?: QboReference;

  // Unused fields. QboCurrencyRef and QboModificationMetaData are in QboCommonTypes; import
  // them when enabling the fields that need them.
  // CurrencyRef?: QboCurrencyRef; // Multi-currency companies only.
  // Description?: string;
  // MetaData?: QboModificationMetaData; // Read only.
  // TaxCodeRef?: QboReference; // Global locales only.
  // CurrentBalance?: number; // Read only. Balance sheet accounts.
  // CurrentBalanceWithSubAccounts?: number; // Read only.
  // domain?: string; // In responses, undocumented. Always "QBO".
  // sparse?: boolean; // In responses, undocumented.
};
