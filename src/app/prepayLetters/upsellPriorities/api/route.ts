import type { HandlerMap } from "@/lib/api/types/rpcUtils";
import type { UpsellPrioritiesContract } from "../upsellPrioritiesContract";
import { UpsellPrioritiesModel } from "../UpsellPrioritiesModel";
import type { UpsellPrioritiesDoc } from "../upsellPrioritiesTypes";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
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

/** Derives a stable upsellPrioritiesId slug from name + saId. */
function makeUpsellPrioritiesId({ name, saId }: { name: string; saId: string }): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  return `up__${slug(saId)}__${slug(name)}`;
}

const handlers: HandlerMap<UpsellPrioritiesContract> = {
  getUpsellPriorities: {
    roles: ["admin", "office", "tech"],
    handler: async () => {
      await connectToMongoDB();
      const docs = await UpsellPrioritiesModel.find().lean();
      return { success: true, payload: cleanMongoArray(docs) as UpsellPrioritiesDoc[] };
    },
  },

  saveUpsellPriorities: {
    roles: ["admin", "office", "tech"],
    handler: async ({ upsellPriorities }) => {
      await connectToMongoDB();
      const saId = await getCurrentUserSaId();
      const upsellPrioritiesId = makeUpsellPrioritiesId({ name: upsellPriorities.name, saId });

      const result = await UpsellPrioritiesModel.findOneAndUpdate(
        { upsellPrioritiesId },
        {
          upsellPrioritiesId,
          name: upsellPriorities.name,
          saId,
          priorities: upsellPriorities.priorities,
        },
        { upsert: true, new: true },
      ).lean();

      return {
        success: true,
        payload: cleanMongoObject(result!) as UpsellPrioritiesDoc,
      };
    },
  },

  deleteUpsellPriorities: {
    roles: ["admin", "office", "tech"],
    handler: async ({ upsellPrioritiesId }) => {
      await connectToMongoDB();
      const saId = await getCurrentUserSaId();

      const existing = await UpsellPrioritiesModel.findOne({ upsellPrioritiesId }).lean();
      if (!existing) {
        throw new AppError({
          message: "Upsell priorities not found",
          type: "VALIDATION_ERROR",
          statusCode: 404,
        });
      }

      if (existing.saId !== saId) {
        throw new AppError({
          message: "You do not own these upsell priorities",
          type: "AUTH_ERROR",
          statusCode: 403,
        });
      }

      await UpsellPrioritiesModel.deleteOne({ upsellPrioritiesId });
      return { success: true, payload: null };
    },
  },
};

export const POST = createRpcHandler<UpsellPrioritiesContract>(handlers);
