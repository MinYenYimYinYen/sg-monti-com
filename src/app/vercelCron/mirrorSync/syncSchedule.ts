// ---------------------------------------------------------------------------
// Sync Tier Schedule
// ---------------------------------------------------------------------------

/**
 * Tier thresholds (in milliseconds) that control how frequently the cron job
 * runs a delta sync based on how recently the mirror was queried.
 *
 * The cron job fires every minute. This function decides whether to actually
 * sync on any given tick, based on user activity:
 *
 * | sinceLastQuery  | Sync frequency |
 * |-----------------|----------------|
 * | 0 – 5 min       | Every minute   |
 * | 5 – 60 min      | Every 5 min    |
 * | > 60 min        | Every 30 min   |
 *
 * Tune these constants to balance freshness vs. RealGreen API load.
 */
const TIER_ACTIVE_MS  =  5 * 60 * 1000; //  5 minutes — sync every minute
const TIER_WARM_MS    = 60 * 60 * 1000; // 60 minutes — sync every 5 min
const INTERVAL_WARM_MIN  =  5;           // minutes between syncs in warm tier
const INTERVAL_COLD_MIN  = 30;           // minutes between syncs in cold tier

/**
 * Returns true if the cron job should run a delta sync on this tick.
 *
 * @param sinceLastQueryMs - Milliseconds since the mirror was last queried.
 *   Pass `Infinity` if `lastQueriedAt` is not set (mirror has never been queried).
 * @param nowMs - Current time in milliseconds (defaults to Date.now()).
 *   Exposed for testability.
 */
export function shouldSync(sinceLastQueryMs: number, nowMs: number = Date.now()): boolean {
  if (sinceLastQueryMs <= TIER_ACTIVE_MS) {
    // Active tier: sync every minute — always true
    return true;
  }

  // Compute whole minutes elapsed since the last query for modulo-based interval checks.
  // We use nowMs to anchor the modulo so the interval is consistent across ticks.
  const sinceLastQueryMin = Math.floor(sinceLastQueryMs / 60_000);

  if (sinceLastQueryMs <= TIER_WARM_MS) {
    // Warm tier: sync every INTERVAL_WARM_MIN minutes
    return sinceLastQueryMin % INTERVAL_WARM_MIN === 0;
  }

  // Cold tier: sync every INTERVAL_COLD_MIN minutes
  return sinceLastQueryMin % INTERVAL_COLD_MIN === 0;
}
