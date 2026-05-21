# Pace Crawler — Implementation

**Phase 2 Split-Track** | Feature: `bizPlan/paceCrawler`

---

## Terminology

Two distinct date range concepts exist in this module. Use these terms consistently:

| Term | Meaning | Source |
|---|---|---|
| `servCodeRange` | The RealGreen-assigned date range (`servCode.dateRange`) | `ServCodeDeep.dateRange` |
| `optimizedRange` | The crawler's recommended date range | Output of `runDayCrawlSimulation` |
| `servCodeRangeMin` | `servCodeRange.min` — earliest eligible work date | `DayCrawlServCodeEntry.servCodeRangeMin` |
| `servCodeRangeMax` | `servCodeRange.max` — RealGreen season end (fallback) | `DayCrawlServCodeEntry.servCodeRangeMax` |
| `optimizedMin` | Crawler's recommended start (= `resolvedServCodeRangeMin` at drain) | `CrawlerServCodeResult.optimizedMin` |
| `optimizedMax` | Crawler's recommended end (= `projectedEndDate`, or `servCodeRangeMax` as fallback) | `CrawlerServCodeResult.optimizedMax` |

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
│   ├── dayCrawlSimulation.ts           ← pure function, no Redux
│   └── employeeLookbackUtils.ts        ← lookback stat helpers
├── devComponents/
│   ├── NextDateByEmployeePanel.tsx
│   ├── OpenDateFloorPanel.tsx
│   ├── LookbackPricePanel.tsx
│   ├── DailyRatePanel.tsx
│   ├── ActivePoolPanel.tsx
│   ├── CrawlerResultPanel.tsx
│   ├── DeltaMapPanel.tsx
│   ├── AssignmentEditorPanel.tsx
│   ├── EmployeeTimelinePanel.tsx
│   ├── ServCodeTimelinePanel.tsx
│   └── GanttChartPanel.tsx
├── page.tsx                            ← dev page, tabbed (11 tabs)
├── usePaceCrawlerDeps.ts
├── PaceCrawlerTypes.ts
├── paceCrawlerSelect.ts
├── paceCrawlerSlice.ts                 ← mainDate slice
├── paceCrawlerLookbackSelect.ts        ← employeeLookbackMap (independent of pace/)
└── paceCrawlerRawSelect.ts             ← activeAsapCSP per servCode (independent of pace/)
```

---

## Selector Map (thin, price-only)

| Selector | Returns | Single question answered |
|---|---|---|
| `selectNextDateByEmployee` | `Map<employeeId, string>` | When is each employee next available? |
| `selectServCodeOpenDateFloor` | `Map<servCodeId, string>` | What is each servCode's static open date floor (= `servCodeRangeMin`)? |
| `selectServCodeProgramTypeMap` | `Map<servCodeId, string>` | What programType does each servCode belong to? |
| `selectEmployeeLookbackPriceMap` | `Map<employeeId, Map<programType, number>>` | What is each employee's avg daily price per programType? |
| `selectTotalAvgDailyPriceByEmployee` | `Map<employeeId, number>` | What is each employee's total avg daily price (for group drain)? |
| `selectTeamAvgTotalDailyPrice` | `number` | What is the team's average total daily price (fallback for new hires)? |
| `selectDailyRateByEmployeeByServCode` | `Map<employeeId, Map<servCodeId, number>>` | What is each employee's daily price rate per servCode? |
| `selectActivePoolPriceByServCode` | `Map<servCodeId, number>` | How much unscheduled price remains per servCode? |
| `selectCrawlerResult` | `CrawlerResult` | Run the crawl — when does each servCode drain? |
| `selectServCodeDeltaMap` | `Map<servCodeId, ServCodePaceDelta>` | How many days ahead/behind is each servCode vs its `servCodeRange.max`? |
| `selectProgCodeProjectedCompletionMap` | `Map<progCodeId, ProgCodeProjectedCompletion>` | When does each program finish? |
| `selectSeasonOptimizerResult` | `SeasonOptimizedRange[]` | What should the date ranges be? (includes both `servCodeRange` and `optimizedMin`/`optimizedMax`) |
| `selectEmployeeTimelineMap` | `Map<employeeId, events[]>` | What is each employee doing on each significant date? |
| `selectServCodeTimelineMap` | `Map<entryLabel, ServCodeTimelineEvent[]>` | Who is working each servCode/group, and when does the crew change? |

---

## Tasks

### A0: Update `PaceCrawlerTypes.ts` — price-only ✅

Simplified all CSP fields to plain `number` (price).

---

### A1: `usePaceCrawlerDeps.ts` + `page.tsx` scaffold ✅

Dev page at `/bizPlan/paceCrawler` with tabs.

---

### A2: `selectNextDateByEmployee` + `NextDateByEmployeePanel` ✅

---

### A3: `selectServCodeOpenDateFloor` + `selectServCodeProgramTypeMap` + `OpenDateFloorPanel` ✅

---

### A4: `selectEmployeeLookbackPriceMap` + `LookbackPricePanel` ✅

Panel shows a "Total $/day" column (cross-programType total used as group drain rate). Also shows
a "No-history employees" section for new hires using the team avg fallback.

---

### A5: `selectDailyRateByEmployeeByServCode` + `DailyRatePanel` ✅

Selector has a 4-step fallback chain:
1. Own lookback rate for the servCode's programType
2. Team avg from servCode's `assignedTo` list
3. Team avg across ALL employees for this programType (fixes new servCodes / new hires)
4. Cross-programType team avg (last resort)

---

### A6: `selectActivePoolPriceByServCode` + `ActivePoolPanel` ✅

Panel shows expandable group rows with combined pool.

---

### A7: `dayCrawlSimulation.ts` + `selectCrawlerResult` + `CrawlerResultPanel` ✅

Key behaviors:
- Simulation handles `DayCrawlGroupEntry` — drains all member pools simultaneously at
  `employee.totalAvgDailyPrice`, proportionally distributed across members.
- Sequential N+1 floor is set to `day` (the drain day itself) — not `nextWeekdayAfter(day)`.
  This means the successor opens on the drain day and the employee picks it up the very next
  day with no gap. (Setting it to `nextWeekdayAfter` caused a 1-day downtime gap.)
- `selectCrawlerResult` reads `assignmentPlan.entries` directly (preserving group structure).
- `selectCrawlerResult` uses `teamAvgTotalDailyPrice` as fallback for employees with no lookback.
- Simulation records `servCodeTimeline` (per-entry crew transition events with pool snapshots).

**CrawlerResultPanel columns**: SC Min | Proj End | Opt Min | Opt Max | SC Max

---

### A8: Layer 6 selectors + `DeltaMapPanel` ✅

`DeltaMapPanel` shows expandable group rows and hides null-delta rows.
Delta is computed as `weekdaysBetween(servCodeRange.max, projectedEndDate)`.

---

### A8.5: `AssignmentEditorPanel` — assignment priority editor ✅

- Date ranges shown in parens after each entry label: `RC1 (05/15–07/30)`
- Group badge is a clickable button that opens a popover showing per-member date ranges
- Popover has X button per member to remove from group (ejected as standalone single entry)

---

### A8.6: `selectEmployeeTimelineMap` + `EmployeeTimelinePanel` ✅

Timeline events use `entryLabel`/`fromEntryLabel`. Group events highlighted with a "group" badge.

---

### A8.7: ServCode Groups (G1–G9) ✅

Key changes:
- `AssignmentPlanTypes.ts`: `AssignmentEntry` discriminated union (`single` | `group`)
- `PaceCrawlerTypes.ts`: `DayCrawlSingleEntry`, `DayCrawlGroupEntry`, `DayCrawlPriorityEntry`
- `DayCrawlEmployeeEntry`: `priorityEntries` replaces `servCodeIds`; `totalAvgDailyPrice` added
- `selectTotalAvgDailyPriceByEmployee` (Layer 3b): group drain rate per employee
- `selectTeamAvgTotalDailyPrice` (Layer 3b.5): fallback for new hires with no history

---

### A8.8: `ServCodeTimelinePanel` + `selectServCodeTimelineMap` ✅

New "SC Timeline" tab. Pivoted view keyed on servCode/group entry label.

**`ServCodeTimelineEvent`** (in `PaceCrawlerTypes.ts`):
```typescript
type ServCodeTimelineEvent = {
  date: string;
  employeeId: string;
  kind: "starts" | "leaves" | "returns" | "finishes";
  toServCode?: string;    // for "leaves"
  fromServCode?: string;  // for "returns"
  employeeDailyRate: number;
  teamDailyRate: number;  // sum of all active employees' rates at this moment
  poolRemaining: number;  // pool snapshot at this moment
};
```

Built inside the simulation (not post-hoc) so pool snapshots are exact.

---

### A9: Terminology rename ✅ (2026-05-21)

Renamed all date range terms across `PaceCrawlerTypes.ts`, `dayCrawlSimulation.ts`,
`paceCrawlerSelect.ts`, and `GanttChartPanel.tsx`:

| Old | New |
|---|---|
| `openDateFloor` | `servCodeRangeMin` |
| `currentMax` | `servCodeRangeMax` |
| `resolvedOpenDateFloor` (internal Map) | `resolvedServCodeRangeMin` |
| `proposedMin` / `proposedMax` | `optimizedMin` / `optimizedMax` |
| `currentRange` | `servCodeRange` |
| `dateRange` (in `ServCodePaceDelta`) | `servCodeRange` |

---

### A10: `GanttChartPanel` ✅ (2026-05-21)

New "Gantt" tab. One row per progCode, all servCodes for that progCode rendered as horizontal
bars on the same row.

**Two bars per servCode** (stacked vertically within the row):
- **Top bar** (thin, muted): `servCodeRange.min` → `servCodeRange.max` — the RealGreen-assigned window
- **Bottom bar** (primary/30): `optimizedMin` → `optimizedMax` — the crawler's recommendation

**Layout**: percentage-based positioning (fills full available width). Week header shows
`W##` / `M/DD` stacked. Today line in destructive color. Filters to assigned servCodes only.

