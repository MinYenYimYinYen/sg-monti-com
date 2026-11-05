import { UpdateQuery } from "mongoose";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { ImportMerchantMappingModel } from "@/app/qbo/importCCTxn/models/ImportCCTxnMappingModels";
import { MerchantMapping } from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";
import { confirmedUpdateMode } from "@/app/qbo/importCCTxn/_lib/importConfirmUtils";

/**
 * Stores one merchant mapping. The same vendor keeps what was confirmed and adds to it
 * (atomically, so two people cannot overwrite each other); a new vendor starts the confirmed
 * list over.
 *
 * `otherAccountIds` null means "leave the list alone", which is what the Map tab's batch save
 * does: posting adds to that list on the server, so a browser's old copy must not replace it.
 * A non-null list replaces the stored one.
 */
export async function storeMerchantMapping({
  merchantKey,
  ownerUserName,
  vendorId,
  defaultAccountId,
  otherAccountIds,
  confirmedMerchants,
}: {
  merchantKey: string;
  ownerUserName: string | null;
  vendorId: string;
  defaultAccountId: string;
  otherAccountIds: string[] | null;
  confirmedMerchants: string[];
}): Promise<MerchantMapping> {
  await connectToMongoDB();
  const filter = { merchantKey, ownerUserName };
  const existing = await ImportMerchantMappingModel.findOne(filter).lean();

  const mode = confirmedUpdateMode({
    existingVendorId: existing ? existing.vendorId : null,
    vendorId,
  });

  const fields: Partial<MerchantMapping> = { vendorId, defaultAccountId };
  if (otherAccountIds !== null) {
    fields.otherAccountIds = otherAccountIds;
  } else if (existing && existing.defaultAccountId !== defaultAccountId) {
    // Only reachable if someone changed the default since this browser loaded it. The old
    // default is kept as one of the other accounts, so nothing a person chose is lost.
    fields.otherAccountIds = [...new Set([existing.defaultAccountId, ...existing.otherAccountIds])].filter(
      (accountId) => accountId !== defaultAccountId,
    );
  }

  const update: UpdateQuery<MerchantMapping> =
    mode === "add"
      ? { $set: fields, $addToSet: { confirmedMerchants: { $each: confirmedMerchants } } }
      : { $set: { ...fields, confirmedMerchants } };

  const saved = await ImportMerchantMappingModel.findOneAndUpdate(filter, update, {
    upsert: true,
    new: true,
  }).lean();
  return cleanMongoObject(saved!) as MerchantMapping;
}
