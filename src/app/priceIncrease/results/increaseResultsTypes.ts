import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

// ---------------------------------------------------------------------------
// ServiceIncreaseResult
// ---------------------------------------------------------------------------

/**
 * Per-service price increase computation result.
 *
 * Intentionally "raw" — caps (maxIncreaseNow, maxIncreaseEver) and upsell
 * bonus adjustments are NOT applied here. Those belong in the customer-level
 * aggregation layer, after all services have been reduced to a single number.
 *
 * The `service` reference is carried for downstream convenience. Because this
 * type is only used in selector output (never stored in Redux), holding an
 * object reference is safe.
 */
export type ServiceIncreaseResult = {
  /** Full hydrated customer — convenience reference, same as service.program.customer */
  customer: Customer;
  /** Full hydrated service — source of truth for nextPrice, servId, size, etc. */
  service: Service;
  /** calcPlannedIncreasePercent result — compounded increase from acquisition price */
  plannedPercent: number;
  /** service.x.acquisitionPrice — theoretical price-table starting price */
  acqPrice: number;
  /** acqPrice * (1 + plannedPercent / 100) — where the price should be */
  planPrice: number;
  /** planPrice - service.nextPrice — positive means an increase is needed */
  planDiff: number;
  /** (planDiff / service.nextPrice) * 100 — raw % increase to reach plan price */
  planDiffPercent: number;
};

// ---------------------------------------------------------------------------
// IncreaseDataIssue — incomplete data that prevents result computation
// ---------------------------------------------------------------------------

/** Identifies which required field was missing or invalid for a given service. */
export type IncreaseDataIssueMissingField = "acqPrice" | "dateSold";

/**
 * Reported when a service or program cannot be computed due to missing data.
 *
 * - `dateSold` issues are program-level: one issue per program, no servId.
 * - `acqPrice` issues are service-level: one issue per service, servId is set.
 *
 * Collected by serviceIncreaseResultsSelect and surfaced via the `dataIssues`
 * selector for display in an info popover.
 */
export type IncreaseDataIssue = {
  custId: number;
  progId: number;
  /** Present for service-level issues (acqPrice). Absent for program-level issues (dateSold). */
  servId?: number;
  missingField: IncreaseDataIssueMissingField;
  message: string;
};

// ---------------------------------------------------------------------------
// ServiceIncreaseOutcome — discriminated union returned by makeServiceIncreaseResult
// ---------------------------------------------------------------------------

export type ServiceIncreaseOutcome =
  | { ok: true; result: ServiceIncreaseResult }
  | { ok: false; issue: IncreaseDataIssue };
