# Pace Crawler — Implementation

**Phase 2 Split-Track** | Feature: `bizPlan/paceCrawler`

---

## Design Principles

1. **Price only** — no CSP/CSPOps. Every rate, pool, and drain is a plain `number` (price in
   dollars). Dimensions (count, size) are added later if needed.
2. **Thin selectors** — each selector is one unit of data. No monoliths. Downstream selectors
   read from upstream selectors; they never re-derive what already exists.
3. **Dev-first** — each selector gets a display panel before moving to the next. The dev page
   at `/bizPlan/paceCrawler` shows all panels in tabs.
4. **Re-implement** shared helpers inline rather than importing from `cascadeSelect` internals.
   If the pace module is deprecated later, `paceCrawlerSelect` has no dependency on it.

---

## File Structure

```
src/app/bizPlan/paceCrawler/
├── docs/
│   ├── paceCrawlerPlan.md
│   └── paceCrawlerImplementation.md    ← this file
├── _lib/
│   └── dayCrawlSimulation.ts           ← pure function, no Redux
├── devComponents/
│   ├── NextDateByEmployeePanel.tsx
│   ├── OpenDateFloorPanel.tsx
│   ├── LookbackPricePanel.tsx
│   ├── DailyRatePanel.tsx
│   ├── ActivePoolPanel.tsx
│   ├── CrawlerResultPanel.tsx
│   └── DeltaMapPanel.tsx
├── page.tsx                            ← dev page, tabbed
├── usePaceCrawlerDeps.ts
├── PaceCrawlerTypes.ts
└── paceCrawlerSelect.ts
```

---

## Selector Map (thin, price-only)

| Selector | Returns | Single question answered |
|---|---|---|
| `selectNextDateByEmployee` | `Map<employeeId, string>` | When is each employee next available? |
| `selectServCodeOpenDateFloor` | `Map<servCodeId, string>` | What is each servCode's static open date floor? |
| `selectServCodeProgramTypeMap` | `Map<servCodeId, string>` | What programType does each servCode belong to? |
| `selectEmployeeLookbackPriceMap` | `Map<employeeId, Map<programType, number>>` | What is each employee's avg daily price per programType? |
| `selectDailyRateByEmployeeByServCode` | `Map<employeeId, Map<servCodeId, number>>` | What is each employee's daily price rate per servCode? |
| `selectActivePoolPriceByServCode` | `Map<servCodeId, number>` | How much unscheduled price remains per servCode? |
| `selectCrawlerResult` | `CrawlerResult` | Run the crawl — when does each servCode drain? |
| `selectServCodeDeltaMap` | `Map<servCodeId, ServCodePaceDelta>` | How many days ahead/behind is each servCode? |
| `selectProgCodeProjectedCompletionMap` | `Map<progCodeId, ProgCodeProjectedCompletion>` | When does each program finish? |
| `selectSeasonOptimizerResult` | `SeasonOptimizedRange[]` | What should the date ranges be? |

---

## Tasks

### A0: Update `PaceCrawlerTypes.ts` — price-only

Simplify all CSP fields to plain `number` (price). The existing types use `CSP` objects which
adds complexity before it's useful.

**Changes:**
- `DayCrawlServCodeEntry.pool: number` (was `CSP`)
- `DayCrawlEmployeeEntry.dailyRates: Map<string, number>` (was `Map<string, CSP>`)
- `CrawlerServCodeResult` — no change needed (already uses `string | null` for dates)
- `CrawlerResult` — no change needed

---

### A1: `usePaceCrawlerDeps.ts` + `page.tsx` scaffold

**`usePaceCrawlerDeps.ts`** — same shape as `usePaceDeps.ts`. Loads all data the crawler needs:
- `useCustomerContext({ contexts: ["active"] })`
- `useActiveCustomers({ autoLoad: true })`
- `useProgServ({ autoLoad: true })`
- `useEmployee({ autoLoad: true })`
- `useAssignmentPlan({ autoLoad: true })`
- `useFlag({ autoLoad: true })`
- `useSelectedCustFlags()`
- `useDiscount({ autoLoad: true })`

**`page.tsx`** — `"use client"` page at `/bizPlan/paceCrawler`. Uses `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` from `@/style/components/tabs`. Calls `usePaceCrawlerDeps()`. Renders one tab per dev panel (tabs added as panels are built). Start with an empty shell — just the tabs control with placeholder content.

---

### A2: `selectNextDateByEmployee` → `Map<string, string>`

