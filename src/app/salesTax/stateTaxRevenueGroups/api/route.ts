import { randomUUID } from "crypto";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { StateTaxRevenueGroupContract } from "@/app/salesTax/stateTaxRevenueGroups/api/StateTaxRevenueGroupContract";
import { StateTaxRevenueGroupModel } from "@/app/salesTax/stateTaxRevenueGroups/StateTaxRevenueGroupModel";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { AppError } from "@/lib/errors/AppError";
import { can } from "@/permission/can";

const CODE_PATTERN = /^\d{3}$/;

function validationError(message: string): AppError {
  return new AppError({ message, type: "VALIDATION_ERROR", statusCode: 400 });
}

function requireMnTaxCode(mnTaxCode: string) {
  if (typeof mnTaxCode !== "string" || !CODE_PATTERN.test(mnTaxCode)) {
    throw validationError("A tax type code is 3 digits.");
  }
}

// The groups configure the same return the mappings do, so they share the mappings' capabilities.
const handlers: HandlerMap<StateTaxRevenueGroupContract> = {
  getAll: {
    capability: can.salesTaxMappings.read,
    handler: async () => {
      await connectToMongoDB();
      const docs = await StateTaxRevenueGroupModel.find().lean();
      return { success: true, payload: cleanMongoArray(docs) };
    },
  },

  createGroup: {
    capability: can.salesTaxMappings.write,
    handler: async ({ mnTaxCode }) => {
      requireMnTaxCode(mnTaxCode);
      await connectToMongoDB();
      if (await StateTaxRevenueGroupModel.exists({ mnTaxCode })) {
        throw validationError(`Tax type ${mnTaxCode} is already in a revenue group.`);
      }
      const revenueGroupKey = randomUUID().slice(0, 8);
      const doc = await StateTaxRevenueGroupModel.findOneAndUpdate(
        { mnTaxCode },
        { $set: { mnTaxCode, revenueGroupKey } },
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject(doc!) };
    },
  },

  joinGroup: {
    capability: can.salesTaxMappings.write,
    handler: async ({ mnTaxCode, revenueGroupKey }) => {
      requireMnTaxCode(mnTaxCode);
      if (typeof revenueGroupKey !== "string" || !revenueGroupKey.trim()) {
        throw validationError("Choose a revenue group to join.");
      }
      await connectToMongoDB();
      if (!(await StateTaxRevenueGroupModel.exists({ revenueGroupKey }))) {
        throw validationError("That revenue group no longer exists.");
      }
      const doc = await StateTaxRevenueGroupModel.findOneAndUpdate(
        { mnTaxCode },
        { $set: { mnTaxCode, revenueGroupKey } },
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject(doc!) };
    },
  },

  leaveGroup: {
    capability: can.salesTaxMappings.delete,
    handler: async ({ mnTaxCode }) => {
      requireMnTaxCode(mnTaxCode);
      await connectToMongoDB();
      await StateTaxRevenueGroupModel.deleteOne({ mnTaxCode });
      return { success: true, payload: true };
    },
  },
};

export const POST = createRpcHandler(handlers);
