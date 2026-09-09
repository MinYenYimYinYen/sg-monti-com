import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { PriceIncreaseSettingsDoc } from "@/app/priceIncrease/settings/PriceIncreaseSettingsTypes";
import { SeasonIncreasesDoc } from "@/app/priceIncrease/seasonIncreases/SeasonIncreasesTypes";
import { IncreaseFlagMapping, SeasonIncrease } from "@/app/priceIncrease/_lib/PriceIncreaseTypes";
import { CustomerIncreaseSortKey } from "@/app/priceIncrease/results/customerIncreaseSortFns";
import { CustomerIncreaseGroupKey } from "@/app/priceIncrease/results/customerIncreaseGroupFns";

// ---------------------------------------------------------------------------
// Inline plan editor mode
// ---------------------------------------------------------------------------

type InlinePlanMode =
  | { type: "closed" }
  | { type: "new" }
  | { type: "edit"; seasonIncreasesId: string };

type PriceIncreaseConfigState = {
  // Section 1: PriceIncreaseSettings sheet
  // settingsDraft persists independently of whether the sheet is open, so the
  // user can close the sheet, navigate to the Summary tab to preview results,
  // then return to continue editing. Use discardSettingsDraft to clear it.
  settingsDraft: PriceIncreaseSettingsDoc | null;
  settingsSheetOpen: boolean;
  settingsDeleteConfirmId: string | null;

  // Inline season plan editor (inside SettingsSheet)
  inlinePlanMode: InlinePlanMode;
  inlinePlanDraft: SeasonIncreasesDoc | null;

  // Section 3: IncreaseFlag Mappings
  flagMappingsDraft: IncreaseFlagMapping[];
  flagPickerSelectedId: number | null;

  // Target season override — NOT a configurable settings field.
  // Managed by localStorage (key: "priceIncrease.targetSeason") with a 6-month
  // expiry. The layout reads from localStorage on mount and dispatches here.
  // Falls back to globalSettings.season when null.
  // Use case: planning for next season while still running the current season
  // (e.g. global settings season = 2026, but planning for 2027).
  targetSeasonOverride: number | null;

  // View configuration — sort and group state for the results views.
  // Persisted in Redux so the user's configuration survives tab navigation.
  // Use console.log(store.getState().priceIncreaseConfig.viewConfig) to capture
  // a configuration worth making permanent.
  viewConfig: IncreaseViewConfig;
};

/**
 * Sort/group configuration for the price increase results views.
 * sortKeys is an ordered list — primary sort first, tiebreakers after.
 * groupKey partitions results into labeled groups (rendered as tabs).
 * activeGroup tracks which group tab is currently selected.
 */
export type IncreaseViewConfig = {
  sortKeys: CustomerIncreaseSortKey[];
  groupKey: CustomerIncreaseGroupKey | null;
  activeGroup: string | null;
};

const defaultViewConfig: IncreaseViewConfig = {
  sortKeys: ["increasePercent"],
  groupKey: null,
  activeGroup: null,
};

const initialState: PriceIncreaseConfigState = {
  settingsDraft: null,
  settingsSheetOpen: false,
  settingsDeleteConfirmId: null,
  inlinePlanMode: { type: "closed" },
  inlinePlanDraft: null,
  flagMappingsDraft: [],
  flagPickerSelectedId: null,
  targetSeasonOverride: null,
  viewConfig: defaultViewConfig,
};

