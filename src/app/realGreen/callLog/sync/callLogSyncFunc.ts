import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import { CallLogSearchResultRaw, remapCallLogSearchResults } from "@/app/realGreen/callLog/CallLogTypes";
import { CallLogSearchRaw } from "@/app/realGreen/callLog/_lib/CallLogSearch";
import { CallLogModel } from "@/app/realGreen/callLog/models/CallLogModel";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";

const PAGE_SIZE = 500;
const MAX_CONCURRENT = 8;
const LOG_PREFIX = "[callLog sync]";

// --- Fetch ---

/**
 * Fetches all call logs matching `rawSearch` from the RealGreen API using the
 * capped exponential batch fetch algorithm (see callLogSyncPlan.md Section 4).
 *
 * Starts with 1 concurrent request, doubles each round up to MAX_CONCURRENT.
 * Terminates as soon as any page returns fewer than PAGE_SIZE records.
 *
 * Uses CallLogSearchResultRaw (PascalCase) — the shape returned by the POST endpoint.
 * This differs from CallLogRaw (camelCase) used by the GET /CallLog/Customer/{id} endpoint.
 *
 * Logs round-by-round progress and totals to the server console.
 */
export async function fetchCallLogs(rawSearch: CallLogSearchRaw): Promise<CallLogSearchResultRaw[]> {
  const allRaw: CallLogSearchResultRaw[] = [];
  let offset = 0;
  let batchCount = 1;
  let round = 0;
  let totalApiCalls = 0;

  while (true) {
    const offsets = Array.from({ length: batchCount }, (_, i) => offset + i * PAGE_SIZE);
    console.log(`${LOG_PREFIX} Round ${round} — batchCount: ${batchCount}, offsets: [${offsets.join(", ")}]`);

    const pages = await Promise.all(
      offsets.map((batchOffset) =>
        rgApi<CallLogSearchResultRaw[]>({
          path: "/CallLog/CallLogSearch",
          method: "POST",
          body: { ...rawSearch, records: PAGE_SIZE, offset: batchOffset },
        }),
      ),
    );

    totalApiCalls += pages.length;
    const pageLengths = pages.map((p) => p.length);

    // Collect results up to (but not including) the first short page.
    // Short pages (< PAGE_SIZE) signal the end of available data.
    let done = false;
    let shortPageIndex = -1;
    for (let i = 0; i < pages.length; i++) {
      allRaw.push(...pages[i]);
      if (pages[i].length < PAGE_SIZE) {
        done = true;
        shortPageIndex = i;
        break;
      }
    }

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
 * Remaps and bulk-upserts call log search results to MongoDB using a single `bulkWrite` command.
 * Each call log is matched by its natural key (`callLogId`) and replaced wholesale.
 * Notes are always replaced — RealGreen is the source of truth for note content.
 */
export async function bulkUpsertCallLogs(rawLogs: CallLogSearchResultRaw[]): Promise<number> {
  if (rawLogs.length === 0) {
    console.log(`${LOG_PREFIX} Upsert skipped — no records to write`);
    return 0;
  }

  await connectToMongoDB();

  const cores = remapCallLogSearchResults(rawLogs);

  await CallLogModel.bulkWrite(
    cores.map((core) => ({
      updateOne: {
        filter: { callLogId: core.callLogId },
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
