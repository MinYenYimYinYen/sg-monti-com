# 261002 Build Plan — `src/app/pace/` Phased Implementation

> **Companion to:** `261002RefactorPlan.md`
> This document is the implementation checklist. The architecture document describes *what* to build; this document describes *how to build it in order*.

---

## Ground Rules

- **No imports** from `src/app/bizPlan/paceCrawler`, `src/app/assignmentGroup`, or `src/app/bizPlan/assignmentPlan`. Everything is re-created inside `src/app/pace/`.
- **Module names are preserved.** Mongoose `modelName` strings must match the originals exactly. If any stored field is renamed or removed, a migration script is required before go-live.
- `assignmentGroup`, `groupSequence`, and `assignmentPlan` are co-located inside `src/app/pace/` — next to each other — signaling they exist solely to serve the pace engine.

---

## Phase 1 — Types

**Goal:** Define all TypeScript types. No logic, no imports from old modules.

**Migration audit:** `assignmentGroup`, `assignmentPlan`, and `seasonPlan` types are re-created with shapes matching the originals — no data migration needed. `GroupSequence` is new; its collection starts empty.

### Files to create

```
src/app/pace/
  assignmentGroup/
    AssignmentGroupTypes.ts         ← re-create (AssignmentGroup — shape unchanged)
  groupSequence/
    GroupSequenceTypes.ts           ← new (GroupSequence)
  assignmentPlan/
    AssignmentPlanTypes.ts          ← re-create (Scenario, AssignmentPlan, GroupAssignment — shape unchanged)
  seasonPlan/
    SeasonPlanTypes.ts              ← re-create (SeasonPlan, GroupSchedule — shape unchanged)
  PaceEngineTypes.ts                ← all engine output types:
                                       GroupResult, MemberResult, EmployeeGroupBreakdown,
                                       PaceEngineResult, UrgentGroup,
                                       EmployeeTimelineEvent, ServCodeTimelineEvent,
                                       PoolDaySnapshot
```

### `GroupSequenceTypes.ts` (new type)

```typescript
type GroupSequence = {
  sequenceId: string;   // natural key, e.g. "lr-sequence"
  label: string;        // display name, e.g. "Lawn Renovation"
  groupIds: string[];   // ordered — index 0 opens first
};
```

`GroupResult` gains `sequenceId: string | null` (defined in `PaceEngineTypes.ts`).

### `PoolDaySnapshot` (new type in `PaceEngineTypes.ts`)

```typescript
type PoolDaySnapshot = {
  date: string;        // ISO date — every day in the crawl span
  completed: number;   // cumulative $ completed as of this day
  remaining: number;   // active pool remaining as of this day
};
```

`GroupResult` gains `poolHistory: PoolDaySnapshot[]`.

- **Past phase** populates snapshots from actual service completion data.
- **Future phase** populates snapshots from the simulation drain.
- The `mainDate` entry is the handoff point — actual history to the left, projected trajectory to the right.
- For a `GroupSequence`, the burndown selector merges member groups' histories by summing snapshots on matching dates.

**Open UI question (deferred to implementation):** For a `GroupSequence` burndown chart, should member groups be displayed as **stacked bands** (showing which group in the sequence is the bottleneck) or as a **single combined line** (total remaining — simpler, better for the "are we going to make it?" question)? The `poolHistory` data shape supports both. Decide at implementation time.

---

## Phase 2 — API / Mongo

**Goal:** Create Mongoose models and API routes for each data module. No imports from old locations.

**Migration audit:** Verify each `createModel(modelName, ...)` call uses the **exact same string** as the original. If any field is renamed or removed, write a migration script before go-live.

### Files to create

```
src/app/pace/
  assignmentGroup/
    AssignmentGroupModel.ts
    api/
      AssignmentGroupContract.ts
      route.ts
  groupSequence/
    GroupSequenceModel.ts
    api/
      GroupSequenceContract.ts
      route.ts
  assignmentPlan/
    api/
      AssignmentPlanModel.ts
      AssignmentPlanContract.ts
      route.ts
  seasonPlan/
    api/
      SeasonPlanModel.ts
      SeasonPlanContract.ts
      route.ts
```

---

## Phase 3 — Redux Slices + Deps Hook

**Goal:** Create Redux slices for each data module and the central `usePaceDeps` hook that loads all external data into state.

### Files to create

```
src/app/pace/
  assignmentGroup/
    assignmentGroupSlice.ts
    useAssignmentGroup.ts
  groupSequence/
    groupSequenceSlice.ts
    useGroupSequence.ts
  assignmentPlan/
    assignmentPlanSlice.ts
    useAssignmentPlan.ts
  seasonPlan/
    seasonPlanSlice.ts
    useSeasonPlan.ts
  paceSlice.ts                      ← mainDate, UI state (selectedEmployeeIds, etc.)
  usePaceDeps.ts                    ← orchestrates all sub-hooks; called once in layout.tsx
```

