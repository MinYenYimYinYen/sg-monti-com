import { AccountMappingNameType } from "@/app/account/AccountMappingTypes";

/**
 * - create: a QuickBooks account was found, and no link exists yet.
 * - alreadyMapped: a link already exists. Migration never overwrites one.
 * - unmatched: no single QuickBooks account matched.
 * - conflict: the same target key came up twice with different QuickBooks accounts.
 */
export type JavelinMigrationStatus = "create" | "alreadyMapped" | "unmatched" | "conflict";

/** One legacy mapping entry and what migrating it would do. */
export type JavelinMigrationLine = {
  /** The CRM account name, or the deposit field. */
  source: string;
  /** The rgAccountId (general ledger) or deposit field the new link is stored under. */
  targetKey: string;
  status: JavelinMigrationStatus;
  qboAccountId?: string;
  qboAccountLabel?: string;
  defaultNameType?: AccountMappingNameType;
  defaultNameId?: string;
  note?: string;
};

export type JavelinMigrationReport = {
  genLedger: JavelinMigrationLine[];
  deposit: JavelinMigrationLine[];
  /** False for a preview, true once the links were written. */
  applied: boolean;
  createdCount: number;
};
