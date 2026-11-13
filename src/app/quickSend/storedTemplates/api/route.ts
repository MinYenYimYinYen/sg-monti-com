import type { HandlerMap } from "@/lib/api/types/rpcUtils";
import type { StoredTemplatesContract } from "../storedTemplatesContract";
import { StoredTemplateModel } from "../StoredTemplateModel";
import { TemplateGroupModel } from "../TemplateGroupModel";
import type {
  StoredTemplateDoc,
  TemplateGroupDoc,
} from "../StoredTemplateTypes";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import {
  cleanMongoArray,
  cleanMongoObject,
} from "@/lib/mongoose/cleanMongoObj";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { loadVerifiedCaller } from "@/app/permission/_lib/capabilityLoaders";
import { AppError } from "@/lib/errors/AppError";
import { headers } from "next/headers";
import { quickSendCapabilities } from "@/app/quickSend/quickSendCapabilities";

const { can } = quickSendCapabilities;

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

/** Derives a stable templateId slug from name + saId. */
function makeTemplateId(name: string, saId: string): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  return `qs2__${slug(saId)}__${slug(name)}`;
}

/** Derives a stable groupId slug from a group name. */
function makeGroupId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * The one override of ownership: a confirmed superuser may delete or move anyone's template.
 * Verified from the cookie and the user document, never from an identity header.
 */
async function isCurrentUserSuperUser(): Promise<boolean> {
  const caller = await loadVerifiedCaller();
  return caller.isSuperUser;
}

/**
 * Mongoose stores `Map`-typed schema fields as `Map` instances even after `.lean()`.
 * Convert `auxPurposes` to a plain object so it serializes correctly over JSON.
 */
function normalizeTemplate(doc: StoredTemplateDoc): StoredTemplateDoc {
  return {
    ...doc,
    auxPurposes:
      doc.auxPurposes instanceof Map
        ? Object.fromEntries(doc.auxPurposes as unknown as Map<string, string>)
        : (doc.auxPurposes ?? {}),
  };
}

const handlers: HandlerMap<StoredTemplatesContract> = {
  getTemplates: {
    capability: can.storedTemplates.read,
    handler: async () => {
      await connectToMongoDB();

      const docs = await StoredTemplateModel.find().lean();
      const templates = (cleanMongoArray(docs) as StoredTemplateDoc[]).map(normalizeTemplate);
      return { success: true, payload: templates };
    },
  },

  getGroups: {
    capability: can.templateGroups.read,
    handler: async () => {
      await connectToMongoDB();
      const docs = await TemplateGroupModel.find().lean();
      const groups = cleanMongoArray(docs) as TemplateGroupDoc[];
      return { success: true, payload: groups };
    },
  },

  saveTemplate: {
    capability: can.storedTemplates.write,
    handler: async ({ template }) => {
      await connectToMongoDB();
      const saId = await getCurrentUserSaId();

      const templateId = makeTemplateId(template.name, saId);
      const docToSave: StoredTemplateDoc = {
        ...template,
        templateId,
        saId,
      };

      const result = await StoredTemplateModel.findOneAndUpdate(
        { templateId },
        docToSave,
        { upsert: true, new: true },
      ).lean();

      return {
        success: true,
        payload: normalizeTemplate(cleanMongoObject(result!) as StoredTemplateDoc),
      };
    },
  },

  deleteTemplate: {
    capability: can.storedTemplates.delete,
    handler: async ({ templateId }) => {
      await connectToMongoDB();
      const saId = await getCurrentUserSaId();

      const existing = await StoredTemplateModel.findOne({ templateId }).lean();
      if (!existing) {
        throw new AppError({
          message: "Template not found",
          type: "VALIDATION_ERROR",
          statusCode: 404,
        });
      }

      const isSuperUser = await isCurrentUserSuperUser();
      if (!isSuperUser && existing.saId !== saId) {
        throw new AppError({
          message: "You do not own this template",
          type: "AUTH_ERROR",
          statusCode: 403,
        });
      }

      await StoredTemplateModel.deleteOne({ templateId });
      return { success: true, payload: null };
    },
  },

  createGroup: {
    capability: can.templateGroups.write,
    handler: async ({ name }) => {
      await connectToMongoDB();
      const groupId = makeGroupId(name);

      const existing = await TemplateGroupModel.findOne({ groupId }).lean();
      if (existing) {
        throw new AppError({
          message: `A group named "${name}" already exists`,
          type: "VALIDATION_ERROR",
          statusCode: 400,
        });
      }

      const doc: TemplateGroupDoc = { groupId, name };
      await TemplateGroupModel.create(doc);
      return { success: true, payload: doc };
    },
  },

  renameGroup: {
    capability: can.templateGroups.write,
    handler: async ({ groupId, newName }) => {
      await connectToMongoDB();

      const group = await TemplateGroupModel.findOne({ groupId }).lean();
      if (!group) {
        throw new AppError({
          message: "Group not found",
          type: "VALIDATION_ERROR",
          statusCode: 404,
        });
      }

      const result = await TemplateGroupModel.findOneAndUpdate(
        { groupId },
        { name: newName },
        { new: true },
      ).lean();

      return {
        success: true,
        payload: cleanMongoObject(result!) as TemplateGroupDoc,
      };
    },
  },

  deleteGroup: {
    capability: can.templateGroups.delete,
    handler: async ({ groupId }) => {
      await connectToMongoDB();

      const group = await TemplateGroupModel.findOne({ groupId }).lean();
      if (!group) {
        throw new AppError({
          message: "Group not found",
          type: "VALIDATION_ERROR",
          statusCode: 404,
        });
      }

      // Refuse if any templates still belong to this group
      const templateCount = await StoredTemplateModel.countDocuments({
        groupId,
      });
      if (templateCount > 0) {
        throw new AppError({
          message: `Cannot delete group: ${templateCount} template(s) still belong to it. Move or delete them first.`,
          type: "VALIDATION_ERROR",
          statusCode: 400,
        });
      }

      await TemplateGroupModel.deleteOne({ groupId });
      return { success: true, payload: null };
    },
  },

  moveTemplate: {
    capability: can.storedTemplates.write,
    handler: async ({ templateId, groupId }) => {
      await connectToMongoDB();
      const saId = await getCurrentUserSaId();

      const existing = await StoredTemplateModel.findOne({ templateId }).lean();
      if (!existing) {
        throw new AppError({
          message: "Template not found",
          type: "VALIDATION_ERROR",
          statusCode: 404,
        });
      }

      const isSuperUser = await isCurrentUserSuperUser();
      if (!isSuperUser && existing.saId !== saId) {
        throw new AppError({
          message: "You do not own this template",
          type: "AUTH_ERROR",
          statusCode: 403,
        });
      }

      if (groupId !== null) {
        const group = await TemplateGroupModel.findOne({ groupId }).lean();
        if (!group) {
          throw new AppError({
            message: "Target group not found",
            type: "VALIDATION_ERROR",
            statusCode: 404,
          });
        }
      }

      const result = await StoredTemplateModel.findOneAndUpdate(
        { templateId },
        { groupId },
        { new: true },
      ).lean();

      return {
        success: true,
        payload: normalizeTemplate(cleanMongoObject(result!) as StoredTemplateDoc),
      };
    },
  },
};

export const POST = createRpcHandler<StoredTemplatesContract>(handlers);
