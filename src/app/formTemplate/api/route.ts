import type { HandlerMap } from "@/lib/api/types/rpcUtils";
import type { FormTemplateContract } from "../FormTemplateContract";
import { FormTemplateModel } from "../FormTemplateModel";
import type { FormTemplateDoc } from "../FormTemplateTypes";
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

/** Derives a stable templateId slug from saId + templateName. */
function makeTemplateId({ templateName, saId }: { templateName: string; saId: string }): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  return `ft__${slug(saId)}__${slug(templateName)}`;
}

const handlers: HandlerMap<FormTemplateContract> = {
  getAll: {
    roles: ["admin", "office"],
    handler: async () => {
      await connectToMongoDB();
      const docs = await FormTemplateModel.find({}).lean();
      const cleaned = cleanMongoArray<FormTemplateDoc>(docs);
      return {
        success: true,
        payload: cleaned,
      };
    },
  },

  upsert: {
    roles: ["admin", "office"],
    handler: async ({ template }) => {
      await connectToMongoDB();
      const saId = await getCurrentUserSaId();
      // Never trust the client's templateId/saId: deriving both here is what keeps a
      // save from landing on someone else's template.
      const templateId = makeTemplateId({ templateName: template.templateName, saId });
      const docToSave: FormTemplateDoc = { ...template, templateId, saId };
      const saved = await FormTemplateModel.findOneAndUpdate(
        { templateId },
        { $set: docToSave },
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject<FormTemplateDoc>(saved!) };
    },
  },

  deleteOne: {
    roles: ["admin", "office"],
    handler: async ({ templateId }) => {
      await connectToMongoDB();
      const saId = await getCurrentUserSaId();

      const existing = await FormTemplateModel.findOne({ templateId }).lean();
      if (!existing) {
        throw new AppError({
          message: "Template not found",
          type: "VALIDATION_ERROR",
          statusCode: 404,
        });
      }
      if (!existing.saId || existing.saId !== saId) {
        throw new AppError({
          message: "You do not own this template",
          type: "AUTH_ERROR",
          statusCode: 403,
        });
      }

      await FormTemplateModel.deleteOne({ templateId });
      return { success: true, payload: null };
    },
  },
};

export const POST = createRpcHandler<FormTemplateContract>(handlers);

