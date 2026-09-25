import { rgSearch } from "@/app/realGreen/_lib/api/rgSearchApi";
import { ProgramRaw } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { ProgramSearchRaw } from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/types/ProgSearch";
import { remapPrograms } from "@/app/realGreen/customer/_lib/entities/serverFuncs/ProgramFuncs";
import { ProgramModel } from "@/app/realGreen/customer/models/ProgramModel";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { binarySearchCorruptedRecord } from "@/app/realGreen/customer/_lib/searchUtil/searchSchemes/schemeExecution/binaryOffsetSearch";

const PAGE_SIZE = 500;
const MAX_CONCURRENT = 8;
const LOG_PREFIX = "[program sync]";
const CORRUPTED_ERROR = "Nullable object must have a value.";

// --- Fetch ---

/**
 * Fetches all programs matching `rawSearch` from the RealGreen API using the
 * capped exponential batch fetch algorithm.
 *
 * Starts with 1 concurrent request, doubles each round up to MAX_CONCURRENT.
 * Terminates as soon as any page returns fewer than PAGE_SIZE records.
 *
 * Uses binarySearchCorruptedRecord to recover from corrupted records mid-page
 * rather than aborting the entire fetch.
 */
export async function fetchPrograms(rawSearch: ProgramSearchRaw): Promise<ProgramRaw[]> {
  const allRaw: ProgramRaw[] = [];
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
          const page = await rgSearch<ProgramRaw[]>({ ...rawSearch, records: PAGE_SIZE, offset: batchOffset });
          return { records: page, recovered: false };
        } catch (e) {
          if (e instanceof Error && e.message === CORRUPTED_ERROR) {
            console.warn(`${LOG_PREFIX} Corrupted record at offset ${batchOffset} — recovering via binary search`);
            const recovered: ProgramRaw[] = [];
            for await (const { items } of binarySearchCorruptedRecord(rawSearch, batchOffset, PAGE_SIZE)) {
              recovered.push(...(items as ProgramRaw[]));
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
 * Remaps and bulk-upserts programs to MongoDB using a single `bulkWrite` command.
 * Each program is matched by its natural key (`progId`) and replaced wholesale.
 */
export async function bulkUpsertPrograms(rawPrograms: ProgramRaw[]): Promise<number> {
  if (rawPrograms.length === 0) {
    console.log(`${LOG_PREFIX} Upsert skipped — no records to write`);
    return 0;
  }

  await connectToMongoDB();

  const cores = remapPrograms(rawPrograms);

  await ProgramModel.bulkWrite(
    cores.map((core) => ({
      updateOne: {
        filter: { progId: core.progId },
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
