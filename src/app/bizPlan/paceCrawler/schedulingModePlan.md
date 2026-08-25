# Season Planning Architecture

**Status**: Established — Ready for Implementation
**Supersedes**: Previous `schedulingModePlan.md` (Forecast Method Selector exploration)
**Related files**: See §8 for full file inventory

---

## Overview

This plan establishes the architecture for goal-based season planning in the Pace Crawler. The core problem is that the current system conflates three distinct concepts into a single data structure (`servCode.dateRange`): the original season plan, the operational scheduling window, and the crawler's projected output. This causes circular reasoning, confusing Gantt visualization, and a cascade-lock bug that blocks sequential servCodes when a handful of stragglers remain in a prior round.

The solution separates these concerns into distinct data structures and introduces per-employee, per-group daily revenue goals as the primary planning input.

---

## §1 — The Three Things You Actually Want

1. **The original plan** — what was committed to at the start of the year. "MLC1 runs April 1–May 15, MLC2 runs May 15–June 15, ..." This is the baseline. It should be frozen once the season starts and never overwritten by the crawler.

2. **A live forecast** — given current production rates (or goals), when will each servCode actually finish? This is the crawler's output. It should be computed, not stored, and it should not be blocked by a handful of stragglers in a prior servCode.

3. **A signal** — is the forecast end date before or after the snow deadline? If not, what needs to change?

---

## §2 — The Root Cause: One Field, Three Jobs

`servCode.dateRange` currently serves as:
- The original plan (what was set at season start)
- The operational constraint (what RealGreen uses to determine which services are in season)
- The crawler's floor input (when can work start?)
- The crawler's output (the old "Apply Optimized Ranges" button wrote back here)

This is why everything is tangled. The "Apply Optimized Ranges" button created a circular dependency: the crawler's projection fed back into its own input.

---

## §3 — The Cascade Lock Bug

The `runsInSequence` flag causes the crawler to lock MLC4 until MLC3 fully drains. When MLC3 has a handful of stragglers (services not yet complete for weather, customer, or other reasons), the crawler refuses to unlock MLC4 — even though crews are actively working MLC4 in reality.

The fix: the cascade unlock condition should be an OR of two signals, not a single pool-drain check:

```
unlock successor when:
  completionPct >= cascadeThreshold   (e.g. 95% of total pool completed)
  OR today > plannedEnd               (from the active SeasonPlan)
```

Where:
```
completionPct = completedPool / (completedPool + remainingPool)
completedPool = sum of price for services where status === "S" (completed)
remainingPool = sum of price for actionable services
```

This is always live and accurate from service data — no stored `originalPool` needed. The total pool grows as new sales come in throughout the year, and `completionPct` reflects that automatically.

The straggler pool is carried forward into the successor servCode (MLC4 gets a slightly larger pool), keeping the total work accounted for without blocking the projection.

---

## §4 — New Data Structures

### §4.1 — `GroupAssignment` (replaces `groupIds[]` in `AssignmentPlan`)

Goals are stored per-employee, per-group. This is the right granularity because:
- Different employees can have different capacities for the same group
- An employee can have different goals for different groups (route density, equipment, etc.)
- Goals travel with the scenario — different scenarios can have different goals

```typescript
type GroupAssignment = {
  groupId: string;
  /** Planned daily revenue for this employee on this group. null = fall back to lookback avg. */
  dailyRevenueGoal: number | null;
};

type AssignmentPlan = {
  employeeId: string;
  groupAssignments: GroupAssignment[]; // replaces groupIds: string[]
};
```

**Migration**: The existing `groupIds: string[]` format is migrated on read in `route.ts` via `migratePlan()`. Each `groupId` becomes a `GroupAssignment` with `dailyRevenueGoal: null`.

**TODO**: Remove `migratePlan()` and `migrateScenario()` from `route.ts` once all documents in MongoDB have been updated to the new format. Verify with:
```
db.assignmentscenarios.find({ "plans.groupIds": { $exists: true } })
```

### §4.2 — `SeasonPlan` (new MongoDB collection)

Stores the committed plan dates per servCode. Multiple plans can exist (pre-season, revised mid-season, etc.). One is active at a time.

```typescript
type ServCodeSchedule = {
  servCodeId: string;
  plannedStart: string; // ISO date — locked at plan creation
  plannedEnd: string;   // ISO date — locked at plan creation
};

type SeasonPlan = {
  name: string;               // e.g. "2026 Season - Base Plan"
  year: number;
  /** Fraction of total pool that must be completed before unlocking the successor in a sequence. */
  cascadeThreshold: number;   // e.g. 0.95
  /** Hard end-of-season deadline (e.g. first expected snow date). Shown as a vertical line on the Gantt. */
  snowDeadline: string | null;
  servCodeSchedules: ServCodeSchedule[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
```

`SeasonPlan` is its own MongoDB collection following the standard data module pattern (contract, route, slice, select, hook).

---

## §5 — The Two-Mode Crawler

The crawler runs in two modes simultaneously, producing two projections:

**Goal crawl** (planning tool):
- Drain rate per employee = `dailyRevenueGoal ?? totalAvgDailyCSP.price`
- Cascade unlock: `completionPct >= cascadeThreshold OR today > plannedEnd`
- Output: `goalProjectedStart`, `goalProjectedEnd` per servCode
- Answers: "If we execute the plan, when do we finish?"

**Reality crawl** (feedback tool):
- Drain rate per employee = `totalAvgDailyCSP.price` (lookback average)
- Same cascade logic
- Output: `realityProjectedStart`, `realityProjectedEnd` per servCode
- Answers: "At our actual current rate, when do we finish?"

