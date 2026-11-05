import { QboPurchase } from "@/app/qbo/purchase/types/QboPurchaseTypes";

// Pure helpers for the DocNumber diagnostic read. A DocNumber goes into the query text, so it is
// checked here before it is used.

const DOC_NUMBER_PATTERN = /^[A-Za-z0-9 _.-]{1,21}$/;

/** Letters, digits, space, underscore, dot and dash, up to Intuit's 21 characters. Null if fine. */
export function validateDocNumberForQuery(docNumber: string): string | null {
  if (DOC_NUMBER_PATTERN.test(docNumber)) return null;
  return "Use 1 to 21 letters, digits, spaces, dots, dashes or underscores.";
}

export function buildDocNumberWhere(docNumber: string): string {
  return `DocNumber = '${docNumber}'`;
}

/** One purchase found by Ref no. Only what is needed to judge the lookup, nothing sensitive. */
export type QboDocNumberMatch = {
  Id: string;
  TxnDate: string | null;
  PaymentType: string;
  TotalAmt: number | null;
  /** Echoed back as stored, so a value QuickBooks changed would show. */
  DocNumber: string | null;
  PrivateNote: string | null;
  /** Raw, because the shape is not documented. This is the point of the diagnostic. */
  CustomField: unknown;
  /** Other keys on the purchase that this app does not model, names only. */
  otherKeyNames: string[];
};

export type QboDocNumberInspection = {
  docNumber: string;
  matchCount: number;
  matches: QboDocNumberMatch[];
};

const MODELED_KEYS = new Set([
  "Id",
  "SyncToken",
  "MetaData",
  "PaymentType",
  "AccountRef",
  "EntityRef",
  "Line",
  "TxnDate",
  "DocNumber",
  "PrivateNote",
  "Credit",
  "TotalAmt",
  "CustomField",
  "domain",
  "sparse",
  "PurchaseEx",
]);

export function describeDocNumberMatch(purchase: QboPurchase): QboDocNumberMatch {
  const raw = purchase as unknown as Record<string, unknown>;
  return {
    Id: purchase.Id,
    TxnDate: purchase.TxnDate ?? null,
    PaymentType: purchase.PaymentType,
    TotalAmt: purchase.TotalAmt ?? null,
    DocNumber: purchase.DocNumber ?? null,
    PrivateNote: purchase.PrivateNote ?? null,
    CustomField: raw.CustomField ?? null,
    otherKeyNames: Object.keys(raw).filter((key) => !MODELED_KEYS.has(key)),
  };
}
