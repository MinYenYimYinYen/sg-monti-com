import { RgAccountLink } from "@/app/account/AccountMappingTypes";
import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";
import { QboCustomerSummary } from "@/app/qbo/customer/types/QboCustomerTypes";
import { QboVendorSummary } from "@/app/qbo/vendor/types/QboVendorTypes";

export type AccountLinkFilter = "all" | "unmapped" | "attention";

/** One choice in a picker: a QBO account, customer or vendor. */
export type PickerOption = {
  id: string;
  label: string;
};

export type AccountLinkCounts = Record<AccountLinkFilter, number>;

function isAttentionStatus(status: RgAccountLink["status"]): boolean {
  return status === "inactive" || status === "missing" || status === "needsName";
}

type FilterParams = {
  links: RgAccountLink[];
  filter: AccountLinkFilter;
  query: string;
};

export function filterRgAccountLinks({ links, filter, query }: FilterParams): RgAccountLink[] {
  const needle = query.trim().toLowerCase();

  return links.filter((link) => {
    if (filter === "unmapped" && link.status !== "unmapped") return false;
    if (filter === "attention" && !isAttentionStatus(link.status)) return false;
    if (!needle) return true;
    return (
      link.rgAccount.rgAccountId.toLowerCase().includes(needle) ||
      link.rgAccount.rgDescription.toLowerCase().includes(needle)
    );
  });
}

export function countLinksByFilter(links: RgAccountLink[]): AccountLinkCounts {
  return {
    all: links.length,
    unmapped: links.filter((link) => link.status === "unmapped").length,
    attention: links.filter((link) => isAttentionStatus(link.status)).length,
  };
}

export function formatQboAccountLabel(qboAccount: QboAccount): string {
  return qboAccount.AcctNum
    ? `${qboAccount.AcctNum} ${qboAccount.FullyQualifiedName}`
    : qboAccount.FullyQualifiedName;
}

/** Only active accounts can be chosen. An inactive one that is already linked is shown by the row. */
export function buildQboAccountOptions(qboAccounts: QboAccount[]): PickerOption[] {
  return qboAccounts
    .filter((qboAccount) => qboAccount.Active)
    .map((qboAccount) => ({ id: qboAccount.Id, label: formatQboAccountLabel(qboAccount) }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}

/** Active customers, top level ones first, because the CRM's receivables usually sit on one of those. */
export function buildCustomerOptions(customers: QboCustomerSummary[]): PickerOption[] {
  return customers
    .filter((customer) => customer.Active)
    .sort(
      (a, b) =>
        Number(a.Job) - Number(b.Job) ||
        a.FullyQualifiedName.localeCompare(b.FullyQualifiedName, undefined, { sensitivity: "base" }),
    )
    .map((customer) => ({ id: customer.Id, label: customer.FullyQualifiedName }));
}

export function buildVendorOptions(vendors: QboVendorSummary[]): PickerOption[] {
  return vendors
    .filter((vendor) => vendor.Active)
    .sort((a, b) => a.DisplayName.localeCompare(b.DisplayName, undefined, { sensitivity: "base" }))
    .map((vendor) => ({ id: vendor.Id, label: vendor.DisplayName }));
}

type SuggestParams = {
  rgAccountId: string;
  qboAccounts: QboAccount[];
};

/** The old Javelin output numbered QBO accounts with the CRM account number, so a match is likely. */
export function suggestedQboAccountIds({ rgAccountId, qboAccounts }: SuggestParams): Set<string> {
  return new Set(
    qboAccounts
      .filter((qboAccount) => qboAccount.Active && qboAccount.AcctNum === rgAccountId)
      .map((qboAccount) => qboAccount.Id),
  );
}