*"When is each employee next available to work unscheduled jobs?"*

**Logic:**
- Scan `deepSelect.servCodes` — for each service with `status === "$"` and a
  `lastAssigned.schedDate` and `lastAssigned.employeeId`, track the latest `schedDate` per employee.
- Result: `employeeId → dateStrings.nextWeekdayAfter(latestPrintedSchedDate)`, or `today` if
  no printed services for that employee.
- Guard: skip schedDates more than 2 years out (data error sentinel — same guard as `cascadeSelect`).

Input selectors: `deepSelect.servCodes`, `cascadeSelect.mainDate`

**Dev panel `NextDateByEmployeePanel`:**
Table with columns: Employee Name | Next Available Date. Sorted by date ascending.

---

### A3: `selectServCodeOpenDateFloor` + `selectServCodeProgramTypeMap`

**`selectServCodeOpenDateFloor` → `Map<string, string>`**

*"What is each servCode's static open date floor?"*

- `alwaysAsap` servCodes → `today`
- All others → `servCode.dateRange.min` (sequential N+1 floors are set dynamically inside the crawl)
- ServCodes with no valid `dateRange` → skip (don't include in map)

Input selectors: `progServSelect.progCodes`, `cascadeSelect.mainDate`

**`selectServCodeProgramTypeMap` → `Map<string, string>`**

*"What programType does each servCode belong to?"*

Simple flat map: `servCodeId → progCode.programType ?? "__null__"`.

Input selectors: `progServSelect.progCodes`

**Dev panel `OpenDateFloorPanel`:**
Table: ServCode ID | ProgCode ID | ProgramType | Open Date Floor | alwaysAsap. Sorted by floor date.

---

### A4: `selectEmployeeLookbackPriceMap` → `Map<string, Map<string, number>>`

*"What is each employee's avg daily price per programType?"*

Source: `cascadeSelect.employeeLookbackMap` already computes `LookbackStats` per employee per
programType. Extract just the `avgDailyCSP.price` dimension:

```typescript
const selectEmployeeLookbackPriceMap = createSelector(
  [cascadeSelect.employeeLookbackMap],
  (lookbackMap) => {
    const result = new Map<string, Map<string, number>>();
    for (const [employeeId, byProgramType] of lookbackMap) {
      const priceMap = new Map<string, number>();
      for (const [programTypeKey, stats] of byProgramType) {
        if (stats?.avgDailyCSP.price != null) {
          priceMap.set(programTypeKey, stats.avgDailyCSP.price);
        }
      }
      if (priceMap.size > 0) result.set(employeeId, priceMap);
    }
    return result;
  },
);
```

Input selectors: `cascadeSelect.employeeLookbackMap`

**Dev panel `LookbackPricePanel`:**
Table: Employee Name | ProgramType | Avg $/day. Grouped by employee. Shows "—" for missing data.

---

### A5: `selectDailyRateByEmployeeByServCode` → `Map<string, Map<string, number>>`

*"What is each employee's daily price rate per servCode?"*

For each employee in `employeeSelect.employeeMap`, for each `servCodeId` in `employee.servCodeIds`:
1. Look up `programType` from `selectServCodeProgramTypeMap`
2. Look up `lookbackPriceMap.get(employeeId)?.get(programType)` → employee's own rate
3. If no own rate: compute team fallback
   - Team avg = sum of `lookbackPriceMap.get(empId)?.get(programType)` for all employees
     assigned to this servCode (from `servCode.assignedTo`)
   - Known count = number of those employees with a rate
   - Fallback rate = `knownCount > 0 ? teamAvg / knownCount : 0`

Track `isEstimated` per entry for the dev panel display.

Input selectors: `employeeSelect.employeeMap`, `selectEmployeeLookbackPriceMap`,
`selectServCodeProgramTypeMap`, `progServSelect.servCodeMap`

**Dev panel `DailyRatePanel`:**
Table: Employee Name | ServCode ID | $/day | Estimated?. Sorted by employee then servCode.
Show estimated rows in muted style.

---

### A6: `selectActivePoolPriceByServCode` → `Map<string, number>`

*"How much unscheduled price remains per servCode?"*

Trivial extraction from `rawPaceSelect.rawServCodePacesPerDayMap`:

```typescript
const selectActivePoolPriceByServCode = createSelector(
  [rawPaceSelect.rawServCodePacesPerDayMap],
  (perDayMap) => {
    const result = new Map<string, number>();
    for (const [servCodeId, perDay] of perDayMap) {
      result.set(servCodeId, perDay.activeAsapCSP.price);
    }
    return result;
  },
);
```

Input selectors: `rawPaceSelect.rawServCodePacesPerDayMap`

**Dev panel `ActivePoolPanel`:**
Table: ServCode ID | ProgCode ID | $ Remaining. Sorted by $ remaining descending.
Only show servCodes with price > 0.

---

### A7: `dayCrawlSimulation.ts` + `selectCrawlerResult`

**`_lib/dayCrawlSimulation.ts`** — pure function, no Redux.

```typescript
export function runDayCrawlSimulation(
  servCodeEntries: DayCrawlServCodeEntry[],
  employeeEntries: DayCrawlEmployeeEntry[],
  today: string,
): CrawlerResult
```

**Algorithm:**
1. Clone pools: `Map<servCodeId, number>` from `entry.pool`
2. Build `resolvedOpenDateFloor: Map<servCodeId, string>` from `entry.openDateFloor`
3. Build sequential groups: for each `runsInSequence` progCode, sort servCodes by
   `openDateFloor` ascending. Lock all except the first.
   `sequentialLocks: Map<servCodeId, boolean>`
4. Walk forward: `day = today`, advance with `dateStrings.nextWeekdayAfter(day)`.
   Safety cap: `dateStrings.addWeekdays(today, 365)`.
5. Each day, for each employee:
   - `personalOpenDate = employee.nextAvailableDate`
   - Walk `employee.servCodeIds` in priority order:
     - Skip if locked
     - `effectiveOpenDate = max(personalOpenDate, resolvedOpenDateFloor[servCodeId])`
     - If `day >= effectiveOpenDate` and `pools[servCodeId] > 0`:
       - `drain = Math.min(employee.dailyRates.get(servCodeId) ?? 0, pools[servCodeId])`
       - `pools[servCodeId] -= drain`
       - If `pools[servCodeId] <= 0` and `projectedEndDate[servCodeId]` not yet set:
         - `projectedEndDate[servCodeId] = day`
         - If sequential and has successor: unlock successor, update its floor
       - `break`
6. Build `CrawlerResult.byServCode` from resolved floors + projected end dates.
   - `proposedMax = projectedEndDate != null ? addWeekdays(projectedEndDate, paddingDays) : currentMax`

**`selectCrawlerResult`** — assembles entries and calls `runDayCrawlSimulation`.

Builds `DayCrawlServCodeEntry[]` from `progServSelect.progCodes` + layers 2, 4.
Builds `DayCrawlEmployeeEntry[]` from `employeeSelect.employeeMap` + layers 1, 3b.

Input selectors: `selectNextDateByEmployee`, `selectServCodeOpenDateFloor`,
`selectDailyRateByEmployeeByServCode`, `selectActivePoolPriceByServCode`,
`employeeSelect.employeeMap`, `progServSelect.progCodes`, `cascadeSelect.mainDate`

**Dev panel `CrawlerResultPanel`:**
Table: ServCode ID | ProgCode ID | Resolved Open Floor | Projected End Date | Proposed Min | Proposed Max | Current Max.
Color projected end date: green if before current max, red if after.

---

### A8: Layer 6 selectors

**`selectServCodeDeltaMap` → `Map<string, ServCodePaceDelta>`**

For each servCode in `progServSelect.servCodes`:
- `projectedEndDate` from `crawlerResult.byServCode.get(servCodeId)?.projectedEndDate`
- `deltaDays = projectedEndDate != null && pool > 0 ? weekdaysBetween(dateRange.max, projectedEndDate) : null`
- `deltaDaysCSP = null` (price-only for now)

Type: `ServCodePaceDelta` from `PaceTypes.ts` — reuse exactly.

**`selectProgCodeProjectedCompletionMap` → `Map<string, ProgCodeProjectedCompletion>`**

Latest `projectedEndDate` across all servCodes in the progCode.
Falls back to `dateRange.max` with `isEstimated = true` when `projectedEndDate` is null.

**`selectSeasonOptimizerResult` → `SeasonOptimizedRange[]`**

One entry per servCode across all progCodes, built from `crawlerResult.byServCode`.
`isStarted = resolvedOpenDateFloor <= today`.
`hasWork = activePoolPrice > 0`.

Input selectors: `selectCrawlerResult`, `selectActivePoolPriceByServCode`,
`progServSelect.progCodes`, `cascadeSelect.mainDate`

**Dev panel `DeltaMapPanel`:**
Table: ServCode ID | Projected End | Current Max | Delta Days | isEstimated.
Color delta: green (ahead), red (behind), neutral (on pace ±2d).

---

### A9: Update `matrixSelect.ts` — delegate to `paceCrawlerSelect`

Replace bodies of three selectors with delegation:
- `selectServCodePaceDeltaMap` → `paceCrawlerSelect.servCodeDeltaMap`
- `selectProgCodeProjectedCompletionMap` → `paceCrawlerSelect.progCodeProjectedCompletionMap`
- `selectSeasonOptimizerResult` → `paceCrawlerSelect.seasonOptimizerResult`

Remove dead helper functions:
- `computePoolDrainDate`
- `buildDimensionAvailability`
- `computeDeltaDaysCSP`
- `computeCascadeAwareProposedMin`
- `computeSimulatedDrainDate`
- `buildEmployeeSimEntries`

Keep unchanged: `selectMatrixDisplayConfig`, `selectSeasonOptimizerConfig`,
`selectMatrixDeltaDaysBounds`, `selectMatrixFilteredSortedProgCodePaces`.

---

### A10: Fix `OptimizerInsightsPopover.tsx` — `closeDate` correction

In `buildServCodeEventGroups`, the `closeDate` for each employee's sim entry currently uses
`proposed.proposedMax`. This is wrong — `proposedMax` is the answer we're computing.

**Change** (inside the `simEntries` map):
```typescript
// Before:
const closeDate = proposed ? proposed.proposedMax : today;

// After:
const effectiveDailyRate = entry.dailyRate.price > 0 ? entry.dailyRate.price : 1;
const totalPoolPrice = pace?.activeAsapCSP.price ?? 0;
const daysNeeded = totalPoolPrice > 0
  ? Math.ceil(totalPoolPrice / effectiveDailyRate)
  : 260;
const closeDate = proposed
  ? dateStrings.addWeekdays(proposed.proposedMin, daysNeeded * 3 + 30)
  : today;
```

`openDate` already uses `proposed.proposedMin` — no change needed there.

---

## Status Table

| Task | Status |
|---|---|
| A0: Update `PaceCrawlerTypes.ts` — price-only | ✅ |
| A1: `usePaceCrawlerDeps.ts` + `page.tsx` scaffold | ✅ |
| A2: `selectNextDateByEmployee` + `NextDateByEmployeePanel` | ✅ |
| A3: `selectServCodeOpenDateFloor` + `selectServCodeProgramTypeMap` + `OpenDateFloorPanel` | ✅ |
| A4: `selectEmployeeLookbackPriceMap` + `LookbackPricePanel` | ✅ |
| A5: `selectDailyRateByEmployeeByServCode` + `DailyRatePanel` | ☐ |
| A6: `selectActivePoolPriceByServCode` + `ActivePoolPanel` | ☐ |
| A7: `dayCrawlSimulation.ts` + `selectCrawlerResult` + `CrawlerResultPanel` | ☐ |
| A8: Layer 6 selectors + `DeltaMapPanel` | ☐ |
| A9: Update `matrixSelect.ts` — delegate | ☐ |
| A10: Fix `OptimizerInsightsPopover.tsx` closeDate | ☐ |

---

## Open Todos

### TODO: ServCode × ProgramType Audit Panel

**Owner**: Human (data review + CRM sync)

Build a dev panel (`ServCodeByProgramTypePanel`) that groups all servCodes by their `programType`.
The purpose is to audit whether the programType groupings in RealGreen correctly reflect which
servCodes are schedulable together in a single day by a single employee.

**Why this matters**: `selectDailyRateByEmployeeByServCode` uses `programType` as the key to
look up an employee's avg daily rate. If two servCodes that are worked together on the same day
have different programTypes, the lookback data will be split across two buckets — each showing
a lower rate than reality. The crawl will then underestimate throughput for both.

**What to check**: For each programType group, verify that all servCodes in the group are
genuinely interchangeable from a scheduling perspective (same crew, same equipment, same day).
If a servCode is in the wrong group (or has `null` programType when it should share a group),
update the programType in RealGreen to bring the CRM data into sync.

**Panel layout**: Group by programType → list servCodes under each group with their progCodeId
and longName. Highlight `__null__` group in red (these servCodes have no programType and will
always fall back to team-average rates).
