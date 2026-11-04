/** Seasons synced for programs and services: current year -7 through +7. */
export const SYNC_SEASON_SPAN_YEARS = 7;

export type SyncSeasonWindow = {
  currentYear: number;
  floorYear: number;
  ceilYear: number;
  /**
   * ISO 8601 start of the oldest synced season. Used as the `lo` bound for
   * `findSyncEdge` when there is no previous `lastSyncedAt`.
   */
  historyFloorIso: string;
};

/**
 * Single source of truth for the sync season window, shared by delta sync and the
 * chunked full sync so the two always cover the same records.
 */
export function getSyncSeasonWindow(now: Date = new Date()): SyncSeasonWindow {
  const currentYear = now.getFullYear();
  const floorYear = currentYear - SYNC_SEASON_SPAN_YEARS;
  return {
    currentYear,
    floorYear,
    ceilYear: currentYear + SYNC_SEASON_SPAN_YEARS,
    historyFloorIso: `${floorYear}-01-01T00:00:00.000Z`,
  };
}
