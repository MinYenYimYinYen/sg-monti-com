import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { SchedPromiseContract } from "@/app/schedPromise/api/SchedPromiseContract";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import SchedPromiseModel from "@/app/schedPromise/SchedPromiseModel";
import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";
import connectDB from "@/lib/mongoose/connectDB";

const handlers: HandlerMap<SchedPromiseContract> = {
  getSchedPromises: {
    roles: ["office", "admin", "tech"],
    handler: async ({ serviceIds, programIds, customerIds }) => {
      await connectDB();

      // Build $or query for all requested entity types
      const queries = [];
      if (serviceIds?.length) {
        queries.push({ entityType: "service", entityId: { $in: serviceIds } });
      }
      if (programIds?.length) {
        queries.push({ entityType: "program", entityId: { $in: programIds } });
      }
      if (customerIds?.length) {
        queries.push({ entityType: "customer", entityId: { $in: customerIds } });
      }

      // If no IDs provided, return empty array
      if (queries.length === 0) {
        return { success: true, payload: [] };
      }

      const docs = await SchedPromiseModel.find({ $or: queries }).lean();
      const cleaned = cleanMongoArray(docs);

      return { success: true, payload: cleaned };
    },
  },
};

export const POST = createRpcHandler(handlers);
