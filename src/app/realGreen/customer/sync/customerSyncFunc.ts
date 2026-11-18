import { CustomerRaw } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { CustomerSearchRaw } from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/types/CustSearch";
import { remapCustomers } from "@/app/realGreen/customer/_lib/entities/serverFuncs/CustomerFuncs";
import { CustomerModel } from "@/app/realGreen/customer/models/CustomerModel";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { streamRgPages, StreamRgPagesResult } from "@/app/realGreen/customer/sync/streamRgPages";

const LOG_PREFIX = "[customer sync]";

// --- Fetch ---

/**
 * Streams every customer matching `rawSearch` from RealGreen into MongoDB, one round of pages at a
 * time, so memory stays flat however many customers match. See `streamRgPages` for the paging,
 * corrupted-record recovery and write-overlap rules.
 *
 * Pass `startOffset` and `timeBudgetMs` to run in resumable parts: the result's `nextOffset` is where
 * the next part continues.
 */
export function streamCustomers({
  rawSearch,
  startOffset,
  timeBudgetMs,
}: {
  rawSearch: CustomerSearchRaw;
  startOffset?: number;
  timeBudgetMs?: number;
}): Promise<StreamRgPagesResult> {
  return streamRgPages<CustomerRaw>({
    rawSearch,
    entity: "customer",
    logPrefix: LOG_PREFIX,
    onRecordsAction: bulkUpsertCustomers,
    startOffset,
    timeBudgetMs,
  });
}

// --- Upsert ---

/**
 * Remaps and bulk-upserts customers to MongoDB using a single `bulkWrite` command.
 * Each customer is matched by its natural key (`custId`) and replaced wholesale.
 */
export async function bulkUpsertCustomers(rawCustomers: CustomerRaw[]): Promise<number> {
  if (rawCustomers.length === 0) {
    console.log(`${LOG_PREFIX} Upsert skipped — no records to write`);
    return 0;
  }

  await connectToMongoDB();

  const cores = remapCustomers(rawCustomers);

  await CustomerModel.bulkWrite(
    cores.map((core) => ({
      updateOne: {
        filter: { custId: core.custId },
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
