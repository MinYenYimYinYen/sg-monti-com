import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { CapabilityBundleContract } from "@/app/permission/capabilityBundle/api/CapabilityBundleContract";
import { CapabilityBundleModel } from "@/app/permission/capabilityBundle/CapabilityBundleModel";
import { UserCapabilitiesModel } from "@/app/permission/userCapabilities/UserCapabilitiesModel";
import { UserCapabilitiesDoc } from "@/app/permission/userCapabilities/UserCapabilitiesTypes";
import { can } from "@/permission/can";
import { assertText } from "@/app/permission/_lib/assertText";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { AppError } from "@/lib/errors/AppError";
import { capabilityRegistry } from "@/permission/capabilityRegistry";
import { saveBundle } from "@/permission/logic/bundleLogic";

function validationError(message: string): AppError {
  return new AppError({ message, type: "VALIDATION_ERROR", statusCode: 400 });
}

const handlers: HandlerMap<CapabilityBundleContract> = {
  getAll: {
    capability: can.bundles.read,
    handler: async () => {
      await connectToMongoDB();
      const docs = await CapabilityBundleModel.find().lean();
      return { success: true, payload: cleanMongoArray(docs) };
    },
  },

  upsert: {
    capability: "superUser",
    handler: async (params) => {
      const bundleKey = assertText({ value: params.bundleKey, label: "Bundle key" });
      const name = assertText({ value: params.name, label: "Name" });
      const { description, capabilities } = params;
      if (!Array.isArray(capabilities) || !capabilities.every((capability) => typeof capability === "string")) {
        throw validationError("Capabilities must be a list of strings.");
      }
      if (description !== undefined && typeof description !== "string") {
        throw validationError("Description must be text.");
      }

      await connectToMongoDB();
      const existing = await CapabilityBundleModel.findOne({ bundleKey }).lean();
      const holders = await UserCapabilitiesModel.find({ bundleKeys: bundleKey }).lean();

      const result = saveBundle({
        bundleKey,
        capabilities,
        existingBundles: existing ? [existing] : [],
        users: holders,
        registry: capabilityRegistry,
      });
      if (!result.ok) {
        throw validationError(
          result.reason === "invalidKey"
            ? "Bundle key must start with a letter and use only letters, digits, _ or -."
            : `Unknown capabilities: ${result.unknown.join(", ")}`,
        );
      }

      const bundleDoc = await CapabilityBundleModel.findOneAndUpdate(
        { bundleKey },
        {
          $set: { name, capabilities: result.capabilities, ...(description ? { description } : {}) },
          ...(description ? {} : { $unset: { description: "" } }),
        },
        { upsert: true, new: true },
      ).lean();

      // The bundle is saved first. If a strip below fails, a harmless duplicate remains (access is
      // always the plain union) and saving the bundle again repairs it.
      const updatedUsers: UserCapabilitiesDoc[] = [];
      for (const strip of result.stripDirect) {
        const updated = await UserCapabilitiesModel.findOneAndUpdate(
          { userName: strip.userName },
          { $pull: { capabilities: { $in: strip.capabilities } } },
          { new: true },
        ).lean();
        if (updated) updatedUsers.push(cleanMongoObject(updated) as UserCapabilitiesDoc);
      }

      return { success: true, payload: { bundle: cleanMongoObject(bundleDoc!), updatedUsers } };
    },
  },

  remove: {
    capability: "superUser",
    handler: async (params) => {
      const bundleKey = assertText({ value: params.bundleKey, label: "Bundle key" });
      await connectToMongoDB();

      const holderCount = await UserCapabilitiesModel.countDocuments({ bundleKeys: bundleKey });
      if (holderCount > 0) {
        throw validationError(`${holderCount} user(s) still hold this bundle. Remove it from them first.`);
      }

      await CapabilityBundleModel.deleteOne({ bundleKey });
      return { success: true, payload: true };
    },
  },
};

export const POST = createRpcHandler(handlers);
