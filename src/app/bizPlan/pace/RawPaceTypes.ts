import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { CountSizePrice } from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";
import { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { PaceCategory } from "@/app/bizPlan/pace/PaceType";

export type RawServCodePace = {
  servCode: ServCodeDeep;
  daysRemaining: number;
  category: PaceCategory;
  unfinishedCSP: CountSizePrice;
  unfinishedRate: CountSizePrice;
  finishedCSP: CountSizePrice;
  finishedRate: CountSizePrice;
};

export type RawServCodePacePerDay = RawServCodePace & {
  /** finishedCSP divided by the count of unique days on which a completed service was done */
  finishedPerDay: CountSizePrice;
  /**
   * unfinishedCSP (active + asap only) divided by the weekday count from the day after
   * the latest printed service's schedDate through servCode.dateRange.max.
   * Falls back to daysRemaining when no printed services exist.
   */
  unfinishedPerDay: CountSizePrice;
  /**
   * The denominator used to compute unfinishedPerDay: weekdays from the day after the
   * latest printed schedDate through dateRange.max (or daysRemaining as fallback).
   * Used by the delta selector to project completion without re-dividing.
   */
  unfinishedDayCount: number;
};

export type RawServCodePacePerDayPerEmployee = RawServCodePacePerDay & {
  /** finishedPerDay divided by the number of employees assigned to the servCode */
  finishedPerDayPerEmployee: CountSizePrice;
  /** unfinishedPerDay divided by the number of employees assigned to the servCode */
  unfinishedPerDayPerEmployee: CountSizePrice;
};

export type RawProgCodePace = {
  progCode: ProgCode;
  rawServCodePaces: RawServCodePace[];
  category: PaceCategory;
  unfinishedCSP: CountSizePrice;
  finishedCSP: CountSizePrice;
};
