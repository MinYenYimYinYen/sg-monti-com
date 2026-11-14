import { HolidayContract } from "@/app/holiday/api/HolidayContract";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { HolidayModel } from "@/app/holiday/HolidayModel";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { Holiday } from "@/app/holiday/holidayTypes";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { can } from "@/permission/can";

const handlers: HandlerMap<HolidayContract> = {
  getAll: {
    capability: can.holidays.read,
    handler: async () => {
      await connectToMongoDB();
      const docs = await HolidayModel.find({}).lean();
      return { success: true, payload: cleanMongoArray<Holiday>(docs) };
    },
  },
  upsert: {
    capability: can.holidays.write,
    handler: async ({ doc }) => {
      await connectToMongoDB();
      const saved = await HolidayModel.findOneAndUpdate(
        { holidayId: doc.holidayId },
        { $set: doc },
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject<Holiday>(saved!) };
    },
  },
  deleteOne: {
    capability: can.holidays.delete,
    handler: async ({ holidayId }) => {
      await connectToMongoDB();
      const deleted = await HolidayModel.findOneAndDelete({ holidayId }).lean();
      return { success: true, payload: cleanMongoObject<Holiday>(deleted!) };
    },
  },
};

export const POST = createRpcHandler<HolidayContract>(handlers);
