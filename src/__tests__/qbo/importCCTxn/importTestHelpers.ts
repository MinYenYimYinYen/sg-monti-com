import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";
import { QboFault } from "@/app/qbo/_lib/types/QboCommonTypes";
import { QboVendorSummary } from "@/app/qbo/vendor/types/QboVendorTypes";
import { MerchantMapping } from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";
import { ImportRow } from "@/app/qbo/importCCTxn/types/ImportRowTypes";

// Shared builders for the QBO import tests. These are QBO and import shapes, not RealGreen
// entities, so they are built by hand rather than with makeCustomer.

/** SHA-256 of the real charge posted in staged write 1, which QuickBooks holds as SGdec8e4a35041-1. */
export const REAL_ROW_HASH = "dec8e4a35041ae180f01cf971b65f95b7ca9041aa4297228d10de1545ae56b91";

/** The real charge posted in staged write 1: Anthropic, 10/26/2026, $95.01, Capital One. */
export function makeRow(overrides: Partial<ImportRow> = {}): ImportRow {
  return {
    formatId: "capitalOne",
    transactionDate: "2026-10-26",
    postedDate: "2026-10-27",
    last4: "2238",
    description: "ANTHROPIC",
    category: "Merchandise",
    amountCents: 9501,
    kind: "charge",
    rowId: `${REAL_ROW_HASH}:1`,
    rowHash: REAL_ROW_HASH,
    occurrence: 1,
    merchantKey: "ANTHROPIC",
    status: "pending",
    importBatchId: "batch-1",
    fileName: "october.csv",
    importedByUserName: "sam",
    ...overrides,
  };
}

export function makeCardAccount(overrides: Partial<QboAccount> = {}): QboAccount {
  return {
    Id: "42",
    Name: "Discover",
    SyncToken: "0",
    Active: true,
    AccountType: "Credit Card",
    AccountSubType: "CreditCard",
    Classification: "Liability",
    FullyQualifiedName: "Discover",
    SubAccount: false,
    ...overrides,
  };
}

export function makeExpenseAccount(overrides: Partial<QboAccount> = {}): QboAccount {
  return {
    Id: "13",
    Name: "Software",
    SyncToken: "0",
    Active: true,
    AccountType: "Expense",
    AccountSubType: "OfficeGeneralAdministrativeExpenses",
    Classification: "Expense",
    FullyQualifiedName: "Office:Software",
    SubAccount: true,
    ...overrides,
  };
}

export function makeVendorSummary(overrides: Partial<QboVendorSummary> = {}): QboVendorSummary {
  return {
    Id: "77",
    SyncToken: "0",
    DisplayName: "Anthropic",
    Active: true,
    CompanyName: null,
    ...overrides,
  };
}

export function makeMapping(overrides: Partial<MerchantMapping> = {}): MerchantMapping {
  return {
    merchantKey: "ANTHROPIC",
    ownerUserName: null,
    vendorId: "77",
    defaultAccountId: "13",
    otherAccountIds: [],
    confirmedMerchants: [],
    ...overrides,
  };
}

/** A fault with one error, shaped like the ones inside a failed batch item. */
export function makeFault({
  code,
  message = "Business Validation Error",
  detail,
}: {
  code: string;
  message?: string;
  detail?: string;
}): QboFault {
  return {
    type: "ValidationFault",
    Error: [{ Message: message, Detail: detail, code }],
  };
}
