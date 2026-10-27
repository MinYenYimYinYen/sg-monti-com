import { Flag } from "@/app/realGreen/flag/FlagTypes";

// ---------------------------------------------------------------------------
// SeasonIncreases
// ---------------------------------------------------------------------------

export type SeasonIncrease = {
  season: number;          // 2, 3, 4, ... (season 1 = sale season, no increase)
  increasePercent: number;
};

// ---------------------------------------------------------------------------
// IncreaseFlag — stored mapping + hydrated Flag properties
// ---------------------------------------------------------------------------

/** Raw mapping stored in GlobalSettings.increaseFlagMappings */
export type IncreaseFlagMapping = {
  flagId: number;
  increasePercent: number;
};

/** Hydrated: IncreaseFlagMapping joined with the full Flag from flagSelect.flagDocMap */
export type IncreaseFlag = IncreaseFlagMapping & Flag;
