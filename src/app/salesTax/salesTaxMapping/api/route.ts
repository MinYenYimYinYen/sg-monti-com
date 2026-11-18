import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { SalesTaxMappingContract } from "@/app/salesTax/salesTaxMapping/api/SalesTaxMappingContract";
import { SalesTaxMappingModel } from "@/app/salesTax/salesTaxMapping/SalesTaxMappingModel";
import { findMnTaxTypesProblem } from "@/app/salesTax/salesTaxMapping/_lib/mnTaxTypeValidation";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { AppError } from "@/lib/errors/AppError";
import { can } from "@/permission/can";

const handlers: HandlerMap<SalesTaxMappingContract> = {
  getAll: {
    capability: can.salesTaxMappings.read,
    handler: async () => {
      await connectToMongoDB();
      const docs = await SalesTaxMappingModel.find().lean();
      return { success: true, payload: cleanMongoArray(docs) };
    },
  },

  upsert: {
    capability: can.salesTaxMappings.write,
    handler: async ({ taxCodeId, mnTaxTypes }) => {
      if (!taxCodeId.trim()) {
        throw new AppError({
          message: "A mapping needs a RealGreen tax code.",
          type: "VALIDATION_ERROR",
          statusCode: 400,
        });
      }
      const problem = findMnTaxTypesProblem(mnTaxTypes);
      if (problem) {
        throw new AppError({ message: problem, type: "VALIDATION_ERROR", statusCode: 400 });
      }
      await connectToMongoDB();
      const doc = await SalesTaxMappingModel.findOneAndUpdate(
        { taxCodeId },
        { $set: { taxCodeId, mnTaxTypes } },
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject(doc!) };
    },
  },

  remove: {
    capability: can.salesTaxMappings.delete,
    handler: async ({ taxCodeId }) => {
      await connectToMongoDB();
      await SalesTaxMappingModel.deleteOne({ taxCodeId });
      return { success: true, payload: true };
    },
  },
};

export const POST = createRpcHandler(handlers);
