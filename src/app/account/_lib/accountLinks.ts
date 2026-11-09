import {
  AccountLinkStatus,
  AccountMappingDoc,
  AccountMappingNameType,
  QboAccountLink,
  RgAccountLink,
} from "@/app/account/AccountMappingTypes";
import { RgAccount } from "@/app/realGreen/rgAccount/RgAccountTypes";
import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";
import { QboCustomerSummary } from "@/app/qbo/customer/types/QboCustomerTypes";

/** QuickBooks takes a Customer on Accounts Receivable lines and a Vendor on Accounts Payable lines. */
export function nameTypeForQboAccount(qboAccount: QboAccount | null): AccountMappingNameType | null {
  if (!qboAccount) return null;
  if (qboAccount.AccountType === "Accounts Receivable") return "Customer";
  if (qboAccount.AccountType === "Accounts Payable") return "Vendor";
  return null;
}

type NameMissingParams = {
  nameType: AccountMappingNameType | null;
  defaultNameId: string | null;
  customerMap: Map<string, QboCustomerSummary>;
};

/**
 * Only a Customer is required (Accounts Receivable). A stored customer counts as missing when
 * QuickBooks no longer returns it or it is inactive. When no customers have loaded, a stored
 * name cannot be checked, so it is given the benefit of the doubt.
 */
export function isDefaultNameMissing({
  nameType,
  defaultNameId,
  customerMap,
}: NameMissingParams): boolean {
  if (nameType !== "Customer") return false;
  if (!defaultNameId) return true;
  if (customerMap.size === 0) return false;
  return !customerMap.get(defaultNameId)?.Active;
}

type ResolveLinkParams = {
  qboAccount: QboAccount | null;
  hasMapping: boolean;
  qboLoaded: boolean;
  isNameMissing: boolean;
};

export function resolveLinkStatus({
  qboAccount,
  hasMapping,
  qboLoaded,
  isNameMissing,
}: ResolveLinkParams): AccountLinkStatus {
  if (!hasMapping) return "unmapped";
  if (!qboLoaded) return "unverified";
  if (!qboAccount) return "missing";
  if (!qboAccount.Active) return "inactive";
  return isNameMissing ? "needsName" : "mapped";
}

type BuildRgAccountLinksParams = {
  rgAccounts: RgAccount[];
  mappingDocs: AccountMappingDoc[];
  qboAccountMap: Map<string, QboAccount>;
  customerMap: Map<string, QboCustomerSummary>;
};

export function buildRgAccountLinks({
  rgAccounts,
  mappingDocs,
  qboAccountMap,
  customerMap,
}: BuildRgAccountLinksParams): RgAccountLink[] {
  const mappingByRgAccountId = new Map(mappingDocs.map((doc) => [doc.rgAccountId, doc]));
  // QBO accounts are loaded all at once, so an empty map means "not loaded yet".
  const qboLoaded = qboAccountMap.size > 0;

  return rgAccounts.map((rgAccount) => {
    const mapping = mappingByRgAccountId.get(rgAccount.rgAccountId);
    const qboAccount = mapping ? (qboAccountMap.get(mapping.qboAccountId) ?? null) : null;
    const nameType = nameTypeForQboAccount(qboAccount);
    const defaultNameId = mapping?.defaultNameId ?? null;
    return {
      rgAccount,
      qboAccount,
      nameType,
      defaultNameId,
      status: resolveLinkStatus({
        qboAccount,
        hasMapping: mapping !== undefined,
        qboLoaded,
        isNameMissing: isDefaultNameMissing({ nameType, defaultNameId, customerMap }),
      }),
    };
  });
}

type BuildQboAccountLinksParams = {
  qboAccounts: QboAccount[];
  rgAccountLinks: RgAccountLink[];
};

export function buildQboAccountLinks({
  qboAccounts,
  rgAccountLinks,
}: BuildQboAccountLinksParams): QboAccountLink[] {
  const rgAccountsByQboId = new Map<string, RgAccount[]>();
  for (const link of rgAccountLinks) {
    if (!link.qboAccount) continue;
    const existing = rgAccountsByQboId.get(link.qboAccount.Id) ?? [];
    existing.push(link.rgAccount);
    rgAccountsByQboId.set(link.qboAccount.Id, existing);
  }

  return qboAccounts.map((qboAccount) => ({
    qboAccount,
    rgAccounts: rgAccountsByQboId.get(qboAccount.Id) ?? [],
  }));
}
