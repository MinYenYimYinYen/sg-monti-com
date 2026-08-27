import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

// ---------------------------------------------------------------------------
// ServCodeSchedule — planned start/end dates for one servCode
// ---------------------------------------------------------------------------

/**
 * The committed schedule for one servCode within a SeasonPlan.
 * Locked at plan creation — never overwritten by the crawler.
 */
export type ServCodeSchedule = {
  servCodeId: string;
  /** The planned start date for this servCode (ISO date). */
  plannedStart: string;
  /** The planned end date for this servCode (ISO date). */
  plannedEnd: string;
};

// ---------------------------------------------------------------------------
// SeasonPlan — the committed season plan
// ---------------------------------------------------------------------------

/**
 * A named season plan — the original commitment for when each servCode
 * should start and finish. Multiple plans can exist (pre-season, revised, etc.).
 * One is active at a time.
 *
 * `name` is the natural key — must be unique.
 *
 * `cascadeThreshold`: fraction of total pool (completed / total) that must be
 * reached before unlocking the successor in a sequential progCode.
 * Combined with `plannedEnd` as an OR condition:
 *   unlock when completionPct >= cascadeThreshold OR today > plannedEnd
 *
 * `snowDeadline`: hard end-of-season date (e.g. first expected snow).
 * Shown as a vertical line on the Gantt.
 */
export type SeasonPlan = CreatedUpdated & {
  name: string;
  year: number;
  cascadeThreshold: number;
  /** Optional season start boundary (e.g. expected snow melt date). Drives the slider min. */
  snowMelt: string | null;
  /** Optional season end boundary (e.g. expected first snow date). Drives the slider max. */
  snowDeadline: string | null;
  servCodeSchedules: ServCodeSchedule[];
  isActive: boolean;
};
