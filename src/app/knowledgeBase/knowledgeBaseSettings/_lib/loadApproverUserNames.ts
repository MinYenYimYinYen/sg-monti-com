import { cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { KnowledgeBaseSettingModel } from "@/app/knowledgeBase/knowledgeBaseSettings/KnowledgeBaseSettingsModel";
import { resolveSetting } from "@/app/knowledgeBase/knowledgeBaseSettings/knowledgeBaseSettingsLogic";

/**
 * The current approver list, from the database. Server only; the caller has already connected.
 * Nothing saved, or a stored value that no longer parses, means no approvers.
 */
export async function loadApproverUserNames(): Promise<string[]> {
  const stored = await KnowledgeBaseSettingModel.findOne({ settingKey: "approvers" }).lean();
  const setting = resolveSetting({ settingKey: "approvers", stored: stored ? cleanMongoObject(stored) : undefined });
  return setting.settingKey === "approvers" ? setting.value.approverUserNames : [];
}
