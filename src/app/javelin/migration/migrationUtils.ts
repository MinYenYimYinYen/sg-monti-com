import { formatQboAccountLabel } from "@/app/account/_lib/accountMappingView";
import { DepositField, GenLedgerAccountEntry } from "@/app/javelin/JavelinTypes";
import { rgAccountIdFromCrmName } from "@/app/javelin/_lib/genLedgerRows";
import { JavelinMigrationLine } from "@/app/javelin/migration/JavelinMigrationTypes";
import {
  LegacyEntry,
  matchDefaultName,
  matchQboAccount,
  MigrationLookups,
} from "@/app/javelin/migration/migrationMatchUtils";

// Pure. Plans the migration of the legacy name-based Javelin maps to QuickBooks Id links. Never
// overwrites an existing link.

function lineFor({
  source,
  targetKey,
  entry,
  rgAccountId,
  lookups,
  isAlreadyMapped,
}: {
  source: string;
  targetKey: string;
  entry: LegacyEntry;
  rgAccountId: string | null;
  lookups: MigrationLookups;
  isAlreadyMapped: boolean;
}): JavelinMigrationLine {
  if (isAlreadyMapped) return { source, targetKey, status: "alreadyMapped" };
  const match = matchQboAccount({ entry, rgAccountId, accounts: lookups.accounts });
  if ("problem" in match) return { source, targetKey, status: "unmatched", note: match.problem };
  const name = matchDefaultName({
    name: entry.name,
    account: match.account,
    customers: lookups.customers,
    vendors: lookups.vendors,
  });
  return {
    source,
    targetKey,
    status: "create",
    qboAccountId: match.account.Id,
    qboAccountLabel: formatQboAccountLabel(match.account),
    ...name,
  };
}

/** Two CRM accounts can share an rgAccountId. They must agree, or neither is migrated. */
function flagConflicts(lines: JavelinMigrationLine[]): JavelinMigrationLine[] {
  const accountIdsByKey = new Map<string, Set<string>>();
  for (const line of lines) {
    if (line.status !== "create" || !line.qboAccountId) continue;
    const ids = accountIdsByKey.get(line.targetKey) ?? new Set<string>();
    ids.add(line.qboAccountId);
    accountIdsByKey.set(line.targetKey, ids);
  }
  return lines.map((line) =>
    line.status === "create" && (accountIdsByKey.get(line.targetKey)?.size ?? 0) > 1
      ? {
          ...line,
          status: "conflict",
          note: "Other CRM accounts with this number map to a different QuickBooks account.",
        }
      : line,
  );
}

/** Two CRM accounts that agree collapse into one write. */
function dedupeCreates(lines: JavelinMigrationLine[]): JavelinMigrationLine[] {
  const seen = new Set<string>();
  return lines.map((line) => {
    if (line.status !== "create") return line;
    if (seen.has(line.targetKey)) {
      return {
        ...line,
        status: "alreadyMapped",
        note: "Covered by another CRM account with the same number.",
      };
    }
    seen.add(line.targetKey);
    return line;
  });
}

export function planGenLedgerMigration({
  legacyMap,
  existingRgAccountIds,
  lookups,
}: {
  legacyMap: Record<string, GenLedgerAccountEntry>;
  existingRgAccountIds: Set<string>;
  lookups: MigrationLookups;
}): JavelinMigrationLine[] {
  const lines = Object.entries(legacyMap)
    .filter(([, entry]) => entry.qbName?.trim())
    .map(([crmName, entry]) => {
      const rgAccountId = rgAccountIdFromCrmName(crmName);
      return lineFor({
        source: crmName,
        targetKey: rgAccountId,
        entry,
        rgAccountId,
        lookups,
        isAlreadyMapped: existingRgAccountIds.has(rgAccountId),
      });
    });
  return dedupeCreates(flagConflicts(lines));
}

export function planDepositMigration({
  legacyMap,
  existingFields,
  lookups,
}: {
  legacyMap: Partial<Record<DepositField, LegacyEntry>>;
  existingFields: Set<DepositField>;
  lookups: MigrationLookups;
}): JavelinMigrationLine[] {
  return (Object.entries(legacyMap) as [DepositField, LegacyEntry][])
    .filter(([, entry]) => entry.qbName?.trim())
    .map(([field, entry]) =>
      lineFor({
        source: field,
        targetKey: field,
        entry,
        rgAccountId: null,
        lookups,
        isAlreadyMapped: existingFields.has(field),
      }),
    );
}
