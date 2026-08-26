# Pace Crawler — Module Reference

**Canonical documentation for `src/app/bizPlan/paceCrawler/`**
**Supersedes**: `schedulingModePlan.md`, `assignmentGroupPlan.md`, `prioritySchedulingPlan.md`, `prioritySchedulingImplementation.md`, and all files in `docs/`

---

## §1 — What This Module Does

The Pace Crawler is the production manager's season planning and daily deployment tool. It answers three questions simultaneously:

1. **What should I route today?** — Employee cards show each employee's daily revenue goal, actual lookback average, and what's required to finish on time.
2. **When will we finish?** — The Gantt shows projected end dates per servCode, color-coded against the committed season plan.
3. **Are we on track?** — The gap between goal and actual is the primary management signal.

### The Core Problem It Solves

RealGreen's `servCode.dateRange` was doing three jobs at once:
- The original season plan (when we committed to start/finish)
- The operational constraint (what RealGreen uses to determine which services are "in season")
- The crawler's projected output (the old "Apply Optimized Ranges" button wrote back here)

This caused circular reasoning and confusing Gantt visualization. The Pace Crawler separates these concerns:

| Concept | Where it lives | Who sets it |
|---|---|---|
| Operational window | `servCode.dateRange` (RealGreen) | Management, in RealGreen directly |
| Committed plan | `SeasonPlan.servCodeSchedules[].plannedEnd` | Management, via Season Plans UI |
| Live projection | `CrawlerResult.byServCode[].projectedEndDate` | Computed automatically |

The crawler **never writes back to `servCode.dateRange`**.

---

## §2 — Architecture Overview

```
RealGreen Data (servCodes, services, employees)
  ↓
paceCrawlerLookbackSelect     — historical production rates per employee × programType
  ↓
paceCrawlerSelect (Layers 0–6)
  ├── Layer 0: crawlStart date
  ├── Layer 1: employee availability (next available date)
  ├── Layer 2: servCode open date floors + programType map
  ├── Layer 3: daily rates per employee per servCode (lookback + fallback chain)
  ├── Layer 4: active pool prices + total pool prices per servCode
  ├── Layer 5: runDayCrawlSimulation() → CrawlerResult
  └── Layer 6: derived outputs (delta map, Gantt data, season optimizer result)
  ↓
employeeCardSelect (DiffChecker D0–D5)
  ├── D0: open servCodes per employee on mainDate
  ├── D1: remaining weekdays per servCode
  ├── D2: team daily rate per servCode
  ├── D3: required daily price per employee per servCode
  ├── D4: diff result (required vs historical)
  └── D5: employee card data (Goal / Actual / Required per group)
  ↓
UI Components
  ├── GanttChartPanel      — season timeline with plan band + projected bar
  ├── DiffD5EmployeeCardPanel — daily deployment cards
  ├── AssignmentEditorPanel   — configure employee assignments + goals
  └── dev panels (all tabs in PaceCrawlerDev)
```

### Supporting Modules

| Module | Location | Purpose |
|---|---|---|
| `AssignmentPlan` | `src/app/bizPlan/assignmentPlan/` | Scenarios + per-employee group assignments with daily revenue goals |
| `AssignmentGroup` | `src/app/assignmentGroup/` | Shared group definitions (servCodes worked together) |
| `SeasonPlan` | `src/app/bizPlan/seasonPlan/` | Committed plan dates per servCode + cascade threshold + snow deadline |

---

## §3 — Key Concepts

### 3.1 — Groups and GroupAssignments

Every employee has a priority-ordered list of **GroupAssignments**. Each assignment references an `AssignmentGroup` (a named set of servCodes worked together) and optionally a `dailyRevenueGoal`.

```typescript
type GroupAssignment = {
  groupId: string;           // references AssignmentGroup.groupId
  dailyRevenueGoal: number | null;  // null = fall back to lookback avg
};
```

The crawler treats every assignment as a group — single servCodes are wrapped as single-member groups. This eliminates the single/group code split.

**Priority semantics**: The employee works their highest-priority group that has eligible work. A group is eligible if any member has actionable pool AND the day ≥ the group's effective open date.

### 3.2 — The Three Numbers on Every Employee Card

Each group row on an employee card shows:

