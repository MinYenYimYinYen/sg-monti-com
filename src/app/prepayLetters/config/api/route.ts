import type { HandlerMap } from "@/lib/api/types/rpcUtils";
import type { PrepayConfigContract } from "../prepayConfigContract";
import { PrepayConfigModel } from "../PrepayConfigModel";
import type { PrepayConfigDoc } from "../prepayConfigTypes";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { assertRole } from "@/app/auth/_lib/assertRole";
import { AppError } from "@/lib/errors/AppError";
import { headers } from "next/headers";

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

/** Returns true if the current request's user has the admin role. */
async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    await assertRole(["admin"]);
    return true;
  } catch {
    return false;
  }
}

const handlers: HandlerMap<PrepayConfigContract> = {
  getConfigs: {
    roles: ["admin", "office", "tech"],
    handler: async () => {
      await connectToMongoDB();
      const docs = await PrepayConfigModel.find().lean();
      return { success: true, payload: cleanMongoArray(docs) as PrepayConfigDoc[] };
    },
  },

  saveConfig: {
    roles: ["admin", "office", "tech"],
    handler: async ({ config }) => {
      await connectToMongoDB();
      const saId = await getCurrentUserSaId();

      const configId = makeConfigId(config.name, saId);
      const docToSave: PrepayConfigDoc = {
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
        payload: cleanMongoObject(result!) as PrepayConfigDoc,
      };
    },
  },

  deleteConfig: {
    roles: ["admin", "office", "tech"],
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

      const isAdmin = await isCurrentUserAdmin();
      if (!isAdmin && existing.saId !== saId) {
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
