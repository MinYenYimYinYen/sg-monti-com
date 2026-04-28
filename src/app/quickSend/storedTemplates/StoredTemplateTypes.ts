import type { ProgramConfig, Section } from "../QuickSendTypes";

/**
 * A stored QuickSend2 template as persisted in MongoDB.
 *
 * Natural key: `name + saId` (unique compound index).
 * `templateId` is a slug derived from `name + saId` at creation time and
 * never changes — it is the stable reference used in URLs and Redux state.
 *
 * `globalPrepayId` is the persisted default prepay code for all programs.
 * At call time the user can override it via `runtimeOverrides.globalPrepayId`.
 */
export type StoredTemplateDoc = {
  templateId: string;
  name: string;
  groupId: string | null;
  /** The author's `saId` (from the JWT token), not their display `userName`. */
  saId: string;
  sections: Section[];
  programConfigs: ProgramConfig[];
  globalPrepayId: string | null;
};

/**
 * A template group. Groups organize templates in the browser UI.
 * Natural key: `groupId` (name slug, globally unique).
 */
export type TemplateGroupDoc = {
  groupId: string;
  name: string;
};
