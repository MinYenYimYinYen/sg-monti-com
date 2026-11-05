import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";
import { QboVendorSummary } from "@/app/qbo/vendor/types/QboVendorTypes";
import { MerchantMapping, SkipRule } from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";
import { ImportRow } from "@/app/qbo/importCCTxn/types/ImportRowTypes";

// Pure helpers behind the Map tab. Selectors and components stay thin wrappers around these.

export type MerchantGroupStatus = "unmapped" | "needsAttention" | "mapped";

export type MerchantGroup = {
  merchantKey: string;
  /** The description as the bank wrote it; the key is its uppercased form. */
  description: string;
  rowCount: number;
  totalCents: number;
  mapping: MerchantMapping | null;
  skipRule: SkipRule | null;
  status: MerchantGroupStatus;
  /** Set when a stored mapping points at something QuickBooks no longer offers. */
  problem: string | null;
};

const STATUS_ORDER: Record<MerchantGroupStatus, number> = {
  unmapped: 0,
  needsAttention: 1,
  mapped: 2,
};

function findMappingProblem({
  mapping,
  vendorMap,
  accountMap,
}: {
  mapping: MerchantMapping;
  vendorMap: Map<string, QboVendorSummary>;
  accountMap: Map<string, QboAccount>;
}): string | null {
  const vendor = vendorMap.get(mapping.vendorId);
  if (!vendor) return "The mapped vendor is not in QuickBooks. Pick another.";
  if (!vendor.Active) return `The mapped vendor "${vendor.DisplayName}" is inactive. Pick another.`;

  const account = accountMap.get(mapping.defaultAccountId);
  if (!account) return "The mapped account is not in QuickBooks. Pick another.";
  if (!account.Active) {
    return `The mapped account "${account.FullyQualifiedName}" is inactive. Pick another.`;
  }

  return null;
}

/**
 * One group per merchant among the pending rows, so a merchant is mapped once however many
 * transactions it has. Unmapped merchants come first, then broken mappings, then mapped ones.
 */
export function buildMerchantGroups({
  pendingRows,
  merchantMappingMap,
  skipRuleMap,
  vendorMap,
  accountMap,
}: {
  pendingRows: ImportRow[];
  merchantMappingMap: Map<string, MerchantMapping>;
  skipRuleMap: Map<string, SkipRule>;
  vendorMap: Map<string, QboVendorSummary>;
  accountMap: Map<string, QboAccount>;
}): MerchantGroup[] {
  const groupsByKey = new Map<string, MerchantGroup>();

  for (const row of pendingRows) {
    const existing = groupsByKey.get(row.merchantKey);
    if (existing) {
      existing.rowCount += 1;
      existing.totalCents += row.amountCents;
      continue;
    }

    const mapping = merchantMappingMap.get(row.merchantKey) ?? null;
    const problem = mapping ? findMappingProblem({ mapping, vendorMap, accountMap }) : null;
    groupsByKey.set(row.merchantKey, {
      merchantKey: row.merchantKey,
      description: row.description,
      rowCount: 1,
      totalCents: row.amountCents,
      mapping,
      skipRule: skipRuleMap.get(row.merchantKey) ?? null,
      status: !mapping ? "unmapped" : problem ? "needsAttention" : "mapped",
      problem,
    });
  }

  return [...groupsByKey.values()].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.merchantKey.localeCompare(b.merchantKey),
  );
}

/**
 * The mapping to store. When the default account changes, the old default moves into the
 * merchant's other accounts, so the list of accounts a merchant has used keeps growing.
 */
export function buildMerchantMappingToSave({
  merchantKey,
  vendorId,
  accountId,
  existing,
}: {
  merchantKey: string;
  vendorId: string;
  accountId: string;
  existing: MerchantMapping | null;
}): MerchantMapping {
  const previousAccountIds = existing
    ? [existing.defaultAccountId, ...existing.otherAccountIds]
    : [];
  const otherAccountIds = [...new Set(previousAccountIds)].filter(
    (previousId) => previousId !== accountId,
  );

  return {
    merchantKey,
    ownerUserName: existing ? existing.ownerUserName : null,
    vendorId,
    defaultAccountId: accountId,
    otherAccountIds,
  };
}

export function pickActiveAccounts(accounts: QboAccount[]): QboAccount[] {
  return accounts.filter((account) => account.Active);
}
