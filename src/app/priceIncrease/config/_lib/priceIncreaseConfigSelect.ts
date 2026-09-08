import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { flagSelect } from "@/app/realGreen/flag/_selectors/flagSelect";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { seasonIncreasesSelect } from "@/app/priceIncrease/seasonIncreases/seasonIncreasesSelect";
import { priceIncreaseSettingsSelect } from "@/app/priceIncrease/settings/settingsSelect";
import { SeasonIncrease, IncreaseFlag } from "@/app/priceIncrease/_lib/PriceIncreaseTypes";
import { deepEqual } from "@/lib/primatives/typeUtils/deepEqual";

// ---------------------------------------------------------------------------
// Base state selectors
// ---------------------------------------------------------------------------

const selectSettingsDraft = (state: AppState) => state.priceIncreaseConfig.settingsDraft;
const selectSettingsSheetOpen = (state: AppState) => state.priceIncreaseConfig.settingsSheetOpen;
const selectSettingsDeleteConfirmId = (state: AppState) =>
  state.priceIncreaseConfig.settingsDeleteConfirmId;

const selectInlinePlanMode = (state: AppState) => state.priceIncreaseConfig.inlinePlanMode;
const selectInlinePlanDraft = (state: AppState) => state.priceIncreaseConfig.inlinePlanDraft;

const selectFlagMappingsDraft = (state: AppState) => state.priceIncreaseConfig.flagMappingsDraft;
const selectFlagPickerSelectedId = (state: AppState) =>
  state.priceIncreaseConfig.flagPickerSelectedId;

// ---------------------------------------------------------------------------
// Section 1: Settings
// ---------------------------------------------------------------------------

/**
 * Source of truth for downstream selectors (priceIncreaseSelect) responsible
 * for returning customer/service data. Returns the live draft if one exists,
 * otherwise falls back to the active stored settings.
 */
const selectSettings = createSelector(
  [selectSettingsDraft, priceIncreaseSettingsSelect.activeSettings],
  (draft, activeSettings) => draft ?? activeSettings,
);

/**
 * True when the draft differs from the stored doc it was opened from,
 * or always true when the draft is a new (unsaved) settings doc.
 */
const selectSettingsIsDirty = createSelector(
  [selectSettingsDraft, priceIncreaseSettingsSelect.storedSettings],
  (draft, storedSettings) => {
    if (!draft) return false;
    const stored = storedSettings.find((d) => d.settingsId === draft.settingsId);
    // No stored match means this is a new doc
    if (!stored) return true;
    return !deepEqual(draft, stored);
  },
);

// ---------------------------------------------------------------------------
// Inline season plan editor
// ---------------------------------------------------------------------------

const selectInlinePlanIsOpen = createSelector(
  [selectInlinePlanMode],
  (mode) => mode.type !== "closed",
);

const selectInlinePlanIsNew = createSelector(
  [selectInlinePlanMode],
  (mode) => mode.type === "new",
);

export type SeasonIncreaseDraftRow = SeasonIncrease & {
  cumulativePercent: number;
};

/**
 * Computes cumulative compounded increase for each row in the inline plan draft.
 * Season numbers are derived from position (index + 2).
 */
const selectInlinePlanDraftRows = createSelector(
  [selectInlinePlanDraft],
  (draft): SeasonIncreaseDraftRow[] => {
    if (!draft) return [];

    let compoundFactor = 1;
    return draft.seasonIncreases.map((row, index) => {
      compoundFactor *= 1 + row.increasePercent / 100;
      return {
        season: index + 2,
        increasePercent: row.increasePercent,
        cumulativePercent: (compoundFactor - 1) * 100,
      };
    });
  },
);

/**
 * True when the inline plan draft differs from the stored doc (edit mode)
 * or always true in new mode.
 */
const selectInlinePlanIsDirty = createSelector(
  [selectInlinePlanDraft, selectInlinePlanMode, seasonIncreasesSelect.docs],
  (draft, mode, docs) => {
    if (!draft || mode.type === "closed") return false;
    if (mode.type === "new") return true;
    const stored = docs.find((d) => d.seasonIncreasesId === mode.seasonIncreasesId);
    if (!stored) return true;
    return !deepEqual(draft, stored);
  },
);

