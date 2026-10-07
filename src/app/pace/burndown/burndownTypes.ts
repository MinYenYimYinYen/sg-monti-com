import { CrawlerDayPhase } from "@/app/pace/lib/crawlerDay/CrawlerDay";

// ---------------------------------------------------------------------------
// Burndown chart types
// ---------------------------------------------------------------------------

/**
 * One group's contribution to the stacked bar on a single burndown day.
 * Represents how much pool this group still has remaining on that date.
 */
export type BurndownGroupSlice = {
  groupId: string;
  label: string;
  sequenceId: string | null;
  /** Pool remaining for this group on this day. */
  remaining: number;
};

/**
 * One point on the X-axis of the burndown chart.
 * Corresponds to one CrawlerDay — past, present, or future.
 */
export type BurndownDay = {
  date: string;
  phase: CrawlerDayPhase;
  /** Sum of all groups' poolRemaining on this day. */
  totalRemaining: number;
  /** Per-group slices for stacked bar rendering. */
  groups: BurndownGroupSlice[];
};

/**
 * The ideal "burndown velocity" line — a straight line from the season's
 * total pool on the first crawl day down to zero at the deadline.
 *
 * Rendered as a diagonal overlay on the chart.
 */
export type BurndownVelocityLine = {
  startDate: string;
  startRemaining: number;
  /** snowDeadline if set, otherwise the last crawlerDay date. */
  endDate: string;
};

/**
 * Everything the burndown chart component needs — assembled by `burndownSelect.chartData`.
 */
export type BurndownChartData = {
  days: BurndownDay[];
  velocityLine: BurndownVelocityLine | null;
  /** The "as of" date — rendered as a vertical line splitting past from future. */
  mainDate: string;
  /** Optional season start boundary. */
  snowMelt: string | null;
  /** Optional hard season deadline — end point of the velocity line. */
  snowDeadline: string | null;
};
