import { rgSearch } from "@/app/realGreen/_lib/api/rgSearchApi";
import { ServiceRaw } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { ServiceSearchRaw } from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/types/ServSearch";
import { remapServices } from "@/app/realGreen/customer/_lib/entities/serverFuncs/serviceServerFunc";
import { ServiceModel } from "@/app/realGreen/customer/models/ServiceModel";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { binarySearchCorruptedRecord } from "@/app/realGreen/customer/_lib/searchUtil/searchSchemes/schemeExecution/binaryOffsetSearch";
import { handleError } from "@/lib/errors/errorHandler";

const PAGE_SIZE = 500;
const MAX_CONCURRENT = 8;
const LOG_PREFIX = "[service sync]";
const CORRUPTED_ERROR = "Nullable object must have a value.";

// --- Fetch ---

/**
 * Fetches all services matching `rawSearch` from the RealGreen API using the
 * capped exponential batch fetch algorithm.
 *
 * Starts with 1 concurrent request, doubles each round up to MAX_CONCURRENT.
 * Terminates as soon as any page returns fewer than PAGE_SIZE records.
 *
 * Uses binarySearchCorruptedRecord to recover from corrupted records mid-page
 * rather than aborting the entire fetch. This is especially important for services
 * since completed services with missing production data trigger this error.
 */
export async function fetchServices(rawSearch: ServiceSearchRaw): Promise<ServiceRaw[]> {
  const allRaw: ServiceRaw[] = [];
  let offset = 0;
  let batchCount = 1;
  let round = 0;
  let totalApiCalls = 0;

  while (true) {
    const offsets = Array.from({ length: batchCount }, (_, i) => offset + i * PAGE_SIZE);
    console.log(`${LOG_PREFIX} Round ${round} — batchCount: ${batchCount}, offsets: [${offsets.join(", ")}]`);

    const pageResults = await Promise.all(
      offsets.map(async (batchOffset) => {
        try {
          const page = await rgSearch<ServiceRaw[]>({ ...rawSearch, records: PAGE_SIZE, offset: batchOffset });
          return { records: page, recovered: false };
        } catch (e) {
          if (e instanceof Error && e.message === CORRUPTED_ERROR) {
            console.warn(`${LOG_PREFIX} Corrupted record at offset ${batchOffset} — recovering via binary search`);
            const recovered: ServiceRaw[] = [];
            for await (const { items } of binarySearchCorruptedRecord(rawSearch, batchOffset, PAGE_SIZE)) {
              recovered.push(...(items as ServiceRaw[]));
            }
            return { records: recovered, recovered: true };
          }
          throw e;
        }
      }),
    );

    totalApiCalls += pageResults.length;

    let done = false;
    let shortPageIndex = -1;
    for (let i = 0; i < pageResults.length; i++) {
      const { records, recovered } = pageResults[i];
      allRaw.push(...records);
      if (!recovered && records.length < PAGE_SIZE) {
        done = true;
        shortPageIndex = i;
        break;
      }
    }

    const pageLengths = pageResults.map((r) => r.records.length);

    if (done) {
      console.log(
        `${LOG_PREFIX} Round ${round} — results: [${pageLengths.join(", ")}] — done (short page at index ${shortPageIndex})`,
      );
      break;
    }

    console.log(`${LOG_PREFIX} Round ${round} — results: [${pageLengths.join(", ")}] — continuing`);

    offset += batchCount * PAGE_SIZE;
    batchCount = Math.min(batchCount * 2, MAX_CONCURRENT);
    round++;
  }

  console.log(
    `${LOG_PREFIX} Fetch complete — ${totalApiCalls} API call${totalApiCalls === 1 ? "" : "s"}, ${allRaw.length} record${allRaw.length === 1 ? "" : "s"} fetched`,
  );

  return allRaw;
}

// --- Upsert ---

/**
 * Remaps and bulk-upserts services to MongoDB using a single `bulkWrite` command.
 * Each service is matched by its natural key (`servId`) and replaced wholesale.
 *
 * Services with corrupted production data (completed services missing required fields)
 * are logged and skipped rather than aborting the entire batch. This handles remap-level
 * corruption; fetch-level corruption is handled in fetchServices via binarySearchCorruptedRecord.
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
