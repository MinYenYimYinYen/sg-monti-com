import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { ServiceIncreaseResult } from "@/app/priceIncrease/results/increaseResultsTypes";
import { IncreaseFlag } from "@/app/priceIncrease/_lib/PriceIncreaseTypes";

// ---------------------------------------------------------------------------
// SortableIncreaseProperties
// ---------------------------------------------------------------------------

/**
 * Numeric properties that can be used as sort keys.
 *
 * Adding a new property here requires a corresponding entry in
 * customerIncreaseSortFns.ts — TypeScript enforces this via the
 * Record<keyof SortableIncreaseProperties, SortFn> constraint.
 */
export type SortableIncreaseProperties = {
  /** Sum of planDiff (planPrice - nextPrice) across all services — total dollar increase needed */
  increaseDollar: number;
  /** cappedPercent — the final increase percent after caps */
  increasePercent: number;
  /** rawPercent — before upsell bonus and caps; used for manualAttentionThreshold evaluation */
  rawPercent: number;
  /** customer.x.revenue("renewal") — total renewal revenue across all active programs */
  customerRevenue: number;
  /** targetProgram.x.revenue("renewal") — renewal revenue for the target program only */
  programRevenue: number;
  /** calcSeasonCount result for the target program */
  seasonCount: number;
};

// ---------------------------------------------------------------------------
// GroupableIncreaseProperties
// ---------------------------------------------------------------------------

/**
 * Boolean/categorical properties that can be used as group keys.
 *
 * Adding a new property here requires a corresponding entry in
 * customerIncreaseGroupFns.ts — TypeScript enforces this via the
 * Record<keyof GroupableIncreaseProperties, GroupFn> constraint.
 */
/** Status of any pre-existing increase flags on the customer. */
export type PreExistingFlagStatus = "none" | "matching" | "override" | "conflict";

export type GroupableIncreaseProperties = {
  /** Customer has the priceIncreaseExemptFlagId flag */
  isExempt: boolean;
  /** Customer has the priceIncreaseManualFlagId flag */
  isManual: boolean;
  /** rawPercent exceeds maxIncreaseNow + manualAttentionThreshold */
  needsManualAttention: boolean;
  /** Customer already has one of the increaseFlagMappings flags */
  hasIncreaseFlag: boolean;
  /** cappedPercent < 0 — current price already exceeds the plan price */
  isOverpriced: boolean;
  /** Any service where nextPrice < acqPrice — customer is priced below acquisition */
  isBelowAcquisition: boolean;
  /** effectiveFlag?.desc — the flag that will actually be applied, or "No Flag" */
  resolvedFlagDesc: string;
  /**
   * Pre-existing increase flag state:
   * - "none"     — no recognized increase flag on the customer (normal)
   * - "matching" — one pre-existing flag that matches the module's resolvedFlag
   * - "override" — one pre-existing flag that differs from resolvedFlag (pre-existing wins)
   * - "conflict" — multiple pre-existing increase flags (must be resolved manually)
   */
  preExistingFlagStatus: PreExistingFlagStatus;
  /**
   * Bucketed season count label for grouping.
   * Individual labels for seasons up to configSeasonCount, then 5-year ranges beyond.
   * Mirrors sortable.seasonCount but as a display-ready string bucket.
   */
  seasonCountBucket: string;
};

// ---------------------------------------------------------------------------
// AssignFlagBlockReason — pure utility for individual flag assignment gating
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable reason why flag assignment is blocked for this customer,
 * or null if assignment is allowed. Used by AssignFlagButton for disabled state and tooltip.
 *
 * Order matters: exempt/manual are checked before flag status so the most
 * actionable reason is surfaced first.
 */
export function getAssignFlagBlockReason(result: CustomerIncreaseResult): string | null {
  if (result.groupable.isExempt) return "Exempt customers cannot be assigned a flag";
  if (result.groupable.isManual) return "Manual customers cannot be assigned a flag";
  if (result.groupable.preExistingFlagStatus === "conflict") return "Conflicting flags — resolve in RealGreen first";
  if (result.groupable.preExistingFlagStatus === "matching") return "Flag already assigned";
  if (result.groupable.preExistingFlagStatus === "override") return "Pre-existing flag overrides — resolve in RealGreen first";
  if (!result.resolvedFlag) return "No flag to assign";
  return null;
}

// ---------------------------------------------------------------------------
// CustomerIncreaseResult
// ---------------------------------------------------------------------------

/**
 * Fully aggregated per-customer price increase result.
 *
 * Carries hydrated references (customer, targetProgram, serviceResults) for
 * UI consumption. Safe to hold references because this type is only used in
 * selector output, never stored in Redux.
 *
 * Aggregation pipeline:
 *   1. rawPercent    — size-weighted average of planDiffPercent across services
 *   2. calculatedPercent — after upsell bonus applied
 *   3. cappedPercent — after maxIncreaseNow / maxIncreaseEver caps
 *   4. resolvedFlag  — flag resolved against cappedPercent
 *
 * Pre-computed sortable and groupable sub-objects allow the sort/group
 * registries to be typed as Record<K, Fn>, enforcing completeness at
 * compile time.
 */
export type CustomerIncreaseResult = {
  customer: Customer;
  targetProgram: Program;
  /** Per-service results — source of truth for service-level display */
  serviceResults: ServiceIncreaseResult[];

  /** Size-weighted average of planDiffPercent — before upsell bonus and caps */
  rawPercent: number;
  /** After upsell bonus, before caps */
  calculatedPercent: number;
  /** After maxIncreaseNow / maxIncreaseEver caps — used for flag resolution */
  cappedPercent: number;

  resolvedFlag: IncreaseFlag | null;

  /**
   * Recognized increase flags already on the customer in the CRM.
   * Normally empty (length 0). Length 1 = has a pre-existing flag (matching or override).
   * Length 2+ = conflict that must be resolved manually before flag assignment.
   */
  preExistingIncreaseFlags: IncreaseFlag[];

  /**
   * The flag that will actually be used for this customer.
   * - Normally equals resolvedFlag (no pre-existing flag).
   * - When preExistingIncreaseFlags.length === 1 and it differs from resolvedFlag,
   *   the pre-existing flag overrides (effectiveFlag = preExistingIncreaseFlags[0]).
   * - When preExistingIncreaseFlags.length > 1, effectiveFlag is null — conflict.
   */
  effectiveFlag: IncreaseFlag | null;

  /** Pre-computed numeric properties for sorting */
  sortable: SortableIncreaseProperties;
  /** Pre-computed boolean/categorical properties for grouping */
  groupable: GroupableIncreaseProperties;
};
