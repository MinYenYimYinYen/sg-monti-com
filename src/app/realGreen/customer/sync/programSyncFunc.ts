import { ProgramRaw } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { ProgramSearchRaw } from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/types/ProgSearch";
import { remapPrograms } from "@/app/realGreen/customer/_lib/entities/serverFuncs/ProgramFuncs";
import { ProgramModel } from "@/app/realGreen/customer/models/ProgramModel";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { streamRgPages, StreamRgPagesResult } from "@/app/realGreen/customer/sync/streamRgPages";

const LOG_PREFIX = "[program sync]";

// --- Fetch ---

/**
 * Streams every program matching `rawSearch` from RealGreen into MongoDB, one round of pages at a
 * time, so memory stays flat however many programs match. See `streamRgPages` for the paging,
 * corrupted-record recovery and write-overlap rules.
 */
export function streamPrograms({ rawSearch }: { rawSearch: ProgramSearchRaw }): Promise<StreamRgPagesResult> {
  return streamRgPages<ProgramRaw>({
    rawSearch,
    entity: "program",
    logPrefix: LOG_PREFIX,
    onRecordsAction: bulkUpsertPrograms,
  });
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
