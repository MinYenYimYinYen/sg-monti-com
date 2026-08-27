import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

// ---------------------------------------------------------------------------
// GroupSchedule — planned start/end dates for one AssignmentGroup
// ---------------------------------------------------------------------------

/**
 * The committed schedule for one AssignmentGroup within a SeasonPlan.
 * Locked at plan creation — never overwritten by the crawler.
 *
 * `groupId` references AssignmentGroup.groupId.
 * The crawler resolves groupId → servCodeIds to apply plannedEnd per member servCode.
 */
export type GroupSchedule = {
  groupId: string;
  /** The planned start date for this group (ISO date). */
  plannedStart: string;
  /** The planned end date for this group (ISO date). */
  plannedEnd: string;
};

// ---------------------------------------------------------------------------
// SeasonPlan — the committed season plan
// ---------------------------------------------------------------------------

/**
 * A named season plan — the original commitment for when each AssignmentGroup
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
 * `snowMelt`: optional season start boundary (e.g. expected snow melt date).
 * Drives the slider min in the Season Plan form.
 *
 * `snowDeadline`: hard end-of-season date (e.g. first expected snow).
 * Shown as a vertical line on the Gantt. Drives the slider max.
 */
export type SeasonPlan = CreatedUpdated & {
  name: string;
  year: number;
  cascadeThreshold: number;
  /** Optional season start boundary (e.g. expected snow melt date). Drives the slider min. */
  snowMelt: string | null;
  /** Optional season end boundary (e.g. expected first snow date). Drives the slider max. */
  snowDeadline: string | null;
  /** Planned start/end dates per AssignmentGroup. */
  groupSchedules: GroupSchedule[];
  isActive: boolean;
};
