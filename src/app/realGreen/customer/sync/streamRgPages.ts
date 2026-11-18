import { rgSearch } from "@/app/realGreen/_lib/api/rgSearchApi";
import { binarySearchCorruptedRecord } from "@/app/realGreen/customer/_lib/searchUtil/searchSchemes/schemeExecution/binaryOffsetSearch";
import { RawData, SearchCriteriaRaw } from "@/app/realGreen/customer/_lib/searchUtil/searchSchemes/types/SearchScheme";
import {
  CorruptedContext,
  CorruptedEntityType,
} from "@/app/realGreen/customer/sync/corruptedRecords/CorruptedSyncRecordTypes";
import { CorruptedSyncRecordModel } from "@/app/realGreen/customer/sync/corruptedRecords/CorruptedSyncRecordModel";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";

export const PAGE_SIZE = 500;
/** Concurrent page requests at full ramp. A round is at most `MAX_CONCURRENT * PAGE_SIZE` records. */
export const MAX_CONCURRENT = 16;
const CORRUPTED_ERROR = "Nullable object must have a value.";

type PageResult<TRaw> = {
  records: TRaw[];
  recovered: boolean;
  corruptedContexts: CorruptedContext[];
};

/** The two network calls the loop makes, injectable so the loop can be tested without RealGreen. */
export type PageFetchers<TRaw> = {
  fetchPage: (params: { rawSearch: SearchCriteriaRaw; offset: number }) => Promise<TRaw[]>;
  recoverPage: (params: {
    rawSearch: SearchCriteriaRaw;
    offset: number;
    entity: CorruptedEntityType;
    syncTimestamp: string;
  }) => Promise<{ records: TRaw[]; corruptedContexts: CorruptedContext[] }>;
};

function defaultFetchers<TRaw extends RawData[number]>(): PageFetchers<TRaw> {
  return {
    fetchPage: ({ rawSearch, offset }) =>
      rgSearch<TRaw[]>({ ...rawSearch, records: PAGE_SIZE, offset }),
    recoverPage: async ({ rawSearch, offset, entity, syncTimestamp }) => {
      const { results, corruptedContexts } = await binarySearchCorruptedRecord<RawData>(
        rawSearch,
        offset,
        PAGE_SIZE,
        entity,
        syncTimestamp,
      );
      const records = results.flatMap(({ items }) => items as TRaw[]);
      return { records, corruptedContexts };
    },
  };
}

export type StreamRgPagesResult = {
  /** Records handed to `onRecordsAction`. */
  fetchedCount: number;
  /** Sum of what `onRecordsAction` returned (records it actually wrote). */
  writtenCount: number;
  /** True when a short page ended the search: nothing is left to fetch. */
  finished: boolean;
  /** Where to resume when the time budget stopped the loop early. Null when `finished`. */
  nextOffset: number | null;
};

function heapMb(): number {
  return Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
}

/**
 * Pages through a RealGreen search and hands each round of records to `onRecordsAction`, so no more
 * than one round (plus the one being written) is ever held in memory, however many records match.
 *
 * Paging: starts with one page, doubles the concurrent pages each round up to `MAX_CONCURRENT`, and
 * finishes when a page comes back short. A page with a corrupted record is recovered by binary
 * search and counted as full, since it may be short even when more records exist.
 *
 * Writes overlap the next fetch but never each other: the write for round N is awaited before the
 * write for round N+1 starts and before this function returns, so an error surfaces at the next
 * await and nothing is still in flight when the caller releases its lock.
 *
 * `timeBudgetMs` stops the loop at a round boundary once exceeded and returns `nextOffset`, so a
 * caller with a request time limit can resume. The offsets are only stable while the search
 * results do not change; a record deleted mid-search can shift a later one out of its page.
 */
