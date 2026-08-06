import { PlannedTimeOffContract } from "@/app/plannedTimeOff/api/PlannedTimeOffContract";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { PlannedTimeOffModel } from "@/app/plannedTimeOff/PlannedTimeOffModel";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { PlannedTimeOff } from "@/app/plannedTimeOff/plannedTimeOffTypes";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

const handlers: HandlerMap<PlannedTimeOffContract> = {
  getAll: {
    roles: ["admin", "office"],
    handler: async () => {
      await connectToMongoDB();
      const docs = await PlannedTimeOffModel.find({}).lean();
      return { success: true, payload: cleanMongoArray<PlannedTimeOff>(docs) };
    },
  },
  upsert: {
    roles: ["admin", "office"],
    handler: async ({ doc }) => {
      await connectToMongoDB();
      const saved = await PlannedTimeOffModel.findOneAndUpdate(
        { plannedTimeOffId: doc.plannedTimeOffId },
        { $set: doc },
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject<PlannedTimeOff>(saved!) };
    },
  },
  deleteOne: {
    roles: ["admin", "office"],
    handler: async ({ plannedTimeOffId }) => {
      await connectToMongoDB();
      const deleted = await PlannedTimeOffModel.findOneAndDelete({ plannedTimeOffId }).lean();
      return { success: true, payload: cleanMongoObject<PlannedTimeOff>(deleted!) };
    },
  },
};

export const POST = createRpcHandler<PlannedTimeOffContract>(handlers);