const priceIncreaseConfigSlice = createSlice({
  name: "priceIncreaseConfig",
  initialState,
  reducers: {
    // ---------------------------------------------------------------------------
    // Section 1: Settings
    // ---------------------------------------------------------------------------
    openSettingsSheet: (state, action: PayloadAction<PriceIncreaseSettingsDoc>) => {
      state.settingsDraft = action.payload;
      state.settingsSheetOpen = true;
      // Close any open inline plan editor when opening a new settings sheet
      state.inlinePlanMode = { type: "closed" };
      state.inlinePlanDraft = null;
    },
    closeSettingsSheet: (state) => {
      // Closes the sheet UI only — draft is preserved so the user can navigate
      // away to preview results and return to continue editing.
      state.settingsSheetOpen = false;
      state.inlinePlanMode = { type: "closed" };
      state.inlinePlanDraft = null;
    },
    discardSettingsDraft: (state) => {
      state.settingsDraft = null;
      state.settingsSheetOpen = false;
      state.inlinePlanMode = { type: "closed" };
      state.inlinePlanDraft = null;
    },
    updateSettingsDraft: (state, action: PayloadAction<Partial<PriceIncreaseSettingsDoc>>) => {
      if (state.settingsDraft) {
        state.settingsDraft = { ...state.settingsDraft, ...action.payload };
      }
    },
    setSettingsDeleteConfirm: (state, action: PayloadAction<string | null>) => {
      state.settingsDeleteConfirmId = action.payload;
    },

    // ---------------------------------------------------------------------------
    // Inline season plan editor
    // ---------------------------------------------------------------------------
    openInlinePlanNew: (state) => {
      state.inlinePlanMode = { type: "new" };
      state.inlinePlanDraft = {
        seasonIncreasesId: crypto.randomUUID(),
        label: "",
        seasonIncreases: [],
        createdAt: "",
        updatedAt: "",
      };
    },
    openInlinePlanEdit: (state, action: PayloadAction<SeasonIncreasesDoc>) => {
      state.inlinePlanMode = { type: "edit", seasonIncreasesId: action.payload.seasonIncreasesId };
      state.inlinePlanDraft = { ...action.payload };
    },
    closeInlinePlan: (state) => {
      state.inlinePlanMode = { type: "closed" };
      state.inlinePlanDraft = null;
    },
    updateInlinePlanDraft: (state, action: PayloadAction<Partial<Pick<SeasonIncreasesDoc, "label">>>) => {
      if (state.inlinePlanDraft) {
        state.inlinePlanDraft = { ...state.inlinePlanDraft, ...action.payload };
      }
    },
    addInlinePlanRow: (state) => {
      if (!state.inlinePlanDraft) return;
      const nextSeason = state.inlinePlanDraft.seasonIncreases.length + 2;
      state.inlinePlanDraft.seasonIncreases = [
        ...state.inlinePlanDraft.seasonIncreases,
        { season: nextSeason, increasePercent: 0 },
      ];
    },
    removeLastInlinePlanRow: (state) => {
      if (!state.inlinePlanDraft || state.inlinePlanDraft.seasonIncreases.length === 0) return;
      state.inlinePlanDraft.seasonIncreases = state.inlinePlanDraft.seasonIncreases.slice(0, -1);
    },
    updateInlinePlanRowPercent: (
      state,
      action: PayloadAction<{ index: number; increasePercent: number }>,
    ) => {
      if (!state.inlinePlanDraft) return;
      const { index, increasePercent } = action.payload;
      const rows = [...state.inlinePlanDraft.seasonIncreases];
      if (index >= 0 && index < rows.length) {
        rows[index] = { ...rows[index], increasePercent } as SeasonIncrease;
        state.inlinePlanDraft.seasonIncreases = rows;
      }
    },

    // ---------------------------------------------------------------------------
    // Section 3: Flag Mappings
    // ---------------------------------------------------------------------------
    setFlagMappingsDraft: (state, action: PayloadAction<IncreaseFlagMapping[]>) => {
      state.flagMappingsDraft = action.payload;
    },
    addFlagMapping: (state, action: PayloadAction<number>) => {
      const flagId = action.payload;
      const alreadyMapped = state.flagMappingsDraft.some((m) => m.flagId === flagId);
      if (alreadyMapped) return;
      state.flagMappingsDraft = [...state.flagMappingsDraft, { flagId, increasePercent: 0 }];
      state.flagPickerSelectedId = null;
    },
    removeFlagMapping: (state, action: PayloadAction<number>) => {
      state.flagMappingsDraft = state.flagMappingsDraft.filter((m) => m.flagId !== action.payload);
    },
    updateFlagMappingPercent: (
      state,
      action: PayloadAction<{ flagId: number; increasePercent: number }>,
    ) => {
      const { flagId, increasePercent } = action.payload;
      state.flagMappingsDraft = state.flagMappingsDraft.map((m) =>
        m.flagId === flagId ? { ...m, increasePercent } : m,
      );
    },
    setFlagPickerSelected: (state, action: PayloadAction<number | null>) => {
      state.flagPickerSelectedId = action.payload;
    },

    // ---------------------------------------------------------------------------
    // Target season override
    // ---------------------------------------------------------------------------
    setTargetSeasonOverride: (state, action: PayloadAction<number>) => {
      state.targetSeasonOverride = action.payload;
    },
    clearTargetSeasonOverride: (state) => {
      state.targetSeasonOverride = null;
    },

    // ---------------------------------------------------------------------------
    // View configuration (sort / group)
    // ---------------------------------------------------------------------------
    setViewSortKeys: (state, action: PayloadAction<CustomerIncreaseSortKey[]>) => {
      state.viewConfig.sortKeys = action.payload;
      // Reset active group when sort changes — page position is no longer meaningful
      state.viewConfig.activeGroup = null;
    },
    addViewSortKey: (state, action: PayloadAction<CustomerIncreaseSortKey>) => {
      if (!state.viewConfig.sortKeys.includes(action.payload)) {
        state.viewConfig.sortKeys = [...state.viewConfig.sortKeys, action.payload];
      }
    },
    removeViewSortKey: (state, action: PayloadAction<CustomerIncreaseSortKey>) => {
      state.viewConfig.sortKeys = state.viewConfig.sortKeys.filter((k) => k !== action.payload);
    },
    setViewGroupKey: (state, action: PayloadAction<CustomerIncreaseGroupKey | null>) => {
      state.viewConfig.groupKey = action.payload;
      state.viewConfig.activeGroup = null; // reset active tab when group changes
    },
    setViewActiveGroup: (state, action: PayloadAction<string | null>) => {
      state.viewConfig.activeGroup = action.payload;
    },
    resetViewConfig: (state) => {
      state.viewConfig = defaultViewConfig;
    },
  },
});

export const priceIncreaseConfigActions = priceIncreaseConfigSlice.actions;
export default priceIncreaseConfigSlice.reducer;
