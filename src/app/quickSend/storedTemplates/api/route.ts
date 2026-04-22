import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { StoredTemplatesContract } from "@/app/quickSend/storedTemplates/storedTemplatesContract";
import { StoredTemplateModel } from "@/app/quickSend/storedTemplates/StoredTemplateModel";
import { TemplateGroupModel } from "@/app/quickSend/storedTemplates/TemplateGroupModel";
import { StoredTemplateDoc, TemplateGroupDoc } from "@/app/quickSend/storedTemplates/StoredTemplateTypes";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { assertRole } from "@/app/auth/_lib/assertRole";
import { AppError } from "@/lib/errors/AppError";
import { headers } from "next/headers";

/** Reads the current user's userName from the proxy-injected header. */
async function getCurrentUserName(): Promise<string> {
  const headerStore = await headers();
  const userId = headerStore.get("x-user-id");
  if (!userId) {
    throw new AppError({
      message: "Authentication required",
      type: "AUTH_ERROR",
      statusCode: 401,
    });
  }
  return userId;
}

/** Derives a stable templateId slug from name + userName. */
function makeTemplateId(name: string, userName: string): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  return `${slug(userName)}__${slug(name)}`;
}

/** Derives a stable groupId slug from a group name. */
function makeGroupId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const handlers: HandlerMap<StoredTemplatesContract> = {
  getTemplates: {
    roles: ["admin", "office", "tech"],
    handler: async () => {
      await connectToMongoDB();
      const docs = await StoredTemplateModel.find().lean();
      const templates = cleanMongoArray(docs) as StoredTemplateDoc[];
      return { success: true, payload: templates };
    },
  },

  getGroups: {
    roles: ["admin", "office", "tech"],
    handler: async () => {
      await connectToMongoDB();
      const docs = await TemplateGroupModel.find().lean();
      const groups = cleanMongoArray(docs) as TemplateGroupDoc[];
      return { success: true, payload: groups };
    },
  },

  saveTemplate: {
    roles: ["admin", "office", "tech"],
    handler: async ({ template }) => {
      await connectToMongoDB();
      const userName = await getCurrentUserName();

      const templateId = makeTemplateId(template.name, userName);
      const docToSave: StoredTemplateDoc = {
        ...template,
        templateId,
        userName,
      };

      // On overwrite, enforce ownership (admin may overwrite any template)
      const existing = await StoredTemplateModel.findOne({ templateId }).lean();
      if (existing) {
        const isAdmin = await isCurrentUserAdmin();
        if (!isAdmin && existing.userName !== userName) {
          throw new AppError({
            message: "You do not own this template",
            type: "AUTH_ERROR",
            statusCode: 403,
          });
        }
      }

      const result = await StoredTemplateModel.findOneAndUpdate(
        { templateId },
        docToSave,
        { upsert: true, new: true },
      ).lean();

      return { success: true, payload: cleanMongoObject(result!) as StoredTemplateDoc };
    },
  },

  deleteTemplate: {
    roles: ["admin", "office", "tech"],
    handler: async ({ templateId }) => {
      await connectToMongoDB();
      const userName = await getCurrentUserName();

      const existing = await StoredTemplateModel.findOne({ templateId }).lean();
      if (!existing) {
        throw new AppError({
          message: "Template not found",
          type: "VALIDATION_ERROR",
          statusCode: 404,
        });
      }

      const isAdmin = await isCurrentUserAdmin();
      if (!isAdmin && existing.userName !== userName) {
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
    roles: ["admin", "office", "tech"],
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
    roles: ["admin"],
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

      return { success: true, payload: cleanMongoObject(result!) as TemplateGroupDoc };
    },
  },

  deleteGroup: {
    roles: ["admin"],
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
      const templateCount = await StoredTemplateModel.countDocuments({ groupId });
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
    roles: ["admin", "office", "tech"],
    handler: async ({ templateId, groupId }) => {
      await connectToMongoDB();
      const userName = await getCurrentUserName();

      const existing = await StoredTemplateModel.findOne({ templateId }).lean();
      if (!existing) {
        throw new AppError({
          message: "Template not found",
          type: "VALIDATION_ERROR",
          statusCode: 404,
        });
      }

      const isAdmin = await isCurrentUserAdmin();
      if (!isAdmin && existing.userName !== userName) {
        throw new AppError({
          message: "You do not own this template",
          type: "AUTH_ERROR",
          statusCode: 403,
        });
      }

      const group = await TemplateGroupModel.findOne({ groupId }).lean();
      if (!group) {
        throw new AppError({
          message: "Target group not found",
          type: "VALIDATION_ERROR",
          statusCode: 404,
        });
      }

      const result = await StoredTemplateModel.findOneAndUpdate(
        { templateId },
        { groupId },
        { new: true },
      ).lean();

      return { success: true, payload: cleanMongoObject(result!) as StoredTemplateDoc };
    },
  },
};

/** Helper: checks if the current request's user has the admin role. */
async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    await assertRole(["admin"]);
    return true;
  } catch {
    return false;
  }
}

export const POST = createRpcHandler<StoredTemplatesContract>(handlers);
