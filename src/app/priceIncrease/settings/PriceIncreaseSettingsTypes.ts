import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

export type FlagRounding = "round" | "ceil" | "floor";

export type PriceIncreaseSettingsDoc = CreatedUpdated & {
  settingsId: string;
  label: string;
  isActive: boolean;
  seasonIncreasesId: string;
  progCodeId: string;
  maxIncreaseNow: number;
  maxIncreaseEver: number;
  ongoingIncrease: number;
  upsellBonusThreshold: number;
  upsellBonusPercent: number;
  minPriceIncrease: number;
  exemptFlagId: number | null;
  manualFlagId: number | null;
  manualAttentionThreshold: number;
  flagRounding: FlagRounding;
};
