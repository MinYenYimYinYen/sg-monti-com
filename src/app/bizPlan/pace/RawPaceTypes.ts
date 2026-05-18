import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { CSP } from "@/app/realGreen/customer/_lib/entities/types/CSPTypesAndClass";
import { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { PaceCategory } from "@/app/bizPlan/pace/PaceTypes";

export type RawServCodePace = {
  servCode: ServCodeDeep;
  daysRemaining: number;
  category: PaceCategory;
  unfinishedCSP: CSP;
  unfinishedRate: CSP;
  finishedCSP: CSP;
  finishedRate: CSP;
};

export type RawServCodePacePerDay = RawServCodePace & {
  /** finishedCSP divided by the count of unique days on which a completed service was done */
  finishedPerDay: CSP;
  /**
   * unfinishedCSP (active + asap only) divided by the weekday count from the day after
   * the latest printed service's schedDate through servCode.dateRange.max.
   * Falls back to daysRemaining when no printed services exist.
   */
  unfinishedPerDay: CSP;
  /**
   * The denominator used to compute unfinishedPerDay: weekdays from the day after the
   * latest printed schedDate through dateRange.max (or daysRemaining as fallback).
   * Used by the delta selector to project completion without re-dividing.
   */
  unfinishedDayCount: number;
  /**
   * Active + asap services only (excludes printed). This is the work not yet scheduled
   * on any route sheet — the stable "remaining unscheduled" count used for delta projection.
   * Excludes printed services because they are already committed to specific days.
   */
  activeAsapCSP: CSP;
  /**
   * The first weekday on which no work has been printed/scheduled yet.
   * = day after the latest printed service's schedDate, or max(today, dateRange.min) if
   * no printed services exist. Used as the projection start date for delta calculation.
   */
  projectionStartDate: string | null;
};

export type RawServCodePacePerDayPerEmployee = RawServCodePacePerDay & {
  /** finishedPerDay divided by the number of employees assigned to the servCode */
  finishedPerDayPerEmployee: CSP;
  /** unfinishedPerDay divided by the number of employees assigned to the servCode */
  unfinishedPerDayPerEmployee: CSP;
};

export type RawProgCodePace = {
  progCode: ProgCode;
  rawServCodePaces: RawServCodePace[];
  category: PaceCategory;
  unfinishedCSP: CSP;
  finishedCSP: CSP;
};
