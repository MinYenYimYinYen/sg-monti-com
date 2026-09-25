import { rgSearch } from "@/app/realGreen/_lib/api/rgSearchApi";
import { CustomerRaw } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { CustomerSearchRaw } from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/types/CustSearch";
import { remapCustomers } from "@/app/realGreen/customer/_lib/entities/serverFuncs/CustomerFuncs";
import { CustomerModel } from "@/app/realGreen/customer/models/CustomerModel";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";

const PAGE_SIZE = 500;
const MAX_CONCURRENT = 8;
const LOG_PREFIX = "[customer sync]";

// --- Fetch ---

/**
 * Fetches all customers matching `rawSearch` from the RealGreen API using the
 * capped exponential batch fetch algorithm.
 *
 * Starts with 1 concurrent request, doubles each round up to MAX_CONCURRENT.
 * Terminates as soon as any page returns fewer than PAGE_SIZE records.
 */
export async function fetchCustomers(rawSearch: CustomerSearchRaw): Promise<CustomerRaw[]> {
  const allRaw: CustomerRaw[] = [];
  let offset = 0;
  let batchCount = 1;
  let round = 0;
  let totalApiCalls = 0;

  while (true) {
    const offsets = Array.from({ length: batchCount }, (_, i) => offset + i * PAGE_SIZE);
    console.log(`${LOG_PREFIX} Round ${round} — batchCount: ${batchCount}, offsets: [${offsets.join(", ")}]`);

    const pages = await Promise.all(
      offsets.map((batchOffset) =>
        rgSearch<CustomerRaw[]>({ ...rawSearch, records: PAGE_SIZE, offset: batchOffset }),
      ),
    );

    totalApiCalls += pages.length;
    const pageLengths = pages.map((p) => p.length);

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
