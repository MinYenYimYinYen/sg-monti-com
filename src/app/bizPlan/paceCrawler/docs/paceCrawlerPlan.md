# Pace Crawler — Plan

**Phase 1 Plan** | Feature: `bizPlan/paceCrawler`

---

## Purpose

Replace the event-based optimizer in `matrixSelect.ts` with a **day-crawl simulation** that is
correct, circular-dependency-free, and composable. The crawler becomes the single source of truth
for:

- Projected servCode completion dates (`projectedEndDate`)
- Proposed season date ranges (`proposedMin`, `proposedMax`)
- Pace delta (days ahead/behind vs persisted `dateRange.max`)
- ProgCode projected completion dates

The existing `pace/` module (daily scheduling cascade, employee cards, lookback) is unchanged.
The crawler is a separate, additive layer that answers season-level questions.

---

## The Problem with the Current Approach

The event-based optimizer (`selectSeasonOptimizerResult` in `matrixSelect.ts`) has a circular
dependency:

- `proposedMax` for servCode N is computed by `computeSimulatedDrainDate`
- `computeSimulatedDrainDate` builds employee sim entries using `allProposedRanges.get(servCodeId)?.proposedMax` as `closeDate`
- But `proposedMax` is what we're trying to compute

The rough seed for `proposedMax` (from the delta map's `projectedEndDate`) is often stale or
zero for sequential servCodes whose `dateRange.min` hasn't been updated yet. This causes LR2
(and similar sequential servCodes) to get a 2-day window when they need a 6-week window.

The day-crawl eliminates this by never needing a `closeDate` upfront — it just walks forward
until the pool is empty.

---

## Desired Behaviors

### Optimizer (Season Planner)

- For each servCode, compute `proposedMin`, `proposedMax`, `projectedEndDate`
- Sequential progCodes: servCode N+1 opens the weekday after N's pool drains
- Independent progCodes: each servCode opens at `max(today, dateRange.min)` independently
- First servCode of a sequential progCode: opens at `dateRange.min` (not early)
- Already-started servCodes: `proposedMin` = `dateRange.min` (locked), pool = `activeAsapCSP`
- No work remaining: `proposedMax` = `proposedMin` (zero-width, no change proposed)

### Monitoring (Always-On)

- The crawler runs continuously as a Redux selector
- Output is always available for downstream components
- Replaces `selectServCodePaceDeltaMap`'s `projectedEndDate` and `deltaDays`

### Future: Correction Intel (not implemented now)

- Compare `projectedEndDate` (crawler) to `dateRange.max` (persisted plan)
- Surface per-employee CSP targets to hit the planned deadline
- Compression function: given a desired `dateRange.max`, return required daily CSP per employee

---

## Algorithm: Day-Crawl Simulation

### Core Idea

Walk forward one weekday at a time from `crawlStart`. On each day, for each employee, find their
highest-priority open servCode with remaining pool and drain their daily rate from it. Stop when
all pools are exhausted or the safety cap is reached.

No `closeDate` is needed — the simulation window is open-ended. Sequential servCodes are
dynamically unlocked as their predecessor drains.

### `openDate` Rules

Each employee has a **personal start date** — the next weekday after their latest printed
`schedDate` across all servCodes (or `today` if no printed services). This is the earliest they
can work any unscheduled job.

Each servCode has an **open date floor** — the earliest calendar date it is eligible to be worked:

| Scenario | servCode floor |
|---|---|
| Independent, any state | `dateRange.min` |
| Sequential, first servCode | `dateRange.min` |
| Sequential, N+1 (predecessor done) | `max(dateRange.min[N+1], projectedEndDate[N] + 1 weekday)` |
| Sequential, N+1 (predecessor not done) | locked — not eligible yet |

**Effective open date** for employee E on servCode S:
```
max(employee's personal start date, servCode's open date floor)
```

### Pseudocode

```
pools = { servCodeId → activeAsapCSP (count, size, price) }
projectedEndDate = { servCodeId → null }
sequentialLocks = { servCodeId → locked? }  // sequential N+1 servCodes start locked

crawlStart = today
maxDay = addWeekdays(crawlStart, 365)  // safety cap

day = crawlStart
while any pool > 0 and day <= maxDay:
  for each employee:
    personalOpenDate = nextDateByEmployee[employeeId]  // from selectNextDateByEmployee
    for each servCodeId in employee.servCodeIds (priority order):
      if sequentialLocks[servCodeId]: continue  // not yet unlocked
      servCodeFloor = resolvedOpenDateFloor[servCodeId]
      effectiveOpenDate = max(personalOpenDate, servCodeFloor)
      if day >= effectiveOpenDate and pools[servCodeId].price > 0:
        drain = min(dailyRate[employeeId][servCodeId], pools[servCodeId])
        pools[servCodeId] -= drain (per dimension)
        if pools[servCodeId].price <= 0:
          projectedEndDate[servCodeId] = day
          if servCodeId is sequential and has a successor:
            unlock successor
            set successor's floor = max(successor.dateRange.min, nextWeekday(day))
        break  // employee works one servCode per day

  day = nextWeekday(day)

// Compute proposedMin, proposedMax
for each servCode:
  proposedMin = resolvedOpenDateFloor[servCodeId]  // or dateRange.min for started servCodes
  proposedMax = projectedEndDate[servCodeId]
              ? addWeekdays(projectedEndDate[servCodeId], paddingDays)
              : dateRange.max  // fallback: no data, keep current max
```

### Dimension Handling

All three dimensions (count, size, price) are tracked in parallel. `projectedEndDate` is
determined by `price` (the primary drain signal — revenue-weighted). `deltaDaysCSP` is computed
per-dimension from the same crawl output.

### Fallback: No Lookback Data

If an employee has no `avgDailyCSP` for a servCode's programType:
- Use team average ÷ known-employee count (even-split fallback)
- If no team data at all: use `pool / daysRemaining` as a neutral estimate

---

## Selector Decomposition — "The Story"

Each selector answers one specific question. Reading them in order tells the full story of the
crawler.

### Layer 1 — Employee Availability

**`selectNextDateByEmployee`** → `Map<employeeId, string>`

*"When is each employee next available to work unscheduled jobs?"*

= `nextWeekdayAfter(employee's latest printed schedDate across all servCodes)`
= `today` if no printed services

Source: `deepSelect.servCodes` (printed services by employee)

---

### Layer 2 — ServCode Open Date Floors

**`selectServCodeOpenDateFloor`** → `Map<servCodeId, string>`

*"What is the earliest calendar date each servCode is eligible to be worked?"*

= `dateRange.min` for independent servCodes and first servCode of sequential progCodes
= dynamically set during crawl for sequential N+1 servCodes (internal crawl state, not a static selector)

Source: `progServSelect.servCodeDocMap`, `progServSelect.progCodes`

---

### Layer 3 — Employee Daily Rates

**`selectDailyRateByEmployeeByServCode`** → `Map<employeeId, Map<servCodeId, CSP>>`

*"How fast does each employee work each servCode?"*

= `LookbackStats.avgDailyCSP` for the servCode's programType
= team average ÷ known-employee count for employees without lookback data

Source: `cascadeSelect.employeeLookbackMap`, `assignmentPlanSelect.assignmentsByEmployeeId`,
`progServSelect.servCodeDocMap` (for programType)

---

### Layer 4 — Work Pools

**`selectActivePoolByServCode`** → `Map<servCodeId, CSP>`

*"How much unscheduled work remains in each servCode?"*

= `activeAsapCSP` per servCode (active + asap services, excludes printed)

Source: `rawPaceSelect.rawServCodePacesPerDayMap`

---

### Layer 5 — Crawl Result

**`selectCrawlerResult`** → `CrawlerResult`

*"Run the day-crawl: when does each servCode's pool drain, and what are the proposed date ranges?"*

Inputs: layers 1–4 + `assignmentPlanSelect.assignmentsByEmployeeId` + progCode structure

```typescript
type CrawlerResult = {
  projectedEndDate: Map<string, string | null>; // servCodeId → drain date (null = no data)
  proposedMin: Map<string, string>;             // servCodeId → effective open date
  proposedMax: Map<string, string>;             // servCodeId → drain date + paddingDays
};
```

---

### Layer 6 — Derived Outputs

**`selectServCodeDeltaMap`** → `Map<servCodeId, ServCodePaceDelta>`

*"How many days ahead/behind is each servCode projected to finish vs its planned dateRange.max?"*

Source: `crawlerResult.projectedEndDate` + `servCode.dateRange.max`

**`selectProgCodeProjectedCompletionMap`** → `Map<progCodeId, ProgCodeProjectedCompletion>`

*"When will each program be fully done?"*

= latest `projectedEndDate` across all servCodes in the progCode
= falls back to `dateRange.max` with `isEstimated = true` when no lookback data

**`selectSeasonOptimizerResult`** → `SeasonOptimizedRange[]`

*"What should the date ranges be, given current throughput and work pools?"*

= `crawlerResult.proposedMin/Max` vs `servCode.dateRange` (current persisted values)

---

## File Structure

```
src/app/bizPlan/paceCrawler/
├── docs/
│   └── paceCrawlerPlan.md          ← this file
├── _lib/
│   └── dayCrawlSimulation.ts       ← pure function, no Redux dependencies
├── PaceCrawlerTypes.ts             ← DayCrawlEntry, DayCrawlEmployeeEntry, CrawlerResult
└── paceCrawlerSelect.ts            ← all selectors (layers 1–6)
```

---

## Integration Points

### `matrixSelect.ts` (existing)

- `selectSeasonOptimizerResult` → delegates to `paceCrawlerSelect.seasonOptimizerResult`
- `selectServCodePaceDeltaMap` → delegates to `paceCrawlerSelect.servCodeDeltaMap`
- `selectProgCodeProjectedCompletionMap` → delegates to `paceCrawlerSelect.progCodeProjectedCompletionMap`
- Matrix display config, filters, sort selectors — unchanged

### `assignmentPlan/matrix/SeasonOptimizerDialog.tsx`

- Import `seasonOptimizerResult` from `paceCrawlerSelect` instead of `matrixSelect`
- No other changes needed

### `assignmentPlan/matrix/OptimizerInsightsPopover.tsx`

- `openDate` for per-employee sims = `crawlerResult.proposedMin[servCodeId]` (correct, from crawler)
- `closeDate` for per-employee sims = capacity-derived (`addWeekdays(openDate, daysNeeded * 3 + 30)`) — NOT `proposedMax`
- `proposedMax` is the answer; `closeDate` is the search window for the event-detail simulation

### `assignmentPlan/matrix/AssignmentMatrix.tsx`

- Import `servCodeDeltaMap` and `progCodeProjectedCompletionMap` from `paceCrawlerSelect`

---

## What This Replaces

| Current | Replacement |
|---|---|
| `selectSeasonOptimizerResult` (two-pass event-based) | `paceCrawlerSelect.seasonOptimizerResult` |
| `computeSimulatedDrainDate` in `matrixSelect.ts` | Removed |
| `buildEmployeeSimEntries` in `matrixSelect.ts` | Removed |
| `computePoolDrainDate` in `matrixSelect.ts` | Removed (or kept for per-dimension delta only) |
| `selectServCodePaceDeltaMap` (event-based) | `paceCrawlerSelect.servCodeDeltaMap` |
| `selectProgCodeProjectedCompletionMap` in `matrixSelect.ts` | `paceCrawlerSelect.progCodeProjectedCompletionMap` |

## What This Does NOT Replace

- `runCascadeSimulation` (`pace/_lib/cascadeSimulation.ts`) — still used for daily scheduling cascade and popover event detail
- `cascadeSelect.ts` — employee lookback + daily scheduling cascade (unchanged)
- `rawPaceSelect.ts`, `servCodePaceSelect.ts`, `employeeCardSelect.ts` — unchanged

---

## Open Questions (Resolved)

| Question | Decision |
|---|---|
| Single-pass vs two-pass sequential chaining | Single-pass: unlock N+1 dynamically during crawl when N drains |
| Dimension for drain signal | `price` drives `projectedEndDate`; all three tracked in parallel for `deltaDaysCSP` |
| New file vs extend `matrixSelect.ts` | New module: `bizPlan/paceCrawler/` |
| `openDate` for already-started servCodes | `dateRange.min` (floor); pool = `activeAsapCSP`; employee personal start = `nextDateByEmployee` |
| Early start for sequential progCodes | First servCode never starts early; N+1 opens at `max(dateRange.min[N+1], projectedEndDate[N]+1)` |
| Employees without lookback data | Team average ÷ known-employee count fallback |

---

## Implementation Order

1. `PaceCrawlerTypes.ts` — types only ✅ done
2. `_lib/dayCrawlSimulation.ts` — pure function
3. `paceCrawlerSelect.ts` — layers 1–6 selectors
4. Update `matrixSelect.ts` to delegate to `paceCrawlerSelect`
5. Fix `OptimizerInsightsPopover.tsx` `closeDate`

---

## Handoff Instructions (New Session)

### Context Files to Read (in order)

Read these files before writing any code. They provide the full picture of what exists and what
the crawler integrates with.

**1. This plan doc** — you're reading it.

**2. Types already created:**
- `src/app/bizPlan/paceCrawler/PaceCrawlerTypes.ts` — crawler input/output types (already written)

**3. The data sources the crawler reads from:**
- `src/app/bizPlan/pace/selectors/cascadeSelect.ts` — `employeeLookbackMap` (avgDailyCSP per employee per programType), `buildEmployeeLatestPrintedDateMap` logic (reuse for `selectNextDateByEmployee`)
- `src/app/bizPlan/pace/selectors/rawPaceSelect.ts` — `rawServCodePacesPerDayMap` (source of `activeAsapCSP` per servCode)
- `src/app/bizPlan/assignmentPlan/assignmentPlanSelect.ts` — `assignmentsByEmployeeId` (priority-ordered servCodeIds per employee)

**4. The selectors being replaced:**
- `src/app/bizPlan/pace/selectors/matrixSelect.ts` — contains `selectSeasonOptimizerResult`, `selectServCodePaceDeltaMap`, `selectProgCodeProjectedCompletionMap` — all three will delegate to `paceCrawlerSelect` after this work

**5. The types used by the selectors being replaced:**
- `src/app/bizPlan/pace/PaceTypes.ts` — `SeasonOptimizedRange`, `ServCodePaceDelta`, `ProgCodeProjectedCompletion` (reuse these types in `paceCrawlerSelect` output)

**6. The date utility used throughout:**
- `src/lib/primatives/dates/dateStrings.ts` — `dateStrings.addWeekdays`, `dateStrings.nextWeekday`, `dateRanges.weekdaysBetween` — use these, do not roll your own date math

**7. The progServ selector for servCode/progCode structure:**
- `src/app/realGreen/progServ/_lib/slice/progServSlice.ts` or the progServ select file — needed to get `dateRange.min/max`, `paddingDays`, `runsInSequence`, `programType` per servCode

### What to Build

1. **`src/app/bizPlan/paceCrawler/_lib/dayCrawlSimulation.ts`**
   Pure function. Signature:
   ```typescript
   function runDayCrawlSimulation(
     servCodeEntries: DayCrawlServCodeEntry[],
     employeeEntries: DayCrawlEmployeeEntry[],
     today: string,
   ): CrawlerResult
   ```
   Follow the pseudocode in the "Algorithm" section above exactly.
   Use `dateStrings.nextWeekday(day)` to advance days.
   Use `dateStrings.addWeekdays(date, n)` for `proposedMax` computation.

2. **`src/app/bizPlan/paceCrawler/paceCrawlerSelect.ts`**
   Six selectors in order (the "story"):
   - `selectNextDateByEmployee` → `Map<employeeId, string>`
   - `selectServCodeOpenDateFloor` → `Map<servCodeId, string>` (static floors only; sequential N+1 floors are internal to the crawl)
   - `selectDailyRateByEmployeeByServCode` → `Map<employeeId, Map<servCodeId, CSP>>`
   - `selectActivePoolByServCode` → `Map<servCodeId, CSP>`
   - `selectCrawlerResult` → `CrawlerResult`
   - `selectServCodeDeltaMap`, `selectProgCodeProjectedCompletionMap`, `selectSeasonOptimizerResult`

   Export as `paceCrawlerSelect` object.

3. **Update `src/app/bizPlan/pace/selectors/matrixSelect.ts`**
   Replace the bodies of `selectSeasonOptimizerResult`, `selectServCodePaceDeltaMap`, and
   `selectProgCodeProjectedCompletionMap` to delegate to `paceCrawlerSelect`.
   Remove `computeSimulatedDrainDate`, `buildEmployeeSimEntries`, `computePoolDrainDate`.

4. **Fix `src/app/bizPlan/assignmentPlan/matrix/OptimizerInsightsPopover.tsx`**
   In `buildServCodeEventGroups`, change the `closeDate` for each employee's sim entry from
   `proposed.proposedMax` to a capacity-derived value:
   ```typescript
   const daysNeeded = effectiveDailyRate.price > 0
     ? Math.ceil(totalPoolPrice / effectiveDailyRate.price)
     : 260;
   const closeDate = dateStrings.addWeekdays(openDate, daysNeeded * 3 + 30);
   ```
   Also update `openDate` to use `crawlerResult.proposedMin.get(servCodeId) ?? item.proposedMin`.

### Key Invariants to Preserve

- `activeAsapCSP` (not `unfinishedCSP`) is the pool — excludes printed services
- `price` dimension drives `projectedEndDate`; all three dimensions drained in parallel
- Sequential N+1 servCodes start **locked** and are unlocked dynamically when N's price pool hits zero
- First servCode of a sequential progCode is **never** started early (floor = `dateRange.min`)
- Employee personal start date = `nextWeekdayAfter(latestPrintedSchedDate)` or `today`
- `proposedMax` = `addWeekdays(projectedEndDate, paddingDays)` or `currentMax` fallback