| Label | Source | Meaning |
|---|---|---|
| **Goal** | `GroupAssignment.dailyRevenueGoal` | The plan — what we committed to route per day |
| **Actual** | `totalAvgDailyCSP.price` (lookback avg) | Reality — what this employee actually produces |
| **Required** | `remainingPool / remainingWeekdays` | What's needed to finish by the season plan end date |

- **Goal vs Actual gap** = the feedback signal. If Actual < Goal, the employee is underperforming against the plan.
- **Required vs Goal gap** = whether the goal is sufficient. If Required > Goal, the plan won't finish on time even if the goal is hit.

### 3.3 — Cascade Unlock

Sequential progCodes (e.g., MLC1 → MLC2 → MLC3 → ...) lock each successor until the predecessor is "done enough." The unlock condition is an OR:

```
unlock MLC4 when:
  completionPct >= cascadeThreshold   (e.g. 95% of total pool completed)
  OR today > plannedEnd               (from the active SeasonPlan)
```

Where `completionPct = 1 - (remainingPool / totalPool)`. This prevents a handful of stragglers from blocking the entire season projection. The straggler pool is carried forward into the successor.

`cascadeThreshold` is stored on the `SeasonPlan` document (default 0.95).

### 3.4 — Urgency-Weighted Drain

Within a group, drain is distributed by urgency weight, not pool size:

```
weight(member) = memberPool / remainingWeekdays
```

Members with tighter deadlines get a larger share of the employee's daily capacity. This ensures front-loaded members (e.g., SE3 ending 9/1) drain faster than members with distant deadlines (e.g., CC3 ending 9/30) within the same group.

### 3.5 — Lookback Window

Historical production rates are computed from services completed or printed since `yearStart()`. The lookback uses `totalAvgDailyCSP.price` — the employee's total daily output across all program types — as the drain rate for group entries. Per-programType rates are used only for urgency-weight computation within groups.

### 3.6 — Drain Rate Fallback Chain

For each employee × servCode pair, the daily rate is resolved via a 4-step fallback:
1. Employee's own lookback rate for the servCode's programType
2. Team average from the servCode's `assignedTo` list (RealGreen-assigned employees)
3. Team average across ALL employees with lookback data for this programType
4. Cross-programType team average (last resort)

When a `dailyRevenueGoal` is set on the employee's first group assignment, it overrides the lookback avg as the total drain rate for the crawler.

---

## §4 — Data Flow: The Selector Pipeline

### Layer 0 — Crawl Start Date

`selectCrawlStart` → `string`

The first day the simulation runs. If `mainDate` is in the future, the crawl starts on `mainDate`. Otherwise it starts on the next weekday after today (routes are never created for today itself).

### Layer 1 — Employee Availability

`selectNextDateByEmployee` → `Map<employeeId, string>`

The next weekday after each employee's latest printed `schedDate` across all servCodes. Employees with no printed services get `crawlStart`.

### Layer 2 — ServCode Open Date Floors

`selectServCodeOpenDateFloor` → `Map<servCodeId, string>`

The earliest calendar date each servCode is eligible to be worked. `alwaysAsap` servCodes use `today`; others use `servCode.dateRange.min`. Sequential N+1 floors are resolved dynamically during the crawl.

### Layer 3 — Daily Rates

`selectDailyRateByEmployeeByServCode` → `Map<employeeId, Map<servCodeId, number>>`

Each employee's $/day rate per servCode, using the 4-step fallback chain described above.

`selectTotalAvgDailyPriceByEmployee` → `Map<employeeId, number>`

Each employee's total $/day across all program types. Used as the group drain rate.

### Layer 4 — Work Pools

`selectActivePoolPriceByServCode` → `Map<servCodeId, number>`

Remaining unscheduled price (active + asap services, excludes printed).

`selectTotalPoolPriceByServCode` → `Map<servCodeId, number>`

Total pool (completed + remaining). Used to compute `completionPct` for cascade unlock.

### Layer 5 — Crawler Result

`selectCrawlerResult` → `CrawlerResult`

Calls `runDayCrawlSimulation()` with all inputs assembled. Returns:
- `byServCode`: projected end date + optimized date range per servCode
- `employeeTimeline`: per-employee ordered list of work transitions
- `servCodeTimeline`: per-group crew transition events with pool snapshots

The simulation also reads `servCodeScheduleMap` (from `seasonPlanSelect`) and `cascadeThreshold` to implement the new cascade unlock logic.

