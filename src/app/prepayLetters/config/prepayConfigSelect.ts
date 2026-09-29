import type { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectConfigs = (state: AppState) => state.prepayConfig.configs;
const selectDraft = (state: AppState) => state.prepayConfig.draft;
const selectCurrentSaId = (state: AppState) => state.auth.user?.saId;

/** Map of configId → PrepayConfigDoc for O(1) lookups. */
const selectConfigMap = createSelector(
  [selectConfigs],
  (configs) => new Grouper(configs).toUniqueMap((c) => c.configId),
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
        config.saId === currentSaId ? config.name : `${config.saId} - ${config.name}`,
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

export const prepayConfigSelect = {
  configs: selectConfigs,
  draft: selectDraft,
  configMap: selectConfigMap,
  configsWithDisplayName: selectConfigsWithDisplayName,
  ownConfigs: selectOwnConfigs,
  sharedConfigs: selectSharedConfigs,
};
