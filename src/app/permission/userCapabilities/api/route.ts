import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { UserCapabilitiesContract } from "@/app/permission/userCapabilities/api/UserCapabilitiesContract";
import { UserCapabilitiesModel } from "@/app/permission/userCapabilities/UserCapabilitiesModel";
import UserModel from "@/app/auth/_models/UserModel";
import {
  loadAssignmentContext,
  refusal,
  saveHoldings,
} from "@/app/permission/userCapabilities/api/assignmentHelpers";
import { capabilityManagementCapabilities } from "@/app/permission/capabilityManagementCapabilities";
import { loadActor } from "@/app/permission/_lib/capabilityLoaders";
import { assertText } from "@/app/permission/_lib/assertText";
import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { AppError } from "@/lib/errors/AppError";
import { Capability } from "@/permission/PermissionTypes";
import { capabilityRegistry } from "@/permission/capabilityRegistry";
import { canAssign } from "@/permission/logic/assignmentGuards";
import { toUserSummary } from "@/permission/logic/userSummary";
import { addDirect, assignBundle, removeBundle, removeDirect } from "@/permission/logic/userCapabilityLogic";

const { can } = capabilityManagementCapabilities;

function notPermitted(missing: Capability[]): AppError {
  return new AppError({
    message: `You can only assign capabilities you hold yourself. Missing: ${missing.join(", ")}`,
    type: "AUTH_ERROR",
    statusCode: 403,
  });
}

const handlers: HandlerMap<UserCapabilitiesContract> = {
  listUsers: {
    capability: can.userCapabilities.read,
    handler: async () => {
      await connectToMongoDB();
      // An explicit field list, not the whole document: the password hash and email never leave.
      const users = await UserModel.find()
        .select("userName firstName lastName saId role isSuperUser isKiosk")
        .lean();
      return { success: true, payload: users.map(toUserSummary) };
    },
  },

  getAll: {
    capability: can.userCapabilities.read,
    handler: async () => {
      await connectToMongoDB();
      const docs = await UserCapabilitiesModel.find().lean();
      return { success: true, payload: cleanMongoArray(docs) };
    },
  },

  getMine: {
    capability: "public",
    handler: async () => {
      // Public, so verify the cookie here. With no valid session this is a 401 like checkAuth.
      const actor = await loadActor();
      return {
        success: true,
        payload: { capabilities: [...actor.capabilities], isSuperUser: actor.isSuperUser },
      };
    },
  },

  assignBundle: {
    capability: can.userCapabilities.write,
    handler: async (params) => {
      const bundleKey = assertText({ value: params.bundleKey, label: "Bundle key" });
      const { actor, userName, holdings, bundles } = await loadAssignmentContext({ userName: params.userName });

      const result = assignBundle({ user: holdings, bundleKey, bundles });
      if (!result.ok) {
        throw refusal(result.reason === "unknownBundle" ? "No such bundle." : "The user already holds this bundle.");
      }

      const granting = bundles.find((bundle) => bundle.bundleKey === bundleKey)?.capabilities ?? [];
      const allowed = canAssign({
        actorIsSuperUser: actor.isSuperUser,
        actorCapabilities: actor.capabilities,
        granting,
      });
      if (!allowed.allowed) throw notPermitted(allowed.missing);

      const doc = await saveHoldings({ userName, bundleKeys: result.bundleKeys, capabilities: result.capabilities });
      return { success: true, payload: doc };
    },
  },

  removeBundle: {
    capability: can.userCapabilities.write,
    handler: async (params) => {
      const bundleKey = assertText({ value: params.bundleKey, label: "Bundle key" });
      const { userName, holdings, bundles } = await loadAssignmentContext({ userName: params.userName });

      const result = removeBundle({ user: holdings, bundleKey, bundles, registry: capabilityRegistry });
      if (!result.ok) throw refusal("The user does not hold this bundle.");

      const doc = await saveHoldings({ userName, bundleKeys: result.bundleKeys, capabilities: holdings.capabilities });
      return { success: true, payload: doc };
    },
  },

  addDirect: {
    capability: can.userCapabilities.write,
    handler: async (params) => {
      const capability = assertText({ value: params.capability, label: "Capability" });
      const { actor, userName, holdings, bundles } = await loadAssignmentContext({ userName: params.userName });

      const result = addDirect({ user: holdings, capability, bundles, registry: capabilityRegistry });
      if (!result.ok) {
        const messages = {
          unknownCapability: "That capability does not exist.",
          alreadyDirect: "The user already holds this capability directly.",
          coveredByBundle: "A bundle the user holds already grants this capability.",
        };
        throw refusal(messages[result.reason]);
      }

      const allowed = canAssign({
        actorIsSuperUser: actor.isSuperUser,
        actorCapabilities: actor.capabilities,
        granting: [capability as Capability],
      });
      if (!allowed.allowed) throw notPermitted(allowed.missing);

      const doc = await saveHoldings({ userName, bundleKeys: holdings.bundleKeys, capabilities: result.capabilities });
      return { success: true, payload: doc };
    },
  },

  removeDirect: {
    capability: can.userCapabilities.write,
    handler: async (params) => {
      const capability = assertText({ value: params.capability, label: "Capability" });
      const { userName, holdings } = await loadAssignmentContext({ userName: params.userName });

      const result = removeDirect({ user: holdings, capability });
      if (!result.ok) throw refusal("The user does not hold this capability directly.");

      const doc = await saveHoldings({ userName, bundleKeys: holdings.bundleKeys, capabilities: result.capabilities });
      return { success: true, payload: doc };
    },
  },
};

export const POST = createRpcHandler(handlers);