### Layer 6 — Derived Outputs

`selectSeasonOptimizerResult` → `SeasonOptimizedRange[]`

One row per servCode with `optimizedMin`, `optimizedMax`, `projectedEndDate`, and `plannedEnd` (from the active SeasonPlan). Used by the Gantt.

`selectServCodeDeltaMap` → `Map<servCodeId, ServCodePaceDelta>`

Days ahead/behind vs `servCode.dateRange.max`.

`selectProgCodeProjectedCompletionMap` → `Map<progCodeId, ProgCodeProjectedCompletion>`

Latest projected end date across all servCodes in each progCode.

### DiffChecker Pipeline (D0–D5)

Lives in `employeeCardSelect.ts`. Computes the three-value display for each employee card:

- **D0**: Which servCodes are open for each employee on `mainDate`?
- **D1**: How many weekdays remain in each servCode's committed window?
- **D2**: What is the combined daily rate of all assigned employees per servCode?
- **D3**: How much $/day does each employee need to produce per servCode to finish on time?
- **D4**: Is the employee ahead or behind their historical average?
- **D5**: Assemble the final card data with Goal / Actual / Required per group.

---

## §5 — File Inventory

### Core Module (`src/app/bizPlan/paceCrawler/`)

| File | Purpose |
|---|---|
| `paceCrawlerSlice.ts` | Redux slice — `mainDate`, `assignmentEditorSelectedEmployeeIds` |
| `paceCrawlerSelect.ts` | All selectors (Layers 0–6) |
| `paceCrawlerLookbackSelect.ts` | `employeeLookbackMap` — historical rates per employee × programType |
| `employeeCardSelect.ts` | DiffChecker pipeline (D0–D5) — employee card data |
| `PaceCrawlerTypes.ts` | All types for the crawler and its outputs |
| `usePaceCrawlerDeps.ts` | Hook that loads all required data for the paceCrawler context |
| `layout.tsx` | Page layout — date picker, scenario selector, nav |
| `PaceCrawlerNav.tsx` | Navigation links (Employee Plan, Priorities, Assignments, Gantt, etc.) |
| `AssignmentScenarioSelector.tsx` | Scenario dropdown + Save / Save As controls |
| `page.tsx` | Root page — renders `EmployeeCardPanel` |
| `PaceCrawler.tsx` | Production component wrapper |
| `PaceCrawlerDev.tsx` | Dev component — all debug tabs |

### Simulation Library (`_lib/`)

| File | Purpose |
|---|---|
| `_lib/dayCrawlSimulation.ts` | Pure simulation function — no Redux dependencies |
| `_lib/employeeLookbackUtils.ts` | Lookback stat helpers (accumulate, compute, validate) |
| `_lib/lookbackConfig.ts` | Lookback window config (start date, completion threshold) |
| `_lib/diffChecker/DiffCheckerTypes.ts` | Types for the D0–D5 pipeline |

### Dev Components (`devComponents/`)

| File | Purpose |
|---|---|
| `AssignmentEditorPanel.tsx` | Two-panel editor: Group Manager + Employee Assignment with goal inputs |
| `GanttChartPanel.tsx` | Season Gantt — plan band + projected bar + snow deadline |
| `EmployeeCardPanel.tsx` | Production employee cards (legacy, uses old single-metric display) |
| `DiffD5EmployeeCardPanel.tsx` | New employee cards with Goal / Actual / Required |
| `DailyRatePanel.tsx` | Debug: daily rates per employee per group |
| `LookbackPricePanel.tsx` | Debug: lookback rates per employee per programType |
| `ActivePoolPanel.tsx` | Debug: remaining pool per servCode/group |
| `CrawlerResultPanel.tsx` | Debug: raw crawler output |
| `DeltaMapPanel.tsx` | Debug: days ahead/behind per servCode |
| `NextDateByEmployeePanel.tsx` | Debug: next available date per employee |
| `OpenDateFloorPanel.tsx` | Debug: open date floor per servCode |
| `EmployeeTimelinePanel.tsx` | Debug: per-employee work schedule timeline |
| `ServCodeTimelinePanel.tsx` | Debug: per-group crew transition timeline |
| `diffChecker/` | Debug panels for each DiffChecker step (D0–D5) |
| `urgentServCodes/` | Urgent servCode checklist (asap + overdue) |

### Supporting Modules

