import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { LoadoutContract, LoadoutKey } from "@/app/scheduling/dailyInventory/api/LoadoutContract";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { LoadoutDocModel } from "@/app/scheduling/dailyInventory/models/LoadoutDocModel";
import { cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { LoadoutDoc } from "@/app/loadout/LoadoutTypes";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

const handlers: HandlerMap<LoadoutContract> = {
  upsertLoadout: {
    roles: ["admin", "office", "tech"],
    handler: async ({ loadout }) => {
      await connectToMongoDB();
      const upsertResult = await LoadoutDocModel.findOneAndUpdate(
        { employeeId: loadout.employeeId, routeDate: loadout.routeDate },
        loadout,
        { upsert: true, new: true },
      ).lean();

      const upsertedLoadout: LoadoutDoc = cleanMongoObject(upsertResult);

      return { success: true, payload: upsertedLoadout };
    },
  },
  getLoadouts: {
    roles: ["admin", "office", "tech"],
    handler: async ({ dateRange }) => {
      await connectToMongoDB();
      const { min, max } = dateRange;

      // One time START

      // One time END

      const loadouts = await LoadoutDocModel.find({
        routeDate: { $gte: min, $lte: max },
      }).lean();

      return { success: true, payload: loadouts.map(cleanMongoObject) };
    },
  },

  getLoadout: {
    roles: ["admin", "office", "tech"],
    handler: async ({ employeeId, routeDate }) => {
      await connectToMongoDB();
      const loadout = await LoadoutDocModel.findOne({
        employeeId,
        routeDate,
      }).lean();

      if (!loadout) {
        return { success: true, payload: null };
      }

      return { success: true, payload: cleanMongoObject(loadout) };
    },
  },

  getLoadoutKeys: {
    roles: ["admin", "office", "tech"],
    handler: async ({ dateRange }) => {
      await connectToMongoDB();
      const { min, max } = dateRange;

      const docs = await LoadoutDocModel.find(
        { routeDate: { $gte: min, $lte: max } },
        { employeeId: 1, routeDate: 1, _id: 0 },
      )
        .sort({ routeDate: -1 })
        .lean();

      const keys: LoadoutKey[] = docs.map((doc) => ({
        employeeId: doc.employeeId,
        routeDate: doc.routeDate,
      }));

      return { success: true, payload: keys };
    },
  },
};

export const POST = createRpcHandler(handlers);

