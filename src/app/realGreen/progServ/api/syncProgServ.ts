import { ProgServModel } from "@/app/realGreen/progServ/_lib/models/ProgServModel";
import { dateCompare } from "@/lib/primatives/dates/dateCompare";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import { RawProgServ, remapProgServs } from "@/app/realGreen/progServ/_lib/types/ProgServ";
import { delay } from "@/lib/async/delay";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";

export async function syncProgServ(progDefIds: number[]) {
  await connectToMongoDB();

  // 1. Check Cache Freshness
  const lastUpdated = await ProgServModel.findOne()
    .sort({ updatedAt: -1 })
    .lean();
  const isFresh =
    lastUpdated &&
    dateCompare.isWithinDays({
      dateLo: new Date(lastUpdated.updatedAt).toISOString(),
      dateHi: new Date().toISOString(),
      maxDiff: 0.5, // 12 hours approx (0.5 days)
      options: {
        valueUndefinedReturn: false,
        comparedToUndefinedReturn: false,
      },
    });

  if (isFresh) {
    return ProgServModel.find({});
  }

  // 2. Fetch from RealGreen (Throttled)
  const rawProgServs: RawProgServ[] = [];
  for (const id of progDefIds) {
    try {
      const result = await rgApi<RawProgServ[]>({
        path: `/ProgramCode/${id}/Services`,
        method: "GET",
      });
      if (Array.isArray(result)) {
        rawProgServs.push(...result);
      }
      await delay(10); // Throttle
    } catch (e) {
      console.warn(`Failed to fetch services for ProgDefId ${id}`, e);
    }
  }

  const remapped = remapProgServs(rawProgServs);

  // 3. Upsert to Mongo
  if (remapped.length > 0) {
    const bulkOps = remapped.map((doc) => ({
      updateOne: {
        filter: { progServId: doc.progServId },
        update: { $set: doc },
        upsert: true,
      },
    }));
    await ProgServModel.bulkWrite(bulkOps, { ordered: false });
  }

  // 4. Return fresh list
  return ProgServModel.find({});
}
