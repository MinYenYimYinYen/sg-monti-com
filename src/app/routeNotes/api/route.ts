import { RouteNoteContract } from "@/app/routeNotes/api/RouteNoteContract";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { RouteNoteModel } from "@/app/routeNotes/RouteNoteModel";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { RouteNote } from "@/app/routeNotes/RouteNoteTypes";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { routeNoteCapabilities } from "@/app/routeNotes/routeNoteCapabilities";

const { can } = routeNoteCapabilities;
const handlers: HandlerMap<RouteNoteContract> = {
  getByDateRange: {
    capability: can.routeNotes.read,
    handler: async ({ minDate, maxDate }) => {
      await connectToMongoDB();
      const docs = await RouteNoteModel.find({
        schedDate: { $gte: minDate, $lte: maxDate },
      }).lean();
      return { success: true, payload: cleanMongoArray<RouteNote>(docs) };
    },
  },
  upsert: {
    capability: can.routeNotes.write,
    handler: async ({ doc }) => {
      await connectToMongoDB();
      const saved = await RouteNoteModel.findOneAndUpdate(
        { routeNoteId: doc.routeNoteId },
        { $set: doc },
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject<RouteNote>(saved!) };
    },
  },
  deleteOne: {
    capability: can.routeNotes.delete,
    handler: async ({ routeNoteId }) => {
      await connectToMongoDB();
      const deleted = await RouteNoteModel.findOneAndDelete({ routeNoteId }).lean();
      return { success: true, payload: cleanMongoObject<RouteNote>(deleted!) };
    },
  },
};

export const POST = createRpcHandler<RouteNoteContract>(handlers);