---

### A11: `paceCrawlerSlice.ts` + store registration ✅ (2026-05-21)

New slice with `mainDate` field. Registered as `state.paceCrawler` in root reducer.
`paceCrawlerSelect.mainDate` reads from this slice.

---

### A12: `paceCrawlerLookbackSelect.ts` + `paceCrawlerRawSelect.ts` ✅ (2026-05-21)

Extracted `selectEmployeeLookbackMap` and `rawServCodePacesPerDayMap` out of the `pace/` folder
into standalone paceCrawler-owned selectors. `paceCrawlerSelect` no longer imports from
`cascadeSelect` or `rawPaceSelect`.

---

## Status Table

| Task | Status |
|---|---|
| A0: Update `PaceCrawlerTypes.ts` — price-only | ✅ |
| A1: `usePaceCrawlerDeps.ts` + `page.tsx` scaffold | ✅ |
| A2: `selectNextDateByEmployee` + `NextDateByEmployeePanel` | ✅ |
| A3: `selectServCodeOpenDateFloor` + `selectServCodeProgramTypeMap` + `OpenDateFloorPanel` | ✅ |
| A4: `selectEmployeeLookbackPriceMap` + `LookbackPricePanel` | ✅ |
| A5: `selectDailyRateByEmployeeByServCode` + `DailyRatePanel` | ✅ |
| A6: `selectActivePoolPriceByServCode` + `ActivePoolPanel` | ✅ |
| A7: `dayCrawlSimulation.ts` + `selectCrawlerResult` + `CrawlerResultPanel` | ✅ |
| A8: Layer 6 selectors + `DeltaMapPanel` | ✅ |
| A8.5: `AssignmentEditorPanel` — assignment priority editor | ✅ |
| A8.6: `selectEmployeeTimelineMap` + `EmployeeTimelinePanel` | ✅ |
| A8.7: ServCode Groups (G1–G9) | ✅ |
| A8.8: `ServCodeTimelinePanel` + `selectServCodeTimelineMap` | ✅ |
| A9: Terminology rename (servCodeRange / optimizedRange) | ✅ |
| A10: `GanttChartPanel` (dual-bar: servCodeRange + optimizedRange) | ✅ |
| A11: `paceCrawlerSlice.ts` + store registration | ✅ |
| A12: `paceCrawlerLookbackSelect.ts` + `paceCrawlerRawSelect.ts` (pace/ independence) | ✅ |

