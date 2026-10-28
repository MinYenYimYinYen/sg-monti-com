import type { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { MentionEditorUtils, type VarParsers } from "@/components/MentionEditor/MentionEditorUtils";
import type { PrepayConfig, PrepayLetterVars } from "./prepayConfigTypes";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { deepEqual } from "@/lib/primatives/typeUtils/deepEqual";

const selectConfigs = (state: AppState) => state.prepayConfig.configs;
const selectDraft = (state: AppState) => state.prepayConfig.draft;
const selectCurrentSaId = (state: AppState) => state.auth.user?.saId;

/** Map of configId → PrepayConfig for O(1) lookups. */
const selectConfigMap = createSelector([selectConfigs], (configs) =>
  new Grouper(configs).toUniqueMap((c) => c.configId),
);

/**
 * Configs with a display name that prefixes the owner's saId for configs
 * belonging to other users: "elrockstar88 - November Letters".
 * Own configs show just the name.
 */
const selectConfigsWithDisplayName = createSelector(
  [selectConfigs, selectCurrentSaId],
  (configs, currentSaId) =>
    configs.map((config) => ({
      ...config,
      displayName:
        config.saId === currentSaId
          ? config.name
          : `${config.saId} - ${config.name}`,
    })),
);

/** Own configs only — configs authored by the current user. */
const selectOwnConfigs = createSelector(
  [selectConfigs, selectCurrentSaId],
  (configs, currentSaId) => configs.filter((c) => c.saId === currentSaId),
);

/** Other users' configs — configs not authored by the current user. */
const selectSharedConfigs = createSelector(
  [selectConfigs, selectCurrentSaId],
  (configs, currentSaId) => configs.filter((c) => c.saId !== currentSaId),
);

/** Names of the current user's configs. configId derives from name + saId, so only these can collide. */
const selectOwnConfigNames = createSelector([selectOwnConfigs], (configs) =>
  configs.map((c) => c.name),
);

/**
 * Mention chip text is a cached display label, not content, and older saved configs
 * have resolved values (e.g. "2027") baked in. Compare on `data-id` only.
 */
const canonicalizeMessages = (config: PrepayConfig): PrepayConfig => ({
  ...config,
  universalMessage: MentionEditorUtils.canonicalizeMentions(config.universalMessage),
  autoRenewMessage: MentionEditorUtils.canonicalizeMentions(config.autoRenewMessage),
  dontAutoRenewMessage: MentionEditorUtils.canonicalizeMentions(config.dontAutoRenewMessage),
  autoRenewHeader: MentionEditorUtils.canonicalizeMentions(config.autoRenewHeader),
  dontAutoRenewHeader: MentionEditorUtils.canonicalizeMentions(config.dontAutoRenewHeader),
  currentServicesHeader: MentionEditorUtils.canonicalizeMentions(config.currentServicesHeader),
  upsellServicesHeader: MentionEditorUtils.canonicalizeMentions(config.upsellServicesHeader),
});

/** True when the draft differs from its saved version, or has never been saved. */
const selectIsDirty = createSelector([selectDraft, selectConfigMap], (draft, configMap) => {
  if (!draft) return false;
  const saved = draft.configId ? configMap.get(draft.configId) : undefined;
  if (!saved) return true;
  return !deepEqual(canonicalizeMessages(draft), canonicalizeMessages(saved));
});

/** Draft name for the header; other users' configs are prefixed with their saId. Null when no draft. */
const selectActiveDisplayName = createSelector(
  [selectDraft, selectCurrentSaId],
  (draft, currentSaId) => {
    if (!draft) return null;
    return !draft.saId || draft.saId === currentSaId ? draft.name : `${draft.saId} - ${draft.name}`;
  },
);

/**
 * Parsers for each PrepayLetterVars key.
 *
 * `satisfies VarParsers<PrepayLetterVars>` enforces exhaustiveness: if a new key is
 * added to PrepayLetterVars, TypeScript will error here until a parser is provided.
 */
export const prepayLetterVarParsers = {
  season: (v) => String(v),
  stdPrepayDiscPercent: (v) => `${v}%`,
  upsellPrepayDiscPercent: (v) => `${v}%`,
  expirationDate: (v) => prettyDate(v, "MMMM d, yyyy"),
} satisfies VarParsers<PrepayLetterVars>;

/**
 * The draft config with all message/header fields resolved to plain text.
 * Mention nodes (e.g. `@season`) are replaced with their live values from the draft itself.
 * Used downstream when rendering the actual prepay letter output.
 */
const selectParsedDraft = createSelector([selectDraft], (draft) => {
  if (!draft) return null;

  // Extract only the PrepayLetterVars subset to satisfy the FlatVars constraint.
  const vars: PrepayLetterVars = {
    season: draft.season,
    stdPrepayDiscPercent: draft.stdPrepayDiscPercent,
    upsellPrepayDiscPercent: draft.upsellPrepayDiscPercent,
    expirationDate: draft.expirationDate,
  };

  const resolve = (html: string) =>
    MentionEditorUtils.resolve(html, vars, prepayLetterVarParsers);

  return {
    ...draft,
    universalMessage: resolve(draft.universalMessage),
    autoRenewMessage: resolve(draft.autoRenewMessage),
    dontAutoRenewMessage: resolve(draft.dontAutoRenewMessage),
    autoRenewHeader: resolve(draft.autoRenewHeader),
    dontAutoRenewHeader: resolve(draft.dontAutoRenewHeader),
    currentServicesHeader: resolve(draft.currentServicesHeader),
    upsellServicesHeader: resolve(draft.upsellServicesHeader),
  };
});

export const prepayConfigSelect = {
  configs: selectConfigs,
  draft: selectDraft,
  parsedDraft: selectParsedDraft,
  configMap: selectConfigMap,
  configsWithDisplayName: selectConfigsWithDisplayName,
  ownConfigs: selectOwnConfigs,
  sharedConfigs: selectSharedConfigs,
  ownConfigNames: selectOwnConfigNames,
  isDirty: selectIsDirty,
  activeDisplayName: selectActiveDisplayName,
};
