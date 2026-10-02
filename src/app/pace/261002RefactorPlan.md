# 261002 Refactor Plan — PaceCrawler Architecture Rethink

> **IMPORTANT**: This document describes a ground-up rewrite of the pace crawler module.
> Any decisions, patterns, or type structures from the original module at
> `src/app/bizPlan/paceCrawler/` are **not applicable** here unless explicitly re-adopted
> after deliberate review. We are starting fresh.

---

## 1. Context & Motivation

The original `paceCrawler` module has been refactored multiple times and still produces
incorrect projected end dates (see `261002 refactors.md` for the active bug list). The
deeper problem is architectural: the module grew organically, and downstream sub-pages
have had to maintain their own parallel selectors and sources of truth about the same
underlying data. This creates drift, bugs, and confusion about what is authoritative.

The hypothesis driving this rewrite: **the crawler can be redesigned as an "engine"** —
a single function that accepts a well-defined set of inputs and returns a rich, structured
result that satisfies all downstream consumers without any page needing to re-derive
the same facts independently.

---

## 2. Sub-Page Inventory & Data Needs

This section traces every piece of data each sub-page consumes, traces it back to its
source, and describes what question the page is trying to answer with it.

---

### 2.1 Employee Plan Page (`/bizPlan/paceCrawler` → `EmployeeCardPanel`)

**What it answers:** "What should each employee work today, and are they on pace?"

**Data consumed (via `employeeCardSelect.employeeCardData`):**

| Data | Source | Purpose |
|---|---|---|
| `employee` | `employeeMap` | Identity, name, availability window, PTO |
| `isAlreadyRouted` | `deepSelect.servCodes` — services with `status="$"` and `schedDate === mainDate` | Badge: employee already has a route today |
| `isOnLeave` | `employee.plannedTimeOff` | Badge: employee is on PTO today |
| `holidayDescription` / `isWeatherDay` | `holidaySelect.all` | Badge: company holiday today |
| `openEntries: OpenGroupRow[]` | Complex pipeline (D0–D5, see below) | The core card body |

**`OpenGroupRow` fields and their sources:**

| Field | Source | Purpose |
|---|---|---|
| `groupId`, `label`, `servCodeIds` | `assignmentGroupSelect.groupMap` | Which group this row represents |
| `combinedPool` | `paceCrawlerSelect.activePoolPriceByServCode` summed across members | How much $ work remains |
| `requiredDailyPrice` | `combinedPool / planDeadlineWeekdays * employeeShareRatio` | What the employee needs to do per day to finish on time |
| `goalDailyPrice` | `assignmentPlanSelect.goalByEmployeeByGroup` | Employee's manually-set daily revenue target |
| `historicalDailyPrice` | `paceCrawlerSelect.totalAvgDailyPriceByEmployee` (lookback avg) | What the employee actually does per day on average |
| `planDeadline` | `seasonPlanSelect.groupScheduleMap → plannedEnd` | The committed end date from the active SeasonPlan |
| `planDeadlineWeekdays` | `dateRanges.weekdaysBetween(mainDate, plannedEnd)` | Days remaining to deadline |
| `sumGoals` / `sumAvgs` | Aggregated across all employees assigned to this group | Team-level rates for days-late computation |
| `isOverdue` / `isAhead` / `isBehind` | Derived from `requiredDailyPrice` vs `historicalDailyPrice` | Status badge |
| `members: OpenGroupMemberRow[]` | Per-servCode breakdown | Expandable detail |

**`OpenGroupMemberRow` fields:**

| Field | Source | Purpose |
|---|---|---|
| `servCodeId` | Group membership | Identity |
| `poolRemaining` | `activePoolPriceByServCode` | $ remaining for this specific servCode |
| `requiredDailyPrice` | `poolRemaining / remainingWeekdays` | Per-member urgency rate |
| `scMax` | `seasonPlanSelect.groupScheduleMap → plannedEnd` (NOT `servCode.dateRange.max`) | Member deadline |
| `remainingWeekdays` | `weekdaysBetween(mainDate, scMax)` | Days to member deadline |
| `isOverdue` | `remainingWeekdays <= 0` | Overdue flag |

