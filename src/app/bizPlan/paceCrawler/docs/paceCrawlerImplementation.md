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
│   ├── DeltaMapPanel.tsx
│   ├── AssignmentEditorPanel.tsx
│   ├── EmployeeTimelinePanel.tsx
│   └── ServCodeTimelinePanel.tsx
├── page.tsx                            ← dev page, tabbed (10 tabs)
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
| `selectTotalAvgDailyPriceByEmployee` | `Map<employeeId, number>` | What is each employee's total avg daily price (for group drain)? |
| `selectTeamAvgTotalDailyPrice` | `number` | What is the team's average total daily price (fallback for new hires)? |
| `selectDailyRateByEmployeeByServCode` | `Map<employeeId, Map<servCodeId, number>>` | What is each employee's daily price rate per servCode? |
| `selectActivePoolPriceByServCode` | `Map<servCodeId, number>` | How much unscheduled price remains per servCode? |
| `selectCrawlerResult` | `CrawlerResult` | Run the crawl — when does each servCode drain? |
| `selectServCodeDeltaMap` | `Map<servCodeId, ServCodePaceDelta>` | How many days ahead/behind is each servCode? |
| `selectProgCodeProjectedCompletionMap` | `Map<progCodeId, ProgCodeProjectedCompletion>` | When does each program finish? |
| `selectSeasonOptimizerResult` | `SeasonOptimizedRange[]` | What should the date ranges be? |
| `selectEmployeeTimelineMap` | `Map<employeeId, events[]>` | What is each employee doing on each significant date? |
| `selectServCodeTimelineMap` | `Map<entryLabel, ServCodeTimelineEvent[]>` | Who is working each servCode/group, and when does the crew change? |

---

## Tasks

### A0: Update `PaceCrawlerTypes.ts` — price-only ✅

Simplified all CSP fields to plain `number` (price).

---

### A1: `usePaceCrawlerDeps.ts` + `page.tsx` scaffold ✅

Dev page at `/bizPlan/paceCrawler` with 10 tabs.

---

### A2: `selectNextDateByEmployee` + `NextDateByEmployeePanel` ✅

---

### A3: `selectServCodeOpenDateFloor` + `selectServCodeProgramTypeMap` + `OpenDateFloorPanel` ✅

---

### A4: `selectEmployeeLookbackPriceMap` + `LookbackPricePanel` ✅

**Updated (2026-05-20)**: Panel now shows a "Total $/day" column (cross-programType total used
as group drain rate). Also shows a "No-history employees" section for new hires using the team
avg fallback, with the team avg value and employee count displayed.

---

### A5: `selectDailyRateByEmployeeByServCode` + `DailyRatePanel` ✅

**Updated (2026-05-20)**: Panel now shows group entries with "total (group)" source label.
Selector now has a 4-step fallback chain:
1. Own lookback rate for the servCode's programType
2. Team avg from servCode's `assignedTo` list
3. Team avg across ALL employees for this programType (fixes new servCodes / new hires)
4. Cross-programType team avg (last resort)

---

### A6: `selectActivePoolPriceByServCode` + `ActivePoolPanel` ✅

**Updated (2026-05-20)**: Panel now shows expandable group rows with combined pool.

---

### A7: `dayCrawlSimulation.ts` + `selectCrawlerResult` + `CrawlerResultPanel` ✅

**Updated (2026-05-20)**:
- Simulation now handles `DayCrawlGroupEntry` — drains all member pools simultaneously at
  `employee.totalAvgDailyPrice`, proportionally distributed across members.
- Sequential N+1 floor is now `nextWeekday(drainDate)` directly — no longer
  `max(dateRange.min, nextWeekday)`. Sequential servCodes are proposed back-to-back.
- `selectCrawlerResult` now reads `assignmentPlan.entries` directly (preserving group structure)
  instead of flattened `servCodeIds`.
- `selectCrawlerResult` uses `teamAvgTotalDailyPrice` as fallback for employees with no lookback.
- `CrawlerResultPanel` columns renamed: `SC Min`, `Proj End`, `Opt Min`, `Opt Max`, `SC Max`.
  Group rows now show SC Min (earliest member dateRange.min). Debug `console.log` removed.
- Simulation now records `servCodeTimeline` (per-entry crew transition events with pool snapshots).

---

### A8: Layer 6 selectors + `DeltaMapPanel` ✅

**Updated (2026-05-20)**: `DeltaMapPanel` now shows expandable group rows and hides null-delta rows.

---

### A8.5: `AssignmentEditorPanel` — assignment priority editor ✅

**Updated (2026-05-20)**:
- Date ranges shown in parens after each entry label: `RC1 (05/15–07/30)`
- Group badge is now a clickable button that opens a popover showing per-member date ranges
- Popover has X button per member to remove from group (ejected as standalone single entry)
- `progServSelect.servCodeMap` used for date range lookups

