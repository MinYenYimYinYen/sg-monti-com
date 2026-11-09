import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { loadQboAccounts } from "@/app/qbo/account/_lib/qboAccountServer";
import { loadQboCustomers } from "@/app/qbo/customer/_lib/qboCustomerServer";
import { loadQboVendors } from "@/app/qbo/vendor/_lib/qboVendorServer";
import { AccountMappingModel } from "@/app/account/AccountMappingModel";
import { GlobalSettingsModel } from "@/app/globalSettings/_lib/GlobalSettingsModel";
import { DepositFieldMappingModel } from "@/app/javelin/depositMapping/DepositFieldMappingModel";
import { DepositAccountMap, DepositField, GenLedgerAccountEntry } from "@/app/javelin/JavelinTypes";
import {
  JavelinMigrationLine,
  JavelinMigrationReport,
} from "@/app/javelin/migration/JavelinMigrationTypes";
import {
  planDepositMigration,
  planGenLedgerMigration,
} from "@/app/javelin/migration/migrationUtils";

// Server only. Reads the legacy name-based maps in GlobalSettings and proposes QuickBooks Id
// links. A preview writes nothing. Applying writes only "create" lines and never overwrites an
// existing link. The legacy maps are left in place until the user has checked the result.

function toWrite(line: JavelinMigrationLine) {
  return {
    qboAccountId: line.qboAccountId!,
    ...(line.defaultNameType && line.defaultNameId
      ? { defaultNameType: line.defaultNameType, defaultNameId: line.defaultNameId }
      : {}),
  };
}

export async function runJavelinMigration({ apply }: { apply: boolean }): Promise<JavelinMigrationReport> {
  await connectToMongoDB();
  const [settings, accounts, customers, vendors, existingGl, existingDeposit] = await Promise.all([
    GlobalSettingsModel.findOne().lean(),
    loadQboAccounts(),
    loadQboCustomers(),
    loadQboVendors(),
    AccountMappingModel.find().select({ rgAccountId: 1 }).lean(),
    DepositFieldMappingModel.find().select({ field: 1 }).lean(),
  ]);
  const lookups = { accounts, customers, vendors };

  const genLedger = planGenLedgerMigration({
    legacyMap: (settings?.genLedgerAccountMap ?? {}) as Record<string, GenLedgerAccountEntry>,
    existingRgAccountIds: new Set(existingGl.map((doc) => doc.rgAccountId)),
    lookups,
  });
  const deposit = planDepositMigration({
    legacyMap: (settings?.depositAccountMap ?? {}) as Partial<DepositAccountMap>,
    existingFields: new Set(existingDeposit.map((doc) => doc.field as DepositField)),
    lookups,
  });

  let createdCount = 0;
  if (apply) {
    for (const line of genLedger.filter((l) => l.status === "create")) {
      // setOnInsert-style guard: the filter excludes an existing link, so nothing is overwritten.
      const result = await AccountMappingModel.updateOne(
        { rgAccountId: line.targetKey },
        { $setOnInsert: { rgAccountId: line.targetKey, ...toWrite(line) } },
        { upsert: true },
      );
      if (result.upsertedCount > 0) createdCount += 1;
    }
    for (const line of deposit.filter((l) => l.status === "create")) {
      const result = await DepositFieldMappingModel.updateOne(
        { field: line.targetKey },
        { $setOnInsert: { field: line.targetKey, ...toWrite(line) } },
        { upsert: true },
      );
      if (result.upsertedCount > 0) createdCount += 1;
    }
  }
  return { genLedger, deposit, applied: apply, createdCount };
}
