import type { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { MentionEditorUtils, type VarParsers } from "@/components/MentionEditor/MentionEditorUtils";
import type { PrepayLetterVars } from "./prepayConfigTypes";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";

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
};