const selectInlinePlanCanSave = createSelector(
  [selectInlinePlanDraft, selectInlinePlanIsDirty],
  (draft, isDirty) => {
    if (!draft || !isDirty) return false;
    return draft.label.length > 0;
  },
);

// ---------------------------------------------------------------------------
// Section 3: Flag Mappings
// ---------------------------------------------------------------------------

/** Draft sorted ascending by increasePercent */
const selectFlagMappingsDraftSorted = createSelector(
  [selectFlagMappingsDraft],
  (mappings) => [...mappings].sort((a, b) => a.increasePercent - b.increasePercent),
);

/** Hydrated: joins sorted draft with flagDocMap — only shows flag desc, no flagId */
const selectFlagMappingsDraftHydrated = createSelector(
  [selectFlagMappingsDraftSorted, flagSelect.flagDocMap],
  (mappings, flagDocMap): IncreaseFlag[] => {
    return mappings.flatMap((mapping) => {
      const flag = flagDocMap.get(mapping.flagId);
      if (!flag) return [];
      return [{ ...mapping, ...flag }];
    });
  },
);

/** All flags not already in the draft — available to add in the left picker box */
const selectAvailableFlags = createSelector(
  [flagSelect.flagDocs, selectFlagMappingsDraft],
  (flagDocs, draft) => {
    const mappedIds = new Set(draft.map((m) => m.flagId));
    return flagDocs.filter((f) => !mappedIds.has(f.flagId));
  },
);

/** True when all mapped flags have a non-zero increasePercent */
const selectFlagMappingsAllHaveValues = createSelector(
  [selectFlagMappingsDraft],
  (mappings) => mappings.length > 0 && mappings.every((m) => m.increasePercent > 0),
);

/** True when any two mappings share the same increasePercent */
const selectFlagMappingsHasDuplicatePercents = createSelector(
  [selectFlagMappingsDraft],
  (mappings) => {
    const percents = mappings.map((m) => m.increasePercent);
    return new Set(percents).size !== percents.length;
  },
);

/** True when all mappings have values and no duplicates */
const selectFlagMappingsIsValid = createSelector(
  [selectFlagMappingsAllHaveValues, selectFlagMappingsHasDuplicatePercents],
  (allHaveValues, hasDuplicates) => allHaveValues && !hasDuplicates,
);

/** True when draft differs from stored GlobalSettings.increaseFlagMappings */
const selectFlagMappingsIsDirty = createSelector(
  [selectFlagMappingsDraftSorted, globalSettingsSelect.increaseFlagMappings],
  (draft, stored) => {
    const storedSorted = [...stored].sort((a, b) => a.increasePercent - b.increasePercent);
    return !deepEqual(draft, storedSorted);
  },
);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const priceIncreaseConfigSelect = {
  // Section 1
  settingsDraft: selectSettingsDraft,
  settingsSheetOpen: selectSettingsSheetOpen,
  settingsDeleteConfirmId: selectSettingsDeleteConfirmId,
  settingsIsDirty: selectSettingsIsDirty,
  settings: selectSettings,

  // Inline plan editor
  inlinePlanMode: selectInlinePlanMode,
  inlinePlanIsOpen: selectInlinePlanIsOpen,
  inlinePlanIsNew: selectInlinePlanIsNew,
  inlinePlanDraft: selectInlinePlanDraft,
  inlinePlanDraftRows: selectInlinePlanDraftRows,
  inlinePlanIsDirty: selectInlinePlanIsDirty,
  inlinePlanCanSave: selectInlinePlanCanSave,

  // Section 3
  flagMappingsDraft: selectFlagMappingsDraft,
  flagMappingsDraftSorted: selectFlagMappingsDraftSorted,
  flagMappingsDraftHydrated: selectFlagMappingsDraftHydrated,
  availableFlags: selectAvailableFlags,
  flagPickerSelectedId: selectFlagPickerSelectedId,
  flagMappingsIsValid: selectFlagMappingsIsValid,
  flagMappingsIsDirty: selectFlagMappingsIsDirty,
};