---

### A13: "Apply Optimized Ranges" button in `GanttChartPanel` ✅ (2026-05-21)

Added a toolbar div above the Gantt chart with a primary "Apply Optimized Ranges" button.

**Filter logic**: Only servCodes where `hasWork === true` AND `optimizedMin !== servCodeRange.min` OR `optimizedMax !== servCodeRange.max` are included. ServCodes with no remaining work are never touched. Button is disabled when the filtered list is empty.

**Save flow**: Calls `updateServCode` for each changed servCode (staging changes in Redux), then calls `saveServCodeChanges()` which reads from `progServ.unsavedServCodeChanges`. Follows the same pattern as `EmployeePace.tsx`.

**Toolbar**: `flex` div with `border-b` above the scrollable chart area. Shows a count badge on the button and a helper text line.

---

### A14: `selectEmployeeCardPlanData` + `EmployeeCardPlanPanel` ✅ (2026-05-21)

New Layer 7 selector and "Employee Plan" tab for the production manager's daily deployment view.

**New type**: `EmployeeCardPlanData` (exported from `paceCrawlerSelect.ts`):
```typescript
type EmployeeCardPlanData = {
  employeeId: string;
  employeeName: string;
  entryLabel: string | null;       // what they should work today (null = downtime/not started)
  servCodeIds: string[];
  isGroup: boolean;
  employeeDailyRate: number;       // this employee's $/day for this entry
  teamDailyRate: number;           // sum of all active employees' rates
  poolRemaining: number;           // pool snapshot at nearest event before mainDate
  nextAvailableDate: string;
  isDowntime: boolean;
  notStartedYet: boolean;
};
```

**`selectEmployeeActiveEntryAtDate`** (internal): Scans each employee's `employeeTimeline` in reverse from `mainDate`. The last `starts` or `switches` event at or before `mainDate` gives the active entry. `finishes` → no active work. `downtime` → isDowntime = true.

**`selectEmployeeCardPlanData`**: Combines `activeEntryAtDate` + `servCodeTimeline` (for pool/rate snapshots) + `nextDateByEmployee`. One `EmployeeCardPlanData` per assigned employee. Sorted: active workers first (by entryLabel), then downtime/no-work, then not-started.

**`EmployeeCardPlanPanel`**: Card grid (flex-wrap) with a `DatePicker` toolbar dispatching `paceCrawlerActions.setMainDate`. Each card shows: employee name, entry label (with "group" badge), member servCode IDs for groups, my rate / team rate / pool remaining. Inactive cards (downtime, not started) are dimmed with a status label.

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

---

### TODO: Wire `matrixSelect.ts` to delegate to `paceCrawlerSelect`

`matrixSelect.ts` should delegate `servCodePaceDeltaMap`, `progCodeProjectedCompletionMap`,
and `seasonOptimizerResult` to `paceCrawlerSelect` rather than computing them independently.
