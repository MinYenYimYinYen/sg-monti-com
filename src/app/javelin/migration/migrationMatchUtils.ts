import { nameTypeForQboAccount } from "@/app/account/_lib/accountLinks";
import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";
import { QboCustomerSummary } from "@/app/qbo/customer/types/QboCustomerTypes";
import { QboVendorSummary } from "@/app/qbo/vendor/types/QboVendorTypes";
import { GenLedgerAccountEntry } from "@/app/javelin/JavelinTypes";

// Pure. Matches the legacy name-based Javelin entries to QuickBooks records. Never guesses: more
// than one possible match is reported, not chosen.

export type LegacyEntry = Pick<GenLedgerAccountEntry, "qbName" | "name" | "accountNumber">;

export type MigrationLookups = {
  accounts: QboAccount[];
  customers: QboCustomerSummary[];
  vendors: QboVendorSummary[];
};

function sameText(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export type AccountMatch = { account: QboAccount } | { problem: string };

/** The QBO account named by a legacy entry: by its name first, then by its account number. */
export function matchQboAccount({
  entry,
  rgAccountId,
  accounts,
}: {
  entry: LegacyEntry;
  rgAccountId: string | null;
  accounts: QboAccount[];
}): AccountMatch {
  const active = accounts.filter((account) => account.Active);
  const qbName = entry.qbName.trim();

  if (qbName) {
    const byName = active.filter(
      (account) => sameText(account.FullyQualifiedName, qbName) || sameText(account.Name, qbName),
    );
    if (byName.length === 1) return { account: byName[0] };
    if (byName.length > 1) {
      return { problem: `More than one active QuickBooks account is named "${qbName}".` };
    }
  }

  const number = entry.accountNumber?.trim() || rgAccountId;
  if (number) {
    const byNumber = active.filter((account) => account.AcctNum === number);
    if (byNumber.length === 1) return { account: byNumber[0] };
    if (byNumber.length > 1) {
      return { problem: `More than one active QuickBooks account has the number ${number}.` };
    }
  }
  return { problem: `No active QuickBooks account matches "${qbName || number || "(blank)"}".` };
}

export type NameMatch = {
  defaultNameType?: "Customer" | "Vendor";
  defaultNameId?: string;
  note?: string;
};

/** The default name for a line. Only an A/R (customer) or A/P (vendor) account takes one. */
export function matchDefaultName({
  name,
  account,
  customers,
  vendors,
}: {
  name: string | undefined;
  account: QboAccount;
  customers: QboCustomerSummary[];
  vendors: QboVendorSummary[];
}): NameMatch {
  const nameType = nameTypeForQboAccount(account);
  const wanted = name?.trim();
  if (!nameType) {
    return wanted ? { note: `Name "${wanted}" dropped: this account takes no name.` } : {};
  }
  if (!wanted) {
    return nameType === "Customer"
      ? { note: "This receivable account still needs a default customer." }
      : {};
  }

  const found =
    nameType === "Customer"
      ? customers.filter(
          (customer) =>
            customer.Active &&
            (sameText(customer.FullyQualifiedName, wanted) ||
              sameText(customer.DisplayName, wanted)),
        )
      : vendors.filter((vendor) => vendor.Active && sameText(vendor.DisplayName, wanted));
  if (found.length === 1) return { defaultNameType: nameType, defaultNameId: found[0].Id };
  return {
    note:
      found.length === 0
        ? `No active ${nameType.toLowerCase()} matches "${wanted}".`
        : `More than one ${nameType.toLowerCase()} matches "${wanted}".`,
  };
}
