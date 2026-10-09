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

// ---------------------------------------------------------------------------
// Slope analysis types
// ---------------------------------------------------------------------------

/**
 * The slope line rendered on the burndown chart.
 *
 * Split into two segments sharing a fixed pivot at mainDate so the line
 * always passes through the top of the mainDate bar regardless of window size:
 *   - Look-back segment: startDate → pivotDate (historical)
 *   - Projection segment: pivotDate → endDate (forward)
 */
export type BurndownSlopeLine = {
  /** Start of the look-back segment (N past-phase days before mainDate). */
  startDate: string;
  startRemaining: number;
  /** The fixed pivot — always mainDate. Both segments meet here. */
  pivotDate: string;
  pivotRemaining: number;
  /** End of the projection segment (N calendar days after mainDate). */
  endDate: string;
  endRemaining: number;
};

/**
 * Result of the N-day slope analysis centered on mainDate.
 *
 * Compares the actual burn rate over the look-back window against the ideal
 * velocity, giving the production manager a signal on whether pace is
 * improving or deteriorating.
 */
export type BurndownSlopeAnalysis = {
  windowDays: number;
  /** First date of the look-back window (N past-phase days before mainDate). */
  windowStartDate: string;
  /** Last date of the projected slope (N future-phase days after mainDate). */
  windowEndDate: string;
  /** Average $/day burned over the N-day look-back window. */
  actualDailyBurn: number;
  /** $/day required by the ideal velocity line. */
  idealDailyBurn: number;
  /** actualDailyBurn - idealDailyBurn. Positive = ahead of pace, negative = behind. */
  variance: number;
  /** variance / idealDailyBurn. Positive = ahead, negative = behind. */
  variancePct: number;
  /** The slope line to render on the chart. null when insufficient data. */
  slopeLine: BurndownSlopeLine | null;
};

// ---------------------------------------------------------------------------
// Recharts-ready types
// ---------------------------------------------------------------------------

/**
 * One row in the flat array passed to Recharts `<ComposedChart>`.
 *
 * Recharts stacked bars require each series to be a flat key on the data object.
 * `groupKeys` lists the groupIds present so the chart can render one `<Bar>` per key.
 *
 * `velocityRemaining` is the interpolated ideal-line value for this date (null if
 * the date falls outside the velocity line's range).
 */
export type BurndownRechartsRow = {
  date: string;
  phase: CrawlerDayPhase;
  totalRemaining: number;
  /** Interpolated ideal remaining for this date. null outside velocity line range. */
  velocityRemaining: number | null;
  /** Flat per-group remaining values keyed by groupId. */
  [groupId: string]: string | number | null | CrawlerDayPhase;
};

/**
 * The fully shaped dataset for the Recharts `<ComposedChart>`.
 * Produced by `burndownSelect.rechartsData`.
 */
export type BurndownRechartsData = {
  rows: BurndownRechartsRow[];
  /** Ordered list of groupIds — one `<Bar>` per entry. */
  groupKeys: string[];
  /** Display label for each groupId. */
  groupLabels: Map<string, string>;
  /** Effective date range per groupId — first and last day with poolRemaining > 0. */
  groupDateRanges: Map<string, { effectiveStart: string; effectiveEnd: string }>;
  /** The sequenceId each group belongs to (null for synthetic single-member sequences). */
  groupSequenceIds: Map<string, string | null>;
  mainDate: string;
  snowMelt: string | null;
  snowDeadline: string | null;
};
