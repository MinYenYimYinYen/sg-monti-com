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

const handlers: HandlerMap<PriorityServiceContract> = {
  getAll: {
    roles: ["admin", "office"],
    handler: async () => {
      await connectToMongoDB();
      const docs = await PriorityServiceModel.find({}).lean();
      return {
        success: true,
        payload: cleanMongoArray<PriorityServiceDoc>(docs),
      };
    },
  },
  upsert: {
    roles: ["admin", "office"],
    handler: async ({ doc }) => {
      await connectToMongoDB();
      const saved = await PriorityServiceModel.findOneAndUpdate(
        { servId: doc.servId },
        { $set: doc },
        { upsert: true, new: true },
      ).lean();
      return {
        success: true,
        payload: cleanMongoObject<PriorityServiceDoc>(saved!),
      };
    },
  },
  deleteOne: {
    roles: ["admin", "office"],
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
