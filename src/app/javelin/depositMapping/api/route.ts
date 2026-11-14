import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { AppError } from "@/lib/errors/AppError";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { DepositFieldMappingContract } from "@/app/javelin/depositMapping/api/DepositFieldMappingContract";
import { DepositFieldMappingModel } from "@/app/javelin/depositMapping/DepositFieldMappingModel";
import { DEPOSIT_LINK_KEYS } from "@/app/javelin/_lib/ckDepositFields";
import { can } from "@/permission/can";

function validationError(message: string): AppError {
  return new AppError({ message, type: "VALIDATION_ERROR", statusCode: 400 });
}

const handlers: HandlerMap<DepositFieldMappingContract> = {
  getAll: {
    capability: can.depositFieldLinks.read,
    handler: async () => {
      await connectToMongoDB();
      const docs = await DepositFieldMappingModel.find().lean();
      return { success: true, payload: cleanMongoArray(docs) };
    },
  },

  upsert: {
    capability: can.depositFieldLinks.write,
    handler: async ({ field, qboAccountId, defaultNameType, defaultNameId }) => {
      if (!DEPOSIT_LINK_KEYS.includes(field)) throw validationError("That is not a deposit account.");
      if (typeof qboAccountId !== "string" || qboAccountId.length === 0) {
        throw validationError("Choose a QuickBooks account.");
      }
      if (Boolean(defaultNameType) !== Boolean(defaultNameId)) {
        throw validationError("A default name needs both its type and its QuickBooks Id.");
      }
      await connectToMongoDB();
      // The name is unset when absent, so changing the linked account never keeps a stale name.
      const update =
        defaultNameType && defaultNameId
          ? { $set: { field, qboAccountId, defaultNameType, defaultNameId } }
          : { $set: { field, qboAccountId }, $unset: { defaultNameType: "", defaultNameId: "" } };
      const doc = await DepositFieldMappingModel.findOneAndUpdate({ field }, update, {
        upsert: true,
        new: true,
      }).lean();
      return { success: true, payload: cleanMongoObject(doc!) };
    },
  },

  remove: {
    capability: can.depositFieldLinks.delete,
    handler: async ({ field }) => {
      if (!DEPOSIT_LINK_KEYS.includes(field)) throw validationError("That is not a deposit account.");
      await connectToMongoDB();
      await DepositFieldMappingModel.deleteOne({ field });
      return { success: true, payload: true };
    },
  },
};

export const POST = createRpcHandler(handlers);