**Key observation:** The Employee Plan page does NOT use the crawler's `projectedEndDate`
at all. It computes its own "days late" estimate from `combinedPool / teamRate` vs
`planDeadlineWeekdays`. This is a **parallel source of truth** that diverges from the
Gantt's `projectedEndDate`.

---

### 2.2 Gantt Chart Page (`/bizPlan/paceCrawler/gantt` → `GanttChartPanel`)

**What it answers:** "When will each group start and finish, relative to the plan?"

**Data consumed:**

| Data | Source | Purpose |
|---|---|---|
| `seasonResult: SeasonOptimizedRange[]` | `paceCrawlerSelect.seasonOptimizerResult` | One row per group — the core Gantt data |
| `mainDate` | `paceCrawlerSelect.mainDate` | "Today" line position |
| `groupMap` | `assignmentGroupSelect.groupMap` | Resolve groupId → servCodeIds for filtering |
| `assignmentsByEmployeeId` | `assignmentPlanSelect.assignmentsByEmployeeId` | Filter to only groups with assigned employees |
| `snowDeadline` | `seasonPlanSelect.snowDeadline` | Hard deadline line |
| `activeSeasonPlan` | `seasonPlanSelect.activeSeasonPlan` | Toolbar display |

**`SeasonOptimizedRange` fields used by the Gantt:**

| Field | Purpose |
|---|---|
| `groupLabel` | Row label and key |
| `memberServCodeIds` | Filter (assigned employees check) |
| `plannedStart` / `plannedEnd` | The "plan band" — the committed window |
| `optimizedMin` / `optimizedMax` | The crawler's projected bar position |
| `projectedEndDate` | Used to color the bar (green if ≤ plannedEnd, red if >) |
| `hasWork` | Muted styling when no work remains |

**`GanttBarDetail` (popover) additionally uses:**

| Data | Source | Purpose |
|---|---|---|
| `servCodeMap` | `deepSelect.servCodeMap` | Per-service price and status |
| `employeeMap` | `employeeSelect.employeeMap` | Crew member names |
| `totalAvgDailyPriceByEmployee` | `paceCrawlerSelect.totalAvgDailyPriceByEmployee` | Crew $/day rates |
| `assignmentsByEmployeeId` | `assignmentPlanSelect.assignmentsByEmployeeId` | Future crew (from assignment plan) |
| `row.projectedEndDate` | From `SeasonOptimizedRange` | "Projected finish" display |
| `row.plannedStart` / `row.plannedEnd` | From `SeasonOptimizedRange` | "Planned window" display |

**Key observation:** The Gantt bar detail computes `priceRemaining` independently from
raw service data (using `doneDate` for past dates). It does NOT use the crawler's pool
values. Another **parallel source of truth**.

---

### 2.3 Priorities Page (`/bizPlan/paceCrawler/priorities` → `PrioritiesPanel`)

**What it answers:** "What needs immediate attention today?"

**Data consumed:**

| Data | Source | Purpose |
|---|---|---|
| `urgentServCodes` | `urgentServCodesSelect.urgentServCodes` | ServCodes that are alwaysAsap, overdue, or unplanned |
| `priorityServices` | `priorityServiceSelect.priorityServices` | Manually flagged priority services |

**`urgentServCodesSelect` internals:**

| Data | Source | Purpose |
|---|---|---|
| `servCodes` | `deepSelect.servCodes` | All servCodes with their services |
| `mainDate` | `state.paceCrawler.mainDate` | "Today" for overdue check |
| `groupScheduleMap` | `seasonPlanSelect.groupScheduleMap` | `plannedEnd` per group (authoritative deadline) |
| `groupMap` | `assignmentGroupSelect.groupMap` | Resolve groupId → servCodeIds |

**Urgent reasons:**
- `alwaysAsap`: servCode.alwaysAsap === true AND has actionable services
- `overdue`: plannedEnd < mainDate AND has actionable services
- `unplanned`: no plannedEnd in active SeasonPlan AND has actionable services