Both crawls use the same current pool sizes. The difference is only the drain rate.

The goal is a **planning tool**, not a reality tool. The gap between goal projection and reality projection is the primary management signal. When reality falls behind the goal, the manager can either push harder or explicitly revise the goal to reflect the new reality.

---

## §6 — The Gantt — Three Layers

Each servCode row shows three things:

1. **Plan band** (muted background): `plannedStart` → `plannedEnd` from the active `SeasonPlan`
2. **Goal bar** (solid, colored): `goalProjectedStart` → `goalProjectedEnd`
3. **Reality bar** (dashed or lighter): `realityProjectedStart` → `realityProjectedEnd`

Color coding on the goal bar:
- Green: `goalProjectedEnd` ≤ `plannedEnd`
- Yellow: `goalProjectedEnd` within N days of `plannedEnd`
- Red: `goalProjectedEnd` > `plannedEnd`

Snow deadline: a vertical line at `SeasonPlan.snowDeadline`.

**The "Apply Optimized Ranges" button is removed.** It was the source of the circular dependency. The crawler never writes back to `servCode.dateRange`. If management wants to change the season window in RealGreen, they do it directly.

**New actions**:
- **"Lock as Season Plan"**: Run the goal crawl → store projected dates as a new `SeasonPlan`. This is the pre-season planning action.
- **"Revise Goals from Reality"**: For each employee × group where actual < goal, offer to update `dailyRevenueGoal` to the actual lookback rate. This is the in-season course-correction action — applying reality back onto the goal, not applying new date ranges.

---

## §7 — The Employee Card — Three Values

Per group per employee:

| Label | Source | Meaning |
|---|---|---|
| **Goal** | `dailyRevenueGoal` ($/day) | The plan — what we committed to |
| **Actual** | `totalAvgDailyCSP.price` ($/day) | Reality — what is actually happening |
| **Required** | `remainingPool / remainingWeekdays` ($/day) | What is needed to finish by `plannedEnd` |

The gap between Goal and Actual is the feedback signal. The gap between Required and Goal tells you whether the goal is sufficient to finish on time.

---

## §8 — Files Affected

### AssignmentPlan

| File | Change |
|---|---|
| `AssignmentPlanTypes.ts` | Add `GroupAssignment` type; change `AssignmentPlan.groupIds` to `groupAssignments` |
| `AssignmentPlanModel.ts` | Update Mongoose schema to store `groupAssignments` array |
| `assignmentPlanSelect.ts` | Add derived `groupIds` selector for backward compat; update all consumers |
| `assignmentPlanSlice.ts` | Update `reorderGroupIds` action to work with `groupAssignments` |
| `api/route.ts` | Update `migratePlan()` to produce `GroupAssignment[]`; add TODO to remove migration |
| `AssignmentEditorPanel.tsx` | Add goal input field per group row |

### Crawler

| File | Change |
|---|---|
| `paceCrawlerSelect.ts` | Use `dailyRevenueGoal` as drain rate when set; run dual crawl (goal + reality) |
| `dayCrawlSimulation.ts` | Update cascade unlock to use `completionPct >= threshold OR today > plannedEnd` |
| `PaceCrawlerTypes.ts` | Add `goalProjectedEnd`, `realityProjectedEnd` to `CrawlerServCodeResult` |

### Gantt

| File | Change |
|---|---|
| `GanttChartPanel.tsx` | Three-layer display; remove "Apply Optimized Ranges"; add snow deadline line |

### Employee Card

| File | Change |
|---|---|
| `DiffCheckerTypes.ts` | Add `goalDailyPrice` field to `OpenGroupRow` / `OpenServCodeRow` |
| `employeeCardSelect.ts` | Surface goal, actual, required on each card row |
| `EmployeeCardPanel.tsx` | Render three-value display |

### New Files (SeasonPlan module)

| File | Role |
|---|---|
| `src/app/bizPlan/seasonPlan/SeasonPlanTypes.ts` | `SeasonPlan`, `ServCodeSchedule` types |
| `src/app/bizPlan/seasonPlan/api/SeasonPlanModel.ts` | Mongoose model |
| `src/app/bizPlan/seasonPlan/api/SeasonPlanContract.ts` | API contract |
| `src/app/bizPlan/seasonPlan/api/route.ts` | CRUD handlers |
| `src/app/bizPlan/seasonPlan/seasonPlanSlice.ts` | Redux slice |
| `src/app/bizPlan/seasonPlan/seasonPlanSelect.ts` | Selectors |
| `src/app/bizPlan/seasonPlan/useSeasonPlan.ts` | Auto-fetch hook |

---

## §9 — Implementation Sequence

**Phase 1 — Goal storage in AssignmentPlan** (self-contained, highest immediate value):
- Extend `GroupAssignment` type + Mongoose schema
- Update migration in `route.ts` (with TODO to remove later)
- Add derived `groupIds` selector for backward compat
- Add goal input to `AssignmentEditorPanel` per group row
- Update crawler to use goal rate when set

**Phase 2 — SeasonPlan module**:
- New collection, contract, route, slice, select, hook
- UI to create/activate/edit season plans
- "Lock as Season Plan" action

**Phase 3 — Dual-mode crawler**:
- Cascade unlock using `completionPct` + `plannedEnd`
- Goal crawl + reality crawl producing separate projected timelines

**Phase 4 — Gantt redesign**:
- Three-layer display (plan band, goal bar, reality bar)
- Snow deadline line
- Color coding
- Remove "Apply Optimized Ranges" button

**Phase 5 — Employee card redesign**:
- Three-value display (Goal, Actual, Required)
- "Revise Goals from Reality" action
