# 261002 Refactors — Required Reading & Open Problems

## Context

This document was created 10/2/2026 to hand off an active debugging session to a fresh conversation. The paceCrawler Gantt chart was producing incorrect projected end dates, and a series of refactors were made to fix the root causes. Several issues remain open.

---

## Required Reading (in order)

Read these files to understand the current state of the codebase before making any changes:

1. **`src/app/bizPlan/seasonPlan/SeasonPlanTypes.ts`** — `SeasonPlan`, `GroupSchedule` types. The season plan is the authoritative source of planned start/end dates per group.

2. **`src/app/bizPlan/paceCrawler/PaceCrawlerTypes.ts`** — `DayCrawlServCodeEntry`, `SeasonOptimizedRange`, `CrawlerResult`. Note: `servCodeRangeMax` was removed from `DayCrawlServCodeEntry` in this session. `SeasonOptimizedRange` now has `plannedStart` and `plannedEnd`.

3. **`src/app/bizPlan/paceCrawler/paceCrawlerSelect.ts`** — The full selector pipeline. Key changes this session:
   - `selectServCodeOpenDateFloor` now uses `plannedStart` from the season plan as the open date floor. ServCodes not in any season plan group are excluded from the crawl entirely.
   - `selectSeasonOptimizerResult` now populates `plannedStart` on `SeasonOptimizedRange`.
   - `servCodeRangeMax` removed from `DayCrawlServCodeEntry` construction.

4. **`src/app/bizPlan/paceCrawler/_lib/dayCrawlSimulation.ts`** — The day-crawl simulation. Key changes this session:
   - Removed `isPastDue` check from pre-crawl cascade (was zeroing pools using stale RealGreen `dateRange.max`).
   - Replaced all `servCodeRangeMax` references with `plannedEnd`.
   - Added non-sequential cascade close: when all members of a group are past their `plannedEnd` AND above the cascade threshold, the crawl skips the group and records `projectedEndDate = plannedEnd`.
   - **KNOWN BUG (open):** The cascade threshold check in the non-sequential close is comparing `currentPool` (active/asap only) against `totalPool` (all services including completed/printed), producing a near-100% completion rate even when $90k of real work remains. This causes the cascade close to fire immediately on the first day after `plannedEnd`, recording `projectedEndDate = plannedEnd` instead of the real projected finish.

5. **`src/app/bizPlan/paceCrawler/devComponents/GanttChartPanel.tsx`** — The Gantt chart. Key changes this session:
   - Plan band now uses `row.plannedStart → row.plannedEnd` (was using `row.optimizedMin` as start, which was wrong).
   - Segmented bars removed. Each group is now a single clickable bar.
   - Popover replaced with `GanttGroupStatusDetail`.

6. **`src/app/bizPlan/paceCrawler/devComponents/GanttBarDetail.tsx`** — The new status-based popover. Shows price remaining as of the "As of" date, computed from actual `doneDate` on services. Crew section uses actual `doneBy` records for past/today dates, assignment plan for future dates.

7. **`src/app/realGreen/progServ/_lib/types/ServCodeTypes.ts`** — `ServCodeDocProps.dateRange` is marked `@deprecated`. **It was temporarily commented out during this session to find all usages.** It must be restored (un-commented) for the build to pass. The property is still used in many non-paceCrawler files (dev panels, `ServCodeUtils`, `ServCodeEditPanel`, `ServCodeListPanel`, `callAheadRow`, `baseServCode`, `ServCodeDocPropsModel`, `progServActions`). Full removal is deferred.

---

## Open Problems

### 1. Non-sequential cascade close fires too early (CRITICAL)

**File:** `src/app/bizPlan/paceCrawler/_lib/dayCrawlSimulation.ts`

**Symptom:** LR5+OW4 shows "Projected finish: 10/5" (the `plannedEnd`) even though ~8 days of work remain at $12,600/day.

**Root cause:** The non-sequential cascade close checks `completionPct >= cascadeThreshold`. But:
- `currentPool` = active pool (only `Y`/`*` status services) ≈ $44
- `totalPool` = all services including completed (`S`) and printed (`$`) ≈ $277k
- `completionPct = 1 - (44 / 277,000) = 99.98%` → always above 90% threshold

So the cascade close fires on the first day after `plannedEnd`, recording `projectedEndDate = plannedEnd` instead of the real projected finish.

**Fix:** Remove the cascade threshold check from the non-sequential close. Only close when `day > plannedEnd`:

```ts
const allMembersPastDeadline = servCodeIds.every((servCodeId) => {
  const entry = servCodeEntries.find((e) => e.servCodeId === servCodeId);
  if (!entry || !entry.plannedEnd) return false;
  return day > entry.plannedEnd;
});
```

The cascade threshold was designed for sequential progCodes (unlock N+1 when N is 90% done). For non-sequential groups, the only meaningful close condition is `today > plannedEnd`.

### 2. `servCode.dateRange` still used in dev panels (LOW PRIORITY)

**Files:** `AssignmentEditorPanel.tsx`, `CrawlerResultPanel.tsx`, `DeltaMapPanel.tsx`, `DiffD0OpenServCodesPanel.tsx`, `DiffD1RemainingWeekdaysPanel.tsx`

These dev/debug panels still read `servCode.dateRange.min`/`.max` for display purposes. They should be updated to use `plannedStart`/`plannedEnd` from the season plan instead. Deferred — restore `dateRange` on `ServCodeDocProps` first to unblock the build.

### 3. Season plan copy feature (DONE)

Implemented in `src/app/bizPlan/paceCrawler/seasonPlan/page.tsx`. Copy button on each plan card pre-populates the form with all fields except the name.

### 4. Season plan feasibility feedback (DONE)

Per-group feasibility badges in the season plan form. Info icon popover shows price remaining, goal $/day, days available/needed, price on end date, days early/late.

---

## Architecture Notes

### Why `servCode.dateRange` was removed from the crawler

The RealGreen `dateRange` on `ServCodeDoc` is a legacy planning date that predates the season plan concept. It was being used as:
- The open date floor for the crawl (`servCodeRangeMin`)
- The urgency deadline for drain weighting
- The fallback `optimizedMax` when no projected end date exists
- A "past due" trigger in the pre-crawl cascade

All of these have been replaced with `plannedStart`/`plannedEnd` from the active `SeasonPlan`. The `dateRange` field is still on the type (marked deprecated) and still used in non-crawler code.

### How the crawler determines what to crawl

`selectServCodeOpenDateFloor` in `paceCrawlerSelect.ts` is the gatekeeper. A servCode is included in the crawl if and only if:
1. It is `alwaysAsap` (open date = today), OR
2. It has a `plannedStart` in the active season plan's group schedules

ServCodes not in any season plan group are excluded entirely.

### The active pool vs total pool distinction

- **Active pool** (`selectActivePoolPriceByServCode`): sum of `price` for services with `isActionable` status (`Y` or `*`). This is what the crawler drains.
- **Total pool** (`selectTotalPoolPriceByServCode`): sum of `price` for all non-`N` services. Used to compute `completionPct` for sequential cascade unlock.

The cascade threshold check (`completionPct >= cascadeThreshold`) is only meaningful for sequential progCodes where the total pool accurately reflects the full season's work. For non-sequential groups mid-season, most work is already completed (`S`) or printed (`$`), making `completionPct` artificially high.