**Key observation:** The Priorities page uses `plannedEnd` from the SeasonPlan as the
sole deadline — it does NOT use `projectedEndDate` from the crawler at all. It is
entirely independent of the simulation.

---

### 2.4 Assignments Page (`/bizPlan/paceCrawler/assignments` → `AssignmentEditorPanel`)

**What it answers:** "How do I configure which employees work which groups, in what order?"

**Data consumed:**

| Data | Source | Purpose |
|---|---|---|
| `assignmentPlans` | `assignmentPlanSelect.assignmentPlans` | All employee plans |
| `assignmentsByEmployeeId` | `assignmentPlanSelect.assignmentsByEmployeeId` | Per-employee plan lookup |
| `employeeMap` | `employeeSelect.employeeMap` | Employee names and availability |
| `groupMap` | `assignmentGroupSelect.groupMap` | Group labels and member servCodeIds |
| `servCodeMap` | `progServSelect.servCodeMap` | ServCode dateRange for display (uses deprecated `dateRange`) |
| `selectedEmployeeIds` | `state.paceCrawler.assignmentEditorSelectedEmployeeIds` | UI state |

**Key observation:** The Assignments page reads `servCode.dateRange.min/max` for display
purposes only (showing the RealGreen date range next to each group). This is one of the
remaining usages of the deprecated `dateRange` field.

---

### 2.5 Season Plan Page (`/bizPlan/paceCrawler/seasonPlan`)

**What it answers:** "What are the committed planned dates per group, and are they feasible?"

**Data consumed:**

| Data | Source | Purpose |
|---|---|---|
| `seasonPlans` | `seasonPlanSelect.seasonPlans` | All plans |
| `groups` | `assignmentGroupSelect.groups` | Groups to schedule |
| `assignmentPlans` | `assignmentPlanSelect.assignmentPlans` | For feasibility: team rates |
| `activePoolPriceByServCode` | `paceCrawlerSelect.activePoolPriceByServCode` | For feasibility: remaining work |
| `totalAvgDailyPriceByEmployee` | `paceCrawlerSelect.totalAvgDailyPriceByEmployee` | For feasibility: employee rates |
| `holidayDates` | `holidaySelect.holidayDates` | For feasibility: working days |
| `employeeMap` | `employeeSelect.employeeMap` | For feasibility: PTO/availability |

**Feasibility computation (inline in page):**
- `totalPool` = sum of `activePoolPriceByServCode` for group members
- `teamDailyRate` = sum of assigned employees' goals (or avg fallback)
- `daysAvailable` = weekdays in `[plannedStart, plannedEnd]` minus holidays/PTO
- `daysNeeded` = `totalPool / teamDailyRate`
- Status: `too-early | on-track | tight | over`

**Key observation:** The Season Plan page computes its own feasibility estimate
independently of the crawler. It uses `activePoolPriceByServCode` and employee rates
directly — a **third parallel source of truth** for "how long will this take?"

---

### 2.6 Employee Timeline Page (`/bizPlan/paceCrawler/empTimeline`)

**What it answers:** "What is each employee's projected work schedule over the season?"

**Data consumed:**

| Data | Source | Purpose |
|---|---|---|
| `employeeTimelineMap` | `paceCrawlerSelect.employeeTimelineMap` → `crawlerResult.employeeTimeline` | Per-employee ordered events |
| `employeeMap` | `employeeSelect.employeeMap` | Employee names |

**Events recorded:** `starts`, `finishes`, `switches`, `downtime`

**Key observation:** This page is a pure consumer of the crawler's output. It has no
parallel computation.

---

### 2.7 ServCode Timeline Page (`/bizPlan/paceCrawler/scTimeline`)

**What it answers:** "Who is working each servCode/group, and when does the crew change?"

**Data consumed:**

| Data | Source | Purpose |
|---|---|---|
| `servCodeTimelineMap` | `paceCrawlerSelect.servCodeTimelineMap` → `crawlerResult.servCodeTimeline` | Per-entry crew events |
| `employeeMap` | `employeeSelect.employeeMap` | Employee names |