### `usePaceDeps` responsibilities

`usePaceDeps` is the single orchestration point. It calls:
- `useAssignmentGroup`
- `useGroupSequence`
- `useAssignmentPlan`
- `useSeasonPlan`
- External hooks: employee, holiday, deepSelect services, etc.

Sub-pages **never** call these hooks directly. Only `layout.tsx` calls `usePaceDeps`.

---

## Phase 4 — Source Data Selector File

**Goal:** A single barrel re-export file that surfaces every selector needed anywhere inside this module. Sub-pages import from here — not from individual slice selector files. If a selector moves, only this file changes.

### File to create

```
src/app/pace/
  paceSourceSelect.ts               ← re-exports from:
                                       assignmentGroup/assignmentGroupSelect
                                       groupSequence/groupSequenceSelect
                                       assignmentPlan/assignmentPlanSelect
                                       seasonPlan/seasonPlanSelect
                                       external: employeeSelect, holidaySelect, deepSelect, etc.
```

This file contains no logic — only `export { ... } from "..."` statements.

---

## Phase 5 — Engine Selector (the crawler)

**Goal:** Implement the pace engine as a pure function and wire it to Redux via a single `createSelector`.

### Architecture decision: selector vs. pure function

- **`paceEngineSelect.ts`** is a Redux `createSelector`. It assembles inputs from state and calls `runPaceEngine()`. This is the **only memoization boundary** for the engine.
- **`runPaceEngine()`** is a pure function in `lib/`. It receives a `PaceEngineInputs` object and returns `PaceEngineResult`. No Redux, no selectors — fully testable in isolation.
- The phase functions (`crawlPastPhase`, etc.) are plain TypeScript functions called by `runPaceEngine`. They are **not** selectors. Selectors are for memoization, not for chaining function calls.
- Sub-page selectors (`ganttSelect`, `employeePlanSelect`, etc.) memoize their own derived slices from `PaceEngineResult`.

**Why no phase-level memoization:** All phases share the same `PaceEngineInputs` object. If any input changes, all phases must re-run — the past crawl feeds the present, which feeds the future, which feeds assembly. There is no valid intermediate cache point. If the engine becomes slow, the fix is to optimize data structures inside the engine, not to add selector chains.

### Files to create

```
src/app/pace/
  paceEngineSelect.ts               ← createSelector: assembles PaceEngineInputs → calls runPaceEngine()
  lib/
    PaceEngineInputs.ts             ← PaceEngineInputs type + input assembly selector
    runPaceEngine.ts                ← entry point; calls phase functions in order; assembles PaceEngineResult

    buildGroupContexts/             ← Phase 0: resolve groups from AssignmentGroups + SeasonPlan + AssignmentPlan
      buildGroupContexts.ts
      helpers/
        resolveGroupSchedule.ts
        resolveGroupAssignments.ts

    crawlPastPhase/                 ← Phase 1: walk days < mainDate; accumulate actual production history
      crawlPastPhase.ts
      helpers/
        accumulateActualProduction.ts
        computeActualGroupRates.ts

    crawlPresentPhase/              ← Phase 2: handle mainDate handoff (printed = committed, done = done)
      crawlPresentPhase.ts

    crawlFuturePhase/               ← Phase 3: drain pools by goalDailyPrice; record projectedEndDate + timelines
      crawlFuturePhase.ts
      helpers/
        drainGroupPool.ts
        recordTimelineEvent.ts
        resolveSequenceCascade.ts

    assembleGroupResults/           ← Phase 4: combine past + present + future into GroupResult[]
      assembleGroupResults.ts
      helpers/
        computePaceAnalysis.ts      ← daysNeeded, daysAvailable, daysEarlyLate, isOnTrack, isOverdue
        computeEmployeeBreakdowns.ts
        classifyUrgency.ts          ← produces urgentGroups[]
```

### `runPaceEngine.ts` reads like a recipe

```typescript
export function runPaceEngine(inputs: PaceEngineInputs): PaceEngineResult {
  const groupContexts = buildGroupContexts(inputs);
  const pastState     = crawlPastPhase(inputs, groupContexts);
  const presentState  = crawlPresentPhase(inputs, pastState);
  const futureState   = crawlFuturePhase(inputs, presentState);
  return assembleGroupResults(inputs, futureState);
}
```

No logic lives at the top level — it only orchestrates. Each phase function describes what we're doing at that stage of the crawl.

### Folder rule for helpers

> If a function has helpers, it gets a folder: `functionName/helpers/` + `functionName.ts`.
> If a helper itself has more than two helpers, it follows the same pattern recursively.
> Top-level function names describe what we're doing, not how.

---

## Phase 6 — Sub-Page Selectors

**Goal:** Thin selectors per sub-page that shape engine output into component-ready props. They re-export from `paceSourceSelect` for any relational data (e.g. employee metadata). They do **not** re-derive anything the engine already computed.

### Files to create