| Module | Location | Purpose |
|---|---|---|
| `AssignmentPlan` | `src/app/bizPlan/assignmentPlan/` | Scenarios, plans, `GroupAssignment` with `dailyRevenueGoal` |
| `AssignmentGroup` | `src/app/assignmentGroup/` | Shared group definitions (servCodes worked together) |
| `SeasonPlan` | `src/app/bizPlan/seasonPlan/` | Committed plan dates, cascade threshold, snow deadline |

### Sub-Routes

| Route | File | Purpose |
|---|---|---|
| `/bizPlan/paceCrawler` | `page.tsx` | Employee Plan (daily deployment cards) |
| `/bizPlan/paceCrawler/priorities` | `priorities/page.tsx` | Urgent + Priority scheduling checklists |
| `/bizPlan/paceCrawler/assignments` | `assignments/page.tsx` | Assignment editor |
| `/bizPlan/paceCrawler/gantt` | `gantt/page.tsx` | Season Gantt chart |
| `/bizPlan/paceCrawler/empTimeline` | `empTimeline/page.tsx` | Employee timeline debug |
| `/bizPlan/paceCrawler/scTimeline` | `scTimeline/page.tsx` | ServCode timeline debug |

---

## §6 — Outstanding Work

The following items are designed but not yet fully implemented:

### Dual-Mode Crawler (Goal vs Reality)

The plan calls for running the crawler twice — once with `dailyRevenueGoal` as the drain rate (goal projection) and once with the lookback average (reality projection) — and showing both on the Gantt. Currently only the goal-based projection is computed. The Gantt shows one bar (goal-based), color-coded against `plannedEnd`.

**What's needed**: A second `selectRealityCrawlerResult` selector that always uses lookback avg regardless of goals, and a second bar on the Gantt.

### "Lock as Season Plan" Action

The plan describes a "Lock as Season Plan" button that runs the goal crawl and stores the projected dates as a new `SeasonPlan`. This would let the manager freeze the pre-season plan with one click.

**What's needed**: A UI action in the Gantt toolbar that reads `seasonOptimizerResult` and dispatches `seasonPlanActions.upsertSeasonPlan` with the projected dates as `servCodeSchedules`.

### "Revise Goals from Reality" Action

The plan describes an action that, for each employee × group where actual < goal, offers to update `dailyRevenueGoal` to the actual lookback rate.

**What's needed**: A UI action (probably in the Assignments tab or Employee Plan) that compares `totalAvgDailyCSP.price` against `dailyRevenueGoal` and dispatches `assignmentPlanActions.setGoal` for each gap.

### Season Plan Management UI

The `SeasonPlan` data module is fully built (types, model, API, slice, selectors, hook), but there is no dedicated UI page for creating, editing, and activating season plans. Currently plans must be created programmatically or via the "Lock as Season Plan" action (not yet built).

**What's needed**: A `/bizPlan/seasonPlan` page with CRUD for season plans — name, year, cascade threshold, snow deadline, and per-servCode planned dates.

### Migration Cleanup

The `migratePlan()` function in `src/app/bizPlan/assignmentPlan/api/route.ts` handles old-format documents (`groupIds[]` → `groupAssignments[]`). Once all MongoDB documents have been updated, this migration code should be removed.

**Verify with**:
```
db.assignmentscenarios.find({ "plans.groupIds": { $exists: true } })
```

---

## §7 — User Guide

### Pre-Season Setup

**Step 1: Create Groups** (Assignments tab → Group Manager panel)

Groups define which servCodes are always worked together on the same day. The group ID is auto-generated as sorted servCodeIds joined with "+". You can give each group a friendly label (e.g., "Lawn Care Bundle").

- Click "New Group"
- Select the servCodes that route together (grouped by progCode)
- Optionally set a label
- Click "Create Group"

**Step 2: Assign Employees** (Assignments tab → Employee Assignment panel)

For each employee, build their priority-ordered list of groups:
- Select employees from the left panel
- Add groups to each employee's list
- Reorder with the up/down arrows (index 0 = highest priority)
- The employee works their highest-priority group that has eligible work each day

**Step 3: Set Daily Revenue Goals** (Assignments tab → Employee Assignment panel)

For each group assignment, enter the employee's daily revenue goal in the `$____/day` field. This is the planning target — how much revenue this employee should produce per day on this group.