**Events recorded:** `starts`, `returns`, `leaves`, `finishes` — with `employeeDailyRate`,
`teamDailyRate`, `poolRemaining` snapshots at each transition.

**Key observation:** Pure consumer of crawler output. No parallel computation.

---

## 3. The Core Problem: Three Parallel Sources of Truth

After tracing all dependencies, the fundamental architectural problem is clear:

**Three different places compute "how long will this group take to finish?"**

| Location | Method | Used For |
|---|---|---|
| **Crawler** (`dayCrawlSimulation.ts`) | Day-by-day simulation draining pools | `projectedEndDate` → Gantt bar position |
| **Employee Card** (`employeeCardSelect.ts`) | `combinedPool / teamRate` vs `planDeadlineWeekdays` | Days-late badges on employee cards |
| **Season Plan** (`seasonPlan/page.tsx`) | `totalPool / teamDailyRate` vs `daysAvailable` | Feasibility badges on plan form |

These three computations use different inputs, different assumptions, and produce
different answers. The Gantt shows one projected finish date; the employee card shows
a different "days late" number; the season plan shows a third feasibility estimate.
None of them are wrong per se — they answer slightly different questions — but the
lack of a unified engine means they can never be reconciled.

---

## 4. Revised Engine Design: Full-Season Crawl with Past/Future Split

### 4.1 `mainDate` as a First-Class Engine Input

`mainDate` is the "as of" date — the engine treats it as synonymous with "today." All
output is relative to it. Days before `mainDate` are **past reality**; days after are
**projected future**. `mainDate` is a required input to the engine, not just UI state.

### 4.2 Three-Phase Crawl

The engine crawls the entire season span (from the earliest `plannedStart` across all
groups, or `snowMelt` if set, through `snowDeadline`), not just the future.

**Phase 1 — Past (day < mainDate):**
- Read actual reality: services completed (`doneDate === day`) and printed (`schedDate === day`, treated as "will be done")
- Accumulate each employee's actual $/day contribution to each group from `doneBy` records
- Build a **group-keyed actual production history** — not derived from programType averages, but from what literally happened on that group

**Phase 2 — Present (day === mainDate):**
- Printed services are the "handoff" — committed and expected to complete today
- Services with `doneDate === mainDate` are already done
- The remaining active pool is what the future simulation starts from

**Phase 3 — Future (day > mainDate):**
- Drain by `goalDailyPrice` per employee, priority order, group-first
- Record `projectedEndDate` when pool hits zero
- Record employee and crew timeline events

### 4.3 Goals Are Required — No Fallback

**`goalDailyPrice` is a required input for the simulation phase.** If any assigned
employee has no `goalDailyPrice` for a group, the engine cannot produce a projection
for that group. There is no fallback to lookback averages or team averages.

This is intentional: it forces the user to commit to explicit goals before the engine
produces projections, rather than silently using averages that may be misleading.

The engine returns `projectedEndDate: null` and populates `missingGoals: string[]`
(employeeIds) on the `GroupResult` so the UI can tell the user exactly what's missing.

### 4.4 Group-Keyed Actual Averages (Feedback Only)

The past crawl phase produces per-employee, per-group actual production averages.
These are **feedback signals only** — displayed alongside goals so the user can see
if a goal is realistic given actual history. They are never used to drive the simulation.

If `avgDailyPrice` is significantly below `goalDailyPrice`, the UI should surface this
as a warning. At the start of a group's season there will be no history yet — `null`
is the correct value and the UI should handle it gracefully.

---

## 5. What the New Engine Must Produce

A single `runPaceEngine(inputs)` call should return a result rich enough that all
downstream consumers can read from it without re-deriving anything.

### 5.1 Per-Group Output (the core unit)

Every consumer thinks in terms of **groups** (AssignmentGroups), not individual servCodes.
The engine should produce one `GroupResult` per group:

```typescript
type GroupResult = {
  groupId: string;
  label: string;
  memberServCodeIds: string[];

  // --- Plan context (from SeasonPlan) ---
  plannedStart: string | null;
  plannedEnd: string | null;
  planDeadlineWeekdays: number;  // weekdaysBetween(mainDate, plannedEnd)

  // --- Pool state (as of mainDate) ---
  activePool: number;            // sum of actionable service prices
  totalPool: number;             // sum of all non-N service prices
  hasWork: boolean;

  // --- Actual history (from past crawl phase) ---
  actualPriceCompleted: number;  // total $ completed as of mainDate
  actualDaysWorked: number;      // how many past days had any production on this group
  actualTeamDailyRate: number | null;  // avg team $/day on days this group was worked

  // --- Simulation output (from future crawl phase) ---
  projectedEndDate: string | null;  // day the pool drains to zero (null if goals missing)
  projectedStartDate: string | null; // earliest date any employee starts working it
  missingGoals: string[];           // employeeIds with no goalDailyPrice set

  // --- Pace analysis (single source of truth) ---
  teamGoalDailyRate: number;     // sum of all assigned employees' goalDailyPrice
  daysNeeded: number | null;     // activePool / teamGoalDailyRate (null if goals missing)
  daysAvailable: number;         // effective working days in [mainDate, plannedEnd]
  daysEarlyLate: number | null;  // daysNeeded - daysAvailable (+ = late, - = early)
  isOnTrack: boolean;
  isOverdue: boolean;            // plannedEnd < mainDate AND hasWork

  // --- Per-employee breakdown ---
  employeeBreakdowns: EmployeeGroupBreakdown[];

  // --- Timeline (from simulation) ---
  crewTimeline: ServCodeTimelineEvent[];

  // --- Per-member detail ---
  members: MemberResult[];
};
```

### 5.2 Per-Employee-Group Breakdown

```typescript
type EmployeeGroupBreakdown = {
  employeeId: string;

  // Driver: what the simulation uses (required — null means engine cannot project)
  goalDailyPrice: number | null;

  // Feedback: what has actually happened on this group (from past crawl)
  // null when no past history exists yet for this group
  avgDailyPrice: number | null;
  avgDaysObserved: number;       // how many days of history this avg is based on

  // Derived
  shareRatio: number;            // this employee's goalDailyPrice / teamGoalDailyRate
  requiredDailyPrice: number | null;  // activePool * shareRatio / daysAvailable
  daysEarlyLate: number | null;  // employee-level projection
};
```

### 5.3 Per-Member Result

```typescript
type MemberResult = {
  servCodeId: string;
  activePool: number;
  plannedEnd: string | null;
  remainingWeekdays: number;
  projectedEndDate: string | null;
  isOverdue: boolean;
};
```

### 5.4 Full Engine Output

```typescript
type PaceEngineResult = {
  groups: GroupResult[];
  groupMap: Map<string, GroupResult>;  // for O(1) lookup

  // Employee-level timeline (from simulation)
  employeeTimeline: Map<string, { date: string; event: EmployeeTimelineEvent }[]>;

  // Urgent classification (replaces urgentServCodesSelect)
  urgentGroups: UrgentGroup[];

  // Metadata
  mainDate: string;
  seasonStart: string;   // earliest plannedStart across all groups (or snowMelt)
  seasonEnd: string;     // snowDeadline (or latest plannedEnd)
};
```

---

## 6. How Each Sub-Page Would Consume the Engine

| Sub-Page | What it reads from `PaceEngineResult` |
|---|---|
| **Employee Plan** | `groups[].employeeBreakdowns` — goal/avg/required rates, days-late, pool |
| **Gantt** | `groups[]` — plannedStart/End, projectedEndDate, projectedStartDate, hasWork |
| **Gantt Popover** | `groups[].members` for pool; `groups[].employeeBreakdowns` for crew rates |
| **Priorities** | `urgentGroups` — replaces urgentServCodesSelect entirely |
| **Season Plan Feasibility** | `groups[].daysNeeded`, `daysAvailable`, `daysEarlyLate` |
| **Emp Timeline** | `employeeTimeline` |
| **SC Timeline** | `groups[].crewTimeline` |

