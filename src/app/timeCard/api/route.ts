import { TimeCardContract } from "@/app/timeCard/api/timeCardContract";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { PunchModel } from "@/app/timeCard/PunchModel";
import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";
import { Punch } from "@/app/timeCard/TimeCardTypes";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { WriteError } from "mongodb";

const handlers: HandlerMap<TimeCardContract> = {
  importPunches: {
    roles: ["admin", "office"],
    handler: async ({ punches }) => {
      await connectToMongoDB();

      const updates = punches.map((punch) => ({
        updateOne: {
          filter: { punchId: punch.punchId },
          update: { $set: punch },
          upsert: true,
        },
      }));

      const result = await PunchModel.bulkWrite(updates);

      const hasErrors = result.hasWriteErrors();
      let errors: WriteError[] | null = null;
      if (hasErrors) {
        errors = result.getWriteErrors();
        console.error("Punch bulk write failed with errors:", { errors });
      }

      const imported = result.upsertedCount + result.modifiedCount;

      return { success: true, payload: { imported, errors } };
    },
  },

  getPunches: {
    roles: ["admin", "office", "tech"],
    handler: async ({ employeeIds, dateRange }) => {
      await connectToMongoDB();

      const query: Record<string, unknown> = {};

      if (employeeIds && employeeIds.length > 0) {
        query.employeeId = { $in: employeeIds };
      }

      if (dateRange) {
        query.punchDate = { $gte: dateRange.min, $lte: dateRange.max };
      }

      const docs = await PunchModel.find(query).lean();

      return { success: true, payload: cleanMongoArray<Punch>(docs) };
    },
  },

  getLastImportedDate: {
    roles: ["admin", "office", "tech"],
    handler: async (_params) => {
      await connectToMongoDB();

      // Aggregate: find the most recent punchDate where every punch on that
      // date has all segments fully clocked in and out (no empty inTime/outTime).
      const result = await PunchModel.aggregate<{ punchDate: string }>([
        {
          $addFields: {
            // True if every segment has both inTime and outTime non-empty
            fullyComplete: {
              $allElementsTrue: {
                $map: {
                  input: "$segments",
                  as: "seg",
                  in: {
                    $and: [
                      { $gt: ["$$seg.inTime", ""] },
                      { $gt: ["$$seg.outTime", ""] },
                    ],
                  },
                },
              },
            },
          },
        },
        // Keep only punches that are fully complete
        { $match: { fullyComplete: true } },
        // Group by date, counting punches — we need all punches on the date to be complete
        {
          $group: {
            _id: "$punchDate",
            totalPunches: { $sum: 1 },
            completePunches: { $sum: { $cond: ["$fullyComplete", 1, 0] } },
          },
        },
        // Only dates where every punch is complete (totalPunches === completePunches)
        { $match: { $expr: { $eq: ["$totalPunches", "$completePunches"] } } },
        { $sort: { _id: -1 } },
        { $limit: 1 },
        { $project: { _id: 0, punchDate: "$_id" } },
      ]);

      const lastDate = result[0]?.punchDate ?? null;

      return { success: true, payload: lastDate };
    },
  },
};

export const POST = createRpcHandler<TimeCardContract>(handlers);
