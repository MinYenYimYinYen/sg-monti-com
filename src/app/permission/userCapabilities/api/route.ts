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
import { can } from "@/permission/can";
import { loadActor } from "@/app/permission/_lib/capabilityLoaders";
import { assertText, assertTextList } from "@/app/permission/_lib/assertText";
import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { AppError } from "@/lib/errors/AppError";
import { Capability } from "@/permission/PermissionTypes";
import { capabilityRegistry } from "@/permission/capabilityRegistry";
import { canAssign, canRemove } from "@/permission/logic/assignmentGuards";
import { toUserSummary } from "@/permission/logic/userSummary";
import { addDirectMany, assignBundle, removeBundle, removeDirectMany } from "@/permission/logic/userCapabilityLogic";

function notPermitted(missing: Capability[]): AppError {
  return new AppError({
    message: `You can only assign capabilities you hold yourself. Missing: ${missing.join(", ")}`,
    type: "AUTH_ERROR",
    statusCode: 403,
  });
}

function notPermittedToRemove(missing: Capability[]): AppError {
  return new AppError({
    message: `You can only remove capabilities you hold yourself. Missing: ${missing.join(", ")}`,
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
        .select("userName firstName lastName saId isSuperUser isKiosk")
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
      const { actor, userName, holdings, bundles } = await loadAssignmentContext({ userName: params.userName });

      const result = removeBundle({ user: holdings, bundleKey, bundles, registry: capabilityRegistry });
      if (!result.ok) throw refusal("The user does not hold this bundle.");

      // `lost` is what the user really stops holding, so what a held-otherwise capability keeps is not counted.
      const allowed = canRemove({
        actorIsSuperUser: actor.isSuperUser,
        actorCapabilities: actor.capabilities,
        removing: result.lost,
        registry: capabilityRegistry,
      });
      if (!allowed.allowed) throw notPermittedToRemove(allowed.missing);

      const doc = await saveHoldings({ userName, bundleKeys: result.bundleKeys, capabilities: holdings.capabilities });
      return { success: true, payload: doc };
    },
  },

  addDirect: {
    capability: can.userCapabilities.write,
    handler: async (params) => {
      const capabilities = assertTextList({ value: params.capabilities, label: "Capabilities" });
      const { actor, userName, holdings, bundles } = await loadAssignmentContext({ userName: params.userName });

      const result = addDirectMany({ user: holdings, capabilities, bundles, registry: capabilityRegistry });
      if (!result.ok) throw refusal(`That capability does not exist: ${result.capability}.`);

      // Only what is newly granted counts: a capability the user already holds gives them nothing new.
      const allowed = canAssign({
        actorIsSuperUser: actor.isSuperUser,
        actorCapabilities: actor.capabilities,
        granting: result.added,
      });
      if (!allowed.allowed) throw notPermitted(allowed.missing);

      const doc = await saveHoldings({ userName, bundleKeys: holdings.bundleKeys, capabilities: result.capabilities });
      return { success: true, payload: doc };
    },
  },

  removeDirect: {
    capability: can.userCapabilities.write,
    handler: async (params) => {
      const capabilities = assertTextList({ value: params.capabilities, label: "Capabilities" });
      const { actor, userName, holdings } = await loadAssignmentContext({ userName: params.userName });

      const result = removeDirectMany({ user: holdings, capabilities });

      const allowed = canRemove({
        actorIsSuperUser: actor.isSuperUser,
        actorCapabilities: actor.capabilities,
        removing: result.removed,
        registry: capabilityRegistry,
      });
      if (!allowed.allowed) throw notPermittedToRemove(allowed.missing);

      const doc = await saveHoldings({ userName, bundleKeys: holdings.bundleKeys, capabilities: result.capabilities });
      return { success: true, payload: doc };
    },
  },
};

export const POST = createRpcHandler(handlers);