---

## 7. Proposed New Module Location

`assignmentGroup`, `groupSequence`, `assignmentPlan`, and `seasonPlan` are all
configuration data that the engine requires. They have no meaningful existence outside
the pace engine context. Co-locating them inside `src/app/pace/` signals this dependency
explicitly in the file structure and cleans up the root `src/app/` folder.

Other modules that need to access these (e.g. for display purposes) can still import
from the sub-folder paths directly.

```
src/app/pace/
  ├── PaceEngine.ts              ← The engine function
  ├── PaceEngineTypes.ts         ← All types (GroupResult, MemberResult, etc.)
  ├── PaceEngineInputs.ts        ← Input assembly selectors
  ├── paceEngineSelect.ts        ← Redux selector that calls the engine
  ├── paceSlice.ts               ← Redux slice (mainDate, UI state)
  ├── usePaceDeps.ts             ← Data loading hook
  ├── layout.tsx                 ← Tab layout
  ├── page.tsx                   ← Root page (Employee Plan)
  │
  ├── assignmentGroup/           ← moved from src/app/assignmentGroup/
  │   ├── AssignmentGroupTypes.ts
  │   ├── AssignmentGroupModel.ts
  │   ├── assignmentGroupSlice.ts
  │   ├── assignmentGroupSelect.ts
  │   ├── useAssignmentGroup.ts
  │   ├── _components/
  │   └── api/
  │
  ├── groupSequence/             ← new
  │   ├── GroupSequenceTypes.ts
  │   ├── GroupSequenceModel.ts
  │   ├── groupSequenceSlice.ts
  │   ├── groupSequenceSelect.ts
  │   ├── useGroupSequence.ts
  │   └── api/
  │
  ├── assignmentPlan/            ← moved from src/app/bizPlan/assignmentPlan/
  │   ├── AssignmentPlanTypes.ts
  │   ├── assignmentPlanSlice.ts
  │   ├── assignmentPlanSelect.ts
  │   ├── useAssignmentPlan.ts
  │   └── api/
  │
  ├── seasonPlan/                ← moved from src/app/bizPlan/seasonPlan/
  │   ├── SeasonPlanTypes.ts
  │   ├── SeasonPlanModel.ts
  │   ├── seasonPlanSlice.ts
  │   ├── seasonPlanSelect.ts
  │   ├── useSeasonPlan.ts
  │   ├── page.tsx
  │   └── api/
  │
  ├── gantt/
  │   └── page.tsx
  ├── priorities/
  │   └── page.tsx
  ├── assignments/
  │   └── page.tsx
  ├── empTimeline/
  │   └── page.tsx
  └── scTimeline/
      └── page.tsx
```

---

## 8. Key Design Decisions for the New Engine

### 8.1 Group-First, Not ServCode-First

The old engine operated on servCodes and then collapsed to groups in selectors.
The new engine should operate on groups from the start. A group is the atomic unit
of work — it is always worked as a whole, by all assigned employees simultaneously.

### 8.2 Single Pace Computation

The "how long will this take?" question is answered once, inside the engine, using
the simulation's actual drain model. The result (`daysNeeded`, `daysAvailable`,
`daysEarlyLate`) is stored on `GroupResult` and read by all consumers. No page
re-derives it.

### 8.3 The Cascade Close Bug Fix

The non-sequential cascade close in the old engine fires too early because it compares
`currentPool` (active only) against `totalPool` (all services including completed).
The fix: for non-sequential groups, the only close condition is `today > plannedEnd`.
Remove the `completionPct >= cascadeThreshold` check from non-sequential groups entirely.

### 8.4 Urgency Classification Inside the Engine

The `urgentServCodesSelect` is a separate selector that re-reads `groupScheduleMap`
and `servCodes` independently. In the new engine, urgency classification happens as
part of the engine output — each group gets an `urgencyStatus` field, and the
`urgentGroups` array is a filtered view of `groups`.

### 8.5 Feasibility as a First-Class Output

