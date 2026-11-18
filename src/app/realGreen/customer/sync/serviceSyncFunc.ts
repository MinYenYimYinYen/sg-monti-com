import { ServiceRaw } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { ServiceSearchRaw } from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/types/ServSearch";
import { remapServices } from "@/app/realGreen/customer/_lib/entities/serverFuncs/serviceServerFunc";
import { ServiceModel } from "@/app/realGreen/customer/models/ServiceModel";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { handleError } from "@/lib/errors/errorHandler";
import { streamRgPages, StreamRgPagesResult } from "@/app/realGreen/customer/sync/streamRgPages";

const LOG_PREFIX = "[service sync]";

// --- Fetch ---

/**
 * Streams every service matching `rawSearch` from RealGreen into MongoDB, one round of pages at a
 * time, so memory stays flat however many services match. See `streamRgPages` for the paging,
 * corrupted-record recovery and write-overlap rules.
 *
 * Completed services with missing production data raise the corrupted-record error at fetch time, so
 * the recovery matters most here.
 */
export function streamServices({ rawSearch }: { rawSearch: ServiceSearchRaw }): Promise<StreamRgPagesResult> {
  return streamRgPages<ServiceRaw>({
    rawSearch,
    entity: "service",
    logPrefix: LOG_PREFIX,
    onRecordsAction: bulkUpsertServices,
  });
}

// --- Upsert ---

/**
 * Remaps and bulk-upserts services to MongoDB using a single `bulkWrite` command.
 * Each service is matched by its natural key (`servId`) and replaced wholesale.
 *
 * Services with corrupted production data (completed services missing required fields)
 * are logged and skipped rather than aborting the entire batch. This handles remap-level
 * corruption; fetch-level corruption is handled in streamServices via binarySearchCorruptedRecord.
 */
export async function bulkUpsertServices(rawServices: ServiceRaw[]): Promise<number> {
  if (rawServices.length === 0) {
    console.log(`${LOG_PREFIX} Upsert skipped — no records to write`);
    return 0;
  }

  await connectToMongoDB();

  // Remap one at a time so corrupted production records can be caught and skipped.
  let skipped = 0;
  const cores = rawServices.flatMap((raw) => {
    try {
      return remapServices([raw]);
    } catch (e) {
      handleError(e, { silent: true });
      console.warn(
        `${LOG_PREFIX} Skipping servId ${raw.id} — corrupted production data: ${e instanceof Error ? e.message : String(e)}`,
      );
      skipped++;
      return [];
    }
  });

  if (skipped > 0) {
    console.warn(`${LOG_PREFIX} Skipped ${skipped} corrupted service record${skipped === 1 ? "" : "s"}`);
  }

  if (cores.length === 0) {
    console.log(`${LOG_PREFIX} Upsert skipped — all records were corrupted`);
    return 0;
  }

  await ServiceModel.bulkWrite(
    cores.map((core) => ({
      updateOne: {
        filter: { servId: core.servId },
        update: { $set: core },
        upsert: true,
      },
    })),
  );

  console.log(
    `${LOG_PREFIX} Upsert complete — ${cores.length} record${cores.length === 1 ? "" : "s"} written to MongoDB`,
  );

  return cores.length;
}
