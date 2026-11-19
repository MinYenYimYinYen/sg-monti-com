import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { AppError } from "@/lib/errors/AppError";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { can } from "@/permission/can";
import UserModel from "@/app/auth/_models/UserModel";
import type { KnowledgeBaseSettingsContract } from "@/app/knowledgeBase/knowledgeBaseSettings/api/KnowledgeBaseSettingsContract";
import { KnowledgeBaseSettingModel } from "@/app/knowledgeBase/knowledgeBaseSettings/KnowledgeBaseSettingsModel";
import { loadApproverUserNames } from "@/app/knowledgeBase/knowledgeBaseSettings/_lib/loadApproverUserNames";
import { completePendingApprovals } from "@/app/knowledgeBase/topicDetail/_lib/completePendingApprovals";
import {
  findInvalidApproverUserNames,
  findPromptTemplateProblems,
  normalizeApproverUserNames,
  parseSettingValue,
  resolveAllSettings,
  resolveSetting,
} from "@/app/knowledgeBase/knowledgeBaseSettings/knowledgeBaseSettingsLogic";
import type { KnowledgeBaseSettingInput } from "@/app/knowledgeBase/knowledgeBaseSettings/KnowledgeBaseSettingsTypes";

function validationError(message: string): AppError {
  return new AppError({ message, type: "VALIDATION_ERROR", statusCode: 400 });
}

/**
 * The rules that go beyond the value's shape, and the value as it will be stored. The shape has already
 * been checked by `parseSettingValue`. Add a case here when a new setting needs a rule of its own.
 */
async function prepareValue(params: KnowledgeBaseSettingInput): Promise<KnowledgeBaseSettingInput["value"]> {
  switch (params.settingKey) {
    case "approvers": {
      const approverUserNames = normalizeApproverUserNames(params.value.approverUserNames);
      // A typo would otherwise create an approver nobody can be, and unanimous approval could never complete.
      const eligibleUsers = await UserModel.find({ userName: { $in: approverUserNames }, isKiosk: { $ne: true } })
        .select("userName")
        .lean();
      const invalidUserNames = findInvalidApproverUserNames({
        approverUserNames,
        eligibleUserNames: eligibleUsers.map((user) => user.userName),
      });
      if (invalidUserNames.length > 0) {
        throw validationError(`These are not users who can approve: ${invalidUserNames.join(", ")}.`);
      }
      return { approverUserNames };
    }
    case "askAwayPrompt": {
      const problems = findPromptTemplateProblems(params.value.template);
      if (problems.length > 0) throw validationError(problems.join(" "));
      return { template: params.value.template };
    }
  }
}

const handlers: HandlerMap<KnowledgeBaseSettingsContract> = {
  getAll: {
    capability: can.knowledgeSettings.read,
    handler: async () => {
      await connectToMongoDB();
      const storedDocs = await KnowledgeBaseSettingModel.find().lean();
      return { success: true, payload: resolveAllSettings({ storedDocs: cleanMongoArray(storedDocs) }) };
    },
  },

  upsert: {
    capability: can.knowledgeSettings.write,
    handler: async (params) => {
      const parsed = parseSettingValue({ settingKey: params.settingKey, value: params.value });
      if (!parsed.ok) throw validationError(parsed.message);

      await connectToMongoDB();
      const value = await prepareValue(params);
      const doc = await KnowledgeBaseSettingModel.findOneAndUpdate(
        { settingKey: params.settingKey },
        { $set: { settingKey: params.settingKey, value } },
        { upsert: true, new: true },
      ).lean();

      // Removing someone can complete a version that was waiting only for them. Adding someone cannot
      // un-approve anything, so this is the only direction that needs work.
      if (params.settingKey === "approvers") {
        await completePendingApprovals({ approverUserNames: await loadApproverUserNames() });
      }
      return {
        success: true,
        payload: resolveSetting({ settingKey: params.settingKey, stored: cleanMongoObject(doc!) }),
      };
    },
  },

  getApproverCandidates: {
    // Only a user who can change the list needs to choose from it.
    capability: can.knowledgeSettings.write,
    handler: async () => {
      await connectToMongoDB();
      const users = await UserModel.find({ isKiosk: { $ne: true } })
        .select("userName firstName lastName")
        .sort({ lastName: 1, firstName: 1 })
        .lean();
      // An explicit field copy, so nothing else on the user document can leave the server.
      const candidates = users.map(({ userName, firstName, lastName }) => ({ userName, firstName, lastName }));
      return { success: true, payload: candidates };
    },
  },
};

export const POST = createRpcHandler(handlers);
