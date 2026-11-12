import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { AccountMappingContract } from "@/app/account/api/AccountMappingContract";
import { AccountMappingModel } from "@/app/account/AccountMappingModel";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { AppError } from "@/lib/errors/AppError";
import { accountCapabilities } from "@/app/account/accountCapabilities";


const { can } = accountCapabilities
const handlers: HandlerMap<AccountMappingContract> = {
  getAll: {
    capability: can.accountMappings.read,
    handler: async () => {
      await connectToMongoDB();
      const docs = await AccountMappingModel.find().lean();
      return { success: true, payload: cleanMongoArray(docs) };
    },
  },

  upsert: {
    capability: can.accountMappings.write,
    handler: async ({ rgAccountId, qboAccountId, defaultNameType, defaultNameId }) => {
      if (Boolean(defaultNameType) !== Boolean(defaultNameId)) {
        throw new AppError({
          message: "A default name needs both its type and its QuickBooks Id.",
          type: "VALIDATION_ERROR",
          statusCode: 400,
        });
      }
      await connectToMongoDB();
      // The name is unset when absent, so changing the linked account never keeps a stale name.
      const update =
        defaultNameType && defaultNameId
          ? { $set: { rgAccountId, qboAccountId, defaultNameType, defaultNameId } }
          : {
              $set: { rgAccountId, qboAccountId },
              $unset: { defaultNameType: "", defaultNameId: "" },
            };
      const doc = await AccountMappingModel.findOneAndUpdate({ rgAccountId }, update, {
        upsert: true,
        new: true,
      }).lean();
      return { success: true, payload: cleanMongoObject(doc!) };
    },
  },

  remove: {
    capability: can.accountMappings.delete,
    handler: async ({ rgAccountId }) => {
      await connectToMongoDB();
      await AccountMappingModel.deleteOne({ rgAccountId });
      return { success: true, payload: true };
    },
  },
};

export const POST = createRpcHandler(handlers);