```
src/app/pace/
  employeePlanSelect.ts             ← derives OpenGroupRow[] per employee from groups[].employeeBreakdowns
  ganttSelect.ts                    ← derives Gantt bar data from groups[]
  prioritiesSelect.ts               ← re-exports engine urgentGroups; reads alwaysAsap from deepSelect
  seasonPlanPageSelect.ts           ← re-exports groups[].daysNeeded / daysAvailable / daysEarlyLate
  empTimelineSelect.ts              ← re-exports engine employeeTimeline
  scTimelineSelect.ts               ← re-exports engine groups[].crewTimeline
  burndownSelect.ts                 ← reads groups[].poolHistory; merges GroupSequence members by date
```

---

## Phase 7 — Layout + Sub-Pages

**Goal:** Wire up the UI shell and implement each sub-page as a thin consumer of its dedicated selector.

```
src/app/pace/
  layout.tsx                        ← "use client"; calls usePaceDeps(); renders PageLayout + TabNav
  page.tsx                          ← Employee Plan (root tab)
  gantt/
    page.tsx
  priorities/
    page.tsx
  assignments/
    page.tsx
  seasonPlan/
    page.tsx
  empTimeline/
    page.tsx
  scTimeline/
    page.tsx
  burndown/
    page.tsx                        ← UI deferred; route and selector wired up so data is verifiable
```

Each sub-page `page.tsx` is thin: it imports one selector and renders one panel component. No data fetching, no hook calls.

---

## Phase 8 — Migration Audit & Go-Live

**Goal:** Verify correctness, audit stored data, deprecate old modules.

### Checklist

- [ ] Verify all Mongoose `modelName` strings match originals (no collection rename).
- [ ] Audit `assignmentGroup`, `assignmentPlan`, `seasonPlan` for any field renames or removals — write migration scripts if needed.
- [ ] `groupSequence` is new — no migration needed; collection starts empty.
- [ ] Smoke-test each sub-page against the old module's output (or better).
- [ ] Deprecate `src/app/bizPlan/paceCrawler/`.
- [ ] Deprecate `src/app/assignmentGroup/`.
- [ ] Deprecate `src/app/bizPlan/assignmentPlan/`.
- [ ] Deprecate `src/app/bizPlan/seasonPlan/`.

---

## Complete File Tree (target state)

```
src/app/pace/
  PaceEngineTypes.ts
  paceEngineSelect.ts
  paceSlice.ts
  paceSourceSelect.ts
  usePaceDeps.ts
  employeePlanSelect.ts
  ganttSelect.ts
  prioritiesSelect.ts
  seasonPlanPageSelect.ts
  empTimelineSelect.ts
  scTimelineSelect.ts
  burndownSelect.ts
  layout.tsx
  page.tsx

  lib/
    PaceEngineInputs.ts
    runPaceEngine.ts
    buildGroupContexts/
      buildGroupContexts.ts
      helpers/
        resolveGroupSchedule.ts
        resolveGroupAssignments.ts
    crawlPastPhase/
      crawlPastPhase.ts
      helpers/
        accumulateActualProduction.ts
        computeActualGroupRates.ts
    crawlPresentPhase/
      crawlPresentPhase.ts
    crawlFuturePhase/
      crawlFuturePhase.ts
      helpers/
        drainGroupPool.ts
        recordTimelineEvent.ts
        resolveSequenceCascade.ts
    assembleGroupResults/
      assembleGroupResults.ts
      helpers/
        computePaceAnalysis.ts
        computeEmployeeBreakdowns.ts
        classifyUrgency.ts

  assignmentGroup/
    AssignmentGroupTypes.ts
    AssignmentGroupModel.ts
    assignmentGroupSlice.ts
    assignmentGroupSelect.ts
    useAssignmentGroup.ts
    _components/
    api/
      AssignmentGroupContract.ts
      route.ts

  groupSequence/
    GroupSequenceTypes.ts
    GroupSequenceModel.ts
    groupSequenceSlice.ts
    groupSequenceSelect.ts
    useGroupSequence.ts
    api/
      GroupSequenceContract.ts
      route.ts

  assignmentPlan/
    AssignmentPlanTypes.ts
    assignmentPlanSlice.ts
    assignmentPlanSelect.ts
    useAssignmentPlan.ts
    api/
      AssignmentPlanModel.ts
      AssignmentPlanContract.ts
      route.ts

  seasonPlan/
    SeasonPlanTypes.ts
    seasonPlanSlice.ts
    seasonPlanSelect.ts
    useSeasonPlan.ts
    page.tsx
    api/
      SeasonPlanModel.ts
      SeasonPlanContract.ts
      route.ts

  gantt/
    page.tsx
  priorities/
    page.tsx
  assignments/
    page.tsx
  empTimeline/
    page.tsx
  scTimeline/
    page.tsx
  burndown/
    page.tsx
```

---

*This document is the implementation checklist. Update phase checkboxes as work is completed.*