---

### A8.6: `selectEmployeeTimelineMap` + `EmployeeTimelinePanel` ✅

**Updated (2026-05-20)**: Timeline events now use `entryLabel`/`fromEntryLabel` instead of
`servCodeId`/`fromServCodeId`. Group events are highlighted with a "group" badge.

---

### A8.7: ServCode Groups (G1–G9) ✅

All G1–G9 tasks complete. See `paceCrawler_01_servCodeGroupsPlan.md` for details.

Key changes:
- `AssignmentPlanTypes.ts`: `AssignmentEntry` discriminated union (`single` | `group`)
- `AssignmentPlanModel.ts`, `route.ts`: Mongoose schema updated
- `assignmentPlanSlice.ts`: `reorderEntries` action
- `assignmentPlanSelect.ts`, `employeeSelect.ts`: flatten entries for all consumers
- `PaceCrawlerTypes.ts`: `DayCrawlSingleEntry`, `DayCrawlGroupEntry`, `DayCrawlPriorityEntry`
- `DayCrawlEmployeeEntry`: `priorityEntries` replaces `servCodeIds`; `totalAvgDailyPrice` added
- `selectTotalAvgDailyPriceByEmployee` (Layer 3b): group drain rate per employee
- `selectTeamAvgTotalDailyPrice` (Layer 3b.5): fallback for new hires with no history

---

### A8.8: `ServCodeTimelinePanel` + `selectServCodeTimelineMap` ✅ (2026-05-20)

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

Built **inside the simulation** (not post-hoc) so pool snapshots are exact. Tracks
`activeEmployeesByEntry` during the crawl; records events at every crew transition.

**Panel**: left panel = entry selector (sorted by first event date). Right panel = event log
table: Date | Employee | Event | Emp $/day | Team $/day | $ Remaining.

---

### A9: Update `matrixSelect.ts` — delegate to `paceCrawlerSelect` ☐

### A10: Fix `OptimizerInsightsPopover.tsx` closeDate ☐

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
| A9: Update `matrixSelect.ts` — delegate to `paceCrawlerSelect` | ☐ |
| A10: Fix `OptimizerInsightsPopover.tsx` closeDate | ☐ |
| Cleanup: Remove debug console logs | ✅ |

---

## Session Notes (as of 2026-05-20)

### What was built this session

**ServCode Groups (G5–G9)**
- `selectTotalAvgDailyPriceByEmployee` — employee's total avg daily price for group drain rate
- `selectTeamAvgTotalDailyPrice` — team average fallback for new hires with no history
- `PaceCrawlerTypes.ts` — `DayCrawlSingleEntry`, `DayCrawlGroupEntry`, `DayCrawlPriorityEntry`
- `dayCrawlSimulation.ts` — group entries drain all members at `totalAvgDailyPrice`
- `selectCrawlerResult` — reads `assignmentPlan.entries` directly (preserves group structure)

**Rate fallback improvements**
- `selectDailyRateByEmployeeByServCode` now has a 4-step fallback chain. Step 3 (programType-wide
  team avg) fixes new servCodes and new hires whose servCodes have no `assignedTo` history.
- `selectCrawlerResult` uses `teamAvgTotalDailyPrice` as fallback for `totalAvgDailyPrice` when
  an employee has no lookback history at all.

**Sequential back-to-back fix**
- Sequential N+1 servCodes now open on `nextWeekday(N drain date)` directly, not
  `max(dateRange.min, nextWeekday)`. The optimizer proposes back-to-back scheduling.

**Dev panel updates**
- All panels updated for group awareness (expandable rows, group badges, date ranges)
- `CrawlerResultPanel` columns renamed: SC Min, Proj End, Opt Min, Opt Max, SC Max
- `AssignmentEditorPanel`: date ranges in parens, group badge popover with per-member dates and X
  to eject from group (ejected servCode stays assigned as standalone single entry)

**ServCodeTimelinePanel (A8.8)**
- New "SC Timeline" tab — pivoted view keyed on servCode/group
- `ServCodeTimelineEvent` type with pool snapshots and team drain rate
- Built inside the simulation for exact pool values at each transition

### Schema migration required
`AssignmentPlan` schema changed from `servCodeIds: string[]` to `entries: AssignmentEntry[]`.
Existing Mongo data must be dropped before testing.

### Remaining work (next session)
- **A9**: Wire `matrixSelect.ts` to delegate `servCodePaceDeltaMap`, `progCodeProjectedCompletionMap`,
  and `seasonOptimizerResult` to `paceCrawlerSelect`.
- **A10**: Fix `OptimizerInsightsPopover.tsx` — `closeDate` should be capacity-derived, not `proposedMax`.
- **Verify SC Timeline**: check that pool snapshots are accurate and team drain rates make sense.
- **ServCode Groups plan doc**: update G5–G9 status to ✅.

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
