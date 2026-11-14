import { PriorityServiceContract } from "@/app/priorityService/api/PriorityServiceContract";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { PriorityServiceModel } from "@/app/priorityService/PriorityServiceModel";
import {
  cleanMongoArray,
  cleanMongoObject,
} from "@/lib/mongoose/cleanMongoObj";
import { PriorityServiceDoc } from "@/app/priorityService/PriorityServiceTypes";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { can } from "@/permission/can";

const handlers: HandlerMap<PriorityServiceContract> = {
  getAll: {
    capability: can.priorityServices.read,
    handler: async () => {
      await connectToMongoDB();
      const docs = await PriorityServiceModel.find({}).lean();
      const sorted = cleanMongoArray<PriorityServiceDoc>(docs).sort((a, b) => {
        const aDate = a.date ?? a.dateRange?.min ?? "";
        const bDate = b.date ?? b.dateRange?.min ?? "";
        return aDate.localeCompare(bDate);
      });
      return {
        success: true,
        payload: cleanMongoArray<PriorityServiceDoc>(sorted),
      };
    },
  },
  upsert: {
    capability: can.priorityServices.write,
    handler: async ({ doc }) => {
      await connectToMongoDB();
      // Explicitly unset the inactive date field so switching between "single date"
      // and "date range" doesn't leave a stale value in the document.
      // $set alone only adds/updates fields — it does not remove absent ones.
      const unsetFields: Record<string, 1> = doc.date !== undefined
        ? { dateRange: 1 }
        : { date: 1 };
      const saved = await PriorityServiceModel.findOneAndUpdate(
        { servId: doc.servId },
        { $set: doc, $unset: unsetFields },
        { upsert: true, new: true },
      ).lean();
      return {
        success: true,
        payload: cleanMongoObject<PriorityServiceDoc>(saved!),
      };
    },
  },
  deleteOne: {
    capability: can.priorityServices.delete,
    handler: async ({ servId }) => {
      await connectToMongoDB();
      const deleted = await PriorityServiceModel.findOneAndDelete({
        servId,
      }).lean();
      return {
        success: true,
        payload: cleanMongoObject<PriorityServiceDoc>(deleted!),
      };
    },
  },
};

export const POST = createRpcHandler<PriorityServiceContract>(handlers);
