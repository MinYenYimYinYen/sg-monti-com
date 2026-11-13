import type { HandlerMap } from "@/lib/api/types/rpcUtils";
import type { PrepayConfigContract } from "../prepayConfigContract";
import { PrepayConfigModel } from "../PrepayConfigModel";
import type { PrepayConfig } from "../prepayConfigTypes";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { loadVerifiedCaller } from "@/app/permission/_lib/capabilityLoaders";
import { AppError } from "@/lib/errors/AppError";
import { headers } from "next/headers";
import { prepayLettersCapabilities } from "@/app/prepayLetters/prepayLettersCapabilities";

const { can } = prepayLettersCapabilities;

/** Reads the current user's saId from the proxy-injected header. */
async function getCurrentUserSaId(): Promise<string> {
  const headerStore = await headers();
  const saId = headerStore.get("x-user-id");
  if (!saId) {
    throw new AppError({
      message: "Authentication required",
      type: "AUTH_ERROR",
      statusCode: 401,
    });
  }
  return saId;
}

/** Derives a stable configId slug from name + saId. */
function makeConfigId(name: string, saId: string): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  return `pc__${slug(saId)}__${slug(name)}`;
}

/**
 * The one override of ownership: a confirmed superuser may delete anyone's config. Verified from
 * the cookie and the user document, never from an identity header.
 */
async function isCurrentUserSuperUser(): Promise<boolean> {
  const caller = await loadVerifiedCaller();
  return caller.isSuperUser;
}

const handlers: HandlerMap<PrepayConfigContract> = {
  getConfigs: {
    capability: can.prepayConfigs.read,
    handler: async () => {
      await connectToMongoDB();
      const docs = await PrepayConfigModel.find().lean();
      return { success: true, payload: cleanMongoArray(docs) as PrepayConfig[] };
    },
  },

  saveConfig: {
    capability: can.prepayConfigs.write,
    handler: async ({ config }) => {
      await connectToMongoDB();
      const saId = await getCurrentUserSaId();

      const configId = makeConfigId(config.name, saId);
      const docToSave: PrepayConfig = {
        ...config,
        configId,
        saId,
      };

      const result = await PrepayConfigModel.findOneAndUpdate(
        { configId },
        docToSave,
        { upsert: true, new: true },
      ).lean();

      return {
        success: true,
        payload: cleanMongoObject(result!) as PrepayConfig,
      };
    },
  },

  deleteConfig: {
    capability: can.prepayConfigs.delete,
    handler: async ({ configId }) => {
      await connectToMongoDB();
      const saId = await getCurrentUserSaId();

      const existing = await PrepayConfigModel.findOne({ configId }).lean();
      if (!existing) {
        throw new AppError({
          message: "Config not found",
          type: "VALIDATION_ERROR",
          statusCode: 404,
        });
      }

      const isSuperUser = await isCurrentUserSuperUser();
      if (!isSuperUser && existing.saId !== saId) {
        throw new AppError({
          message: "You do not own this config",
          type: "AUTH_ERROR",
          statusCode: 403,
        });
      }

      await PrepayConfigModel.deleteOne({ configId });
      return { success: true, payload: null };
    },
  },
};

export const POST = createRpcHandler<PrepayConfigContract>(handlers);