The Season Plan page currently computes feasibility inline. In the new engine,
`daysNeeded`, `daysAvailable`, and `daysEarlyLate` are first-class fields on
`GroupResult`. The Season Plan page reads them directly.

### 8.6 No `servCode.dateRange` in the Engine

The new engine does not read `servCode.dateRange` at any point. All date boundaries
come from the active `SeasonPlan`. ServCodes not in any SeasonPlan group are excluded
from the crawl entirely (same as the current `selectServCodeOpenDateFloor` behavior).

---

## 9. Resolved Design Decisions

### 9.1 Sequential Groups — `GroupSequence` Type *(Resolved)*

**Problem:** `ProgCode.runsInSequence` is a RealGreen concept that leaks into the
group-first model. The engine should not know about ProgCodes. Sequential unlock
(LR1 → LR2 → LR3) needs to be expressed in group-level terms.

**Decision:** Introduce a new first-class type `GroupSequence`:

```typescript
type GroupSequence = {
  sequenceId: string;   // natural key, e.g. "lr-sequence"
  label: string;        // display name, e.g. "Lawn Renovation"
  groupIds: string[];   // ordered — index 0 opens first, index 1 opens when 0 hits threshold
  // cascadeThreshold inherited from the active SeasonPlan
};
```

**Engine behavior:**
- `groupIds[0]` opens at its `plannedStart`
- When `groupIds[0]` reaches `cascadeThreshold` completion, `groupIds[1]` opens
- Any remaining pool from `groupIds[0]` is carried forward into `groupIds[1]`'s pool
- And so on down the chain

**`GroupResult` gains a `sequenceId: string | null` field** so the Gantt can visually
group sequential bars together.

**Module location:** `src/app/pace/groupSequence/` — co-located with the engine since
`GroupSequence` has no meaningful existence outside the pace context.

### 9.2 `alwaysAsap` ServCodes *(Resolved)*

**Decision:** `alwaysAsap` servCodes are **excluded from the engine entirely.**

- `alwaysAsap` servCodes cannot be assigned to a group (enforced by the UI)
- If a servCode is later marked `alwaysAsap` after being assigned to a group, the engine
  silently ignores its services when computing pool values — no error, no special case
- The Priorities page reads `alwaysAsap` directly from `servCodes` (via `deepSelect.servCodes`)
  and is entirely independent of the engine

### 9.3 Cascade Rollover → Priorities Page *(Resolved)*

When a sequential group's remaining pool is rolled into the next group (cascade unlock),
those services are now "overdue" relative to their original group's `plannedEnd`. The
Priorities page **must surface these services** so the user can clean them up quickly.

**Implementation:** The `urgentGroups` output from the engine includes groups where
`isOverdue === true` AND `activePool > 0`. When a cascade rollover occurs, the source
group will have `isOverdue: true` with its remaining pool carried forward — making it
automatically appear in the Priorities page's urgent list.

### 9.4 `mainDate` Semantics *(Resolved)*

`mainDate` is the past/future split point. The crawl always starts from `seasonStart`
(earliest `plannedStart` across all groups, or `snowMelt`). The old concept of
"crawl start = next weekday after today" is replaced by the three-phase model.

### 9.5 Goals Required — No Fallback *(Resolved)*

`goalDailyPrice` is required for the simulation phase. No fallback to lookback averages
or team averages. Groups with missing goals get `projectedEndDate: null` and
`missingGoals: string[]` in their `GroupResult`.

---

## 10. Implementation Order

1. Define `PaceEngineTypes.ts` — all types, no logic
2. Define `PaceEngineInputs.ts` — input assembly selectors (pool, rates, schedules)
3. Implement `PaceEngine.ts` — the simulation, group-first
4. Implement `paceEngineSelect.ts` — the Redux selector
5. Implement `paceSlice.ts` and `usePaceDeps.ts`
6. Implement `layout.tsx` and sub-pages one at a time, consuming engine output
7. Verify each sub-page produces the same answers as the old module (or better)
8. Deprecate `src/app/bizPlan/paceCrawler/` once all sub-pages are migrated

---

*This document is a living plan. Update it as decisions are made and questions are resolved.*
