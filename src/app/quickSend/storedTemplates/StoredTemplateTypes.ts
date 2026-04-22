import { QSProgramConfig, QSSection } from "@/app/quickSend/QuickSendTypes";

/**
 * A stored QuickSend template as persisted in MongoDB.
 *
 * Natural key: `name + userName` (unique compound index).
 * `templateId` is a slug derived from `name + userName` at creation time and
 * never changes — it is the stable reference used in URLs and Redux state.
 */
export type StoredTemplateDoc = {
  templateId: string;
  name: string;
  groupId: string;
  userName: string;
  sections: QSSection[];
  programConfigs: QSProgramConfig[];
};

/**
 * A template group. Groups organize templates in the browser UI.
 * Natural key: `groupId` (name slug, globally unique).
 */
export type TemplateGroupDoc = {
  groupId: string;
  name: string;
};