- Leave blank to fall back to the employee's lookback average
- Goals are per-employee, per-group — different employees can have different goals for the same group
- Goals travel with the scenario — different scenarios can have different goals

**Step 4: Save the Scenario** (Scenario dropdown → Save / Save As)

Scenarios are named snapshots of all employee assignments and goals. Save your work before navigating away.

**Step 5: Create a Season Plan** (currently requires manual API call — UI coming)

A Season Plan stores the committed planned end dates for each servCode. It also sets:
- `cascadeThreshold`: fraction of pool that must be completed before unlocking the next sequential servCode (default 95%)
- `snowDeadline`: the hard end-of-season date shown as a red line on the Gantt

Once a Season Plan is active, the Gantt will show the plan band and color-code projections against it.

---

### In-Season Use

**Reading the Gantt** (`/bizPlan/paceCrawler/gantt`)

Each row represents one progCode. Each bar represents one servCode:

| Visual element | Meaning |
|---|---|
| Muted background band | The committed plan window (`plannedStart` → `plannedEnd`) |
| Green bar | Projected to finish before the plan end — on track |
| Red bar | Projected to finish after the plan end — behind |
| Gray bar | No data (no assigned employees with lookback history) |
| Blue vertical line | Today |
| Red vertical line | Snow deadline |

Click any segment of a bar to see crew detail: who is working it, their daily rate, and the pool remaining.

**Reading Employee Cards** (`/bizPlan/paceCrawler` — Employee Plan tab)

Each card shows one employee. Each group row shows three numbers:

- **Goal** (green): the daily revenue target you set in the Assignments tab
- **Actual** (gray): the employee's lookback average — what they actually produce
- **Required** (blue/red): what they need to produce per day to finish by the plan end date

Status badges:
- **ahead** (green): producing more than required — will finish early
- **behind** (orange): needs to produce more than their historical average
- **overdue** (red): the plan end date has passed

Click the ▶ arrow on a group row to expand and see per-member required rates and individual deadlines.

**Adjusting Goals**

If an employee's Actual is consistently below their Goal, you have two options:
1. **Push harder**: keep the goal and coach the employee
2. **Revise the goal**: update `dailyRevenueGoal` in the Assignments tab to match the actual rate, then re-save the scenario

The Gantt will automatically update to reflect the revised projection.

**Adjusting the Cascade Threshold**

If sequential servCodes are unlocking too early (stragglers are being ignored) or too late (blocking the next round), adjust `cascadeThreshold` on the active SeasonPlan. A lower threshold (e.g., 0.90) unlocks sooner; a higher threshold (e.g., 0.98) waits longer.

---

### What the Numbers Mean — Quick Reference

| Term | Definition |
|---|---|
| **Active pool** | Sum of price for all actionable services (status Y or *) — excludes printed |
| **Total pool** | Sum of price for all services (completed + active + printed) — used for completion % |
| **Completion %** | `1 - (activePool / totalPool)` — how much of the total sold work is done |
| **Cascade threshold** | Minimum completion % before unlocking the next sequential servCode |
| **Daily revenue goal** | The planned $/day target for an employee on a specific group |
| **Lookback average** | The employee's actual average $/day from completed/printed services this year |
| **Required rate** | `remainingPool / remainingWeekdays` — what's needed to finish by the plan end |
| **Urgency weight** | `memberPool / remainingWeekdays` — used to distribute drain within a group |

---

## §8 — Superseded Documents

The following files are superseded by this document and kept only for historical reference:

| File | Status |
|---|---|
| `schedulingModePlan.md` | Superseded — architecture decisions captured in §2–§4 above |
| `assignmentGroupPlan.md` | Superseded — group model is fully implemented |
| `prioritySchedulingPlan.md` | Superseded — priority scheduling is fully implemented |
| `prioritySchedulingImplementation.md` | Superseded — implementation is complete |
| `docs/paceCrawlerPlan.md` | Superseded — original crawler design, now implemented |
| `docs/paceCrawlerImplementation.md` | Superseded — implementation log, all tasks complete |
| `docs/employeeCardPlan.md` | Superseded — employee card is implemented (with Goal/Actual/Required) |
| `docs/productionRollout.md` | Superseded — production rollout is complete |
| `docs/paceCrawler_01_servCodeGroupsPlan.md` | Superseded — group model is fully implemented |