export async function streamRgPages<TRaw extends RawData[number]>({
  rawSearch,
  entity,
  logPrefix,
  onRecordsAction,
  startOffset = 0,
  timeBudgetMs,
  fetchers = defaultFetchers<TRaw>(),
}: {
  rawSearch: SearchCriteriaRaw;
  entity: CorruptedEntityType;
  logPrefix: string;
  onRecordsAction: (records: TRaw[]) => Promise<number>;
  startOffset?: number;
  timeBudgetMs?: number;
  fetchers?: PageFetchers<TRaw>;
}): Promise<StreamRgPagesResult> {
  const startedAt = Date.now();
  const allCorruptedContexts: CorruptedContext[] = [];
  // Shared timestamp for all corrupted record hits in this sync operation
  const syncTimestamp = new Date().toISOString();

  let offset = startOffset;
  let batchCount = 1;
  let round = 0;
  let totalApiCalls = 0;
  let fetchedCount = 0;
  let writtenCount = 0;
  let finished = false;
  let pendingWrite: Promise<number> | null = null;

  async function settlePendingWrite() {
    if (!pendingWrite) return;
    const write = pendingWrite;
    pendingWrite = null;
    writtenCount += await write;
  }

  try {
    while (true) {
      const roundStart = Date.now();
      const offsets = Array.from({ length: batchCount }, (_, index) => offset + index * PAGE_SIZE);

      // Each page is fetched on its own so a corrupted page can be recovered without cancelling its siblings.
      const pageResults: PageResult<TRaw>[] = await Promise.all(
        offsets.map(async (batchOffset) => {
          try {
            const records = await fetchers.fetchPage({ rawSearch, offset: batchOffset });
            return { records, recovered: false, corruptedContexts: [] };
          } catch (e) {
            if (e instanceof Error && e.message === CORRUPTED_ERROR) {
              console.warn(`${logPrefix} Corrupted record at offset ${batchOffset} - recovering via binary search`);
              const recovery = await fetchers.recoverPage({ rawSearch, offset: batchOffset, entity, syncTimestamp });
              return { records: recovery.records, recovered: true, corruptedContexts: recovery.corruptedContexts };
            }
            throw e;
          }
        }),
      );
      totalApiCalls += pageResults.length;
      for (const { corruptedContexts } of pageResults) allCorruptedContexts.push(...corruptedContexts);

      // Pages are in offset order, so the first short page marks the end and anything after it is empty.
      const roundRecords: TRaw[] = [];
      for (const { records, recovered } of pageResults) {
        roundRecords.push(...records);
        if (!recovered && records.length < PAGE_SIZE) {
          finished = true;
          break;
        }
      }

      // The previous write ran while this round was fetched. Wait for it before starting the next, so
      // at most two rounds are ever in memory and a failed write stops the loop here.
      await settlePendingWrite();
      fetchedCount += roundRecords.length;
      if (roundRecords.length > 0) {
        pendingWrite = onRecordsAction(roundRecords);
        // The write is awaited later, after the next fetch. Without a handler attached now, a write
        // that rejects in the meantime counts as unhandled and can end the process. This does not
        // swallow the error: awaiting `pendingWrite` still throws it.
        pendingWrite.catch(() => undefined);
      }

      console.log(
        `${logPrefix} Round ${round}: ${pageResults.length} pages from offset ${offset}, ${roundRecords.length} records, ` +
          `${Date.now() - roundStart}ms, heap ${heapMb()}MB${finished ? " (done)" : ""}`,
      );

      offset += batchCount * PAGE_SIZE;
      round++;
      if (finished) break;

      if (timeBudgetMs !== undefined && Date.now() - startedAt >= timeBudgetMs) {
        console.log(`${logPrefix} Time budget of ${timeBudgetMs}ms reached - stopping before offset ${offset}`);
        break;
      }
      batchCount = Math.min(batchCount * 2, MAX_CONCURRENT);
    }
    // The last round's write: its failure must reach the caller, so it is awaited here, not in `finally`.
    await settlePendingWrite();
  } finally {
    // Reached with a write still pending only when the loop threw. Drain it so nothing runs after the
    // caller releases its lock, but keep the original error: a failure here is logged, not rethrown.
    if (pendingWrite) {
      const write = pendingWrite;
      pendingWrite = null;
      await write.then(
        (count) => {
          writtenCount += count;
        },
        (error: unknown) => {
          console.error(`${logPrefix} A write failed after the loop stopped`, error);
        },
      );
    }
  }

  console.log(
    `${logPrefix} Stream ${finished ? "complete" : "paused"} - ${totalApiCalls} API calls, ${fetchedCount} records fetched, ` +
      `${writtenCount} written`,
  );

  // Persist corrupted contexts if any were encountered
  if (allCorruptedContexts.length > 0) {
    console.warn(`${logPrefix} Persisting ${allCorruptedContexts.length} corrupted record contexts`);
    await connectToMongoDB();
    await CorruptedSyncRecordModel.insertMany(allCorruptedContexts);
  }

  return { fetchedCount, writtenCount, finished, nextOffset: finished ? null : offset };
}
