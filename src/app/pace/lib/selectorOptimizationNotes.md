# Pace Engine — Selector Optimization Notes

## Required Reading

Before reasoning about any optimization in this module, read **only** these files.
Do not open additional files unless explicitly prompted to gather more context.

| File | Why |
|---|---|
| `src/app/pace/lib/runPaceEngine.ts` | Entry point — shows the full pipeline and phase order |
| `src/app/pace/lib/PaceEngineInputs.ts` | All engine inputs and the `selectPaceEngineInputs` selector |
| `src/app/pace/lib/PaceEngineTypes.ts` | Engine output types (`PaceEngineResult`, `GroupPoolState`, etc.) |
| `src/app/pace/paceEngineSelect.ts` | The current memoization boundary |
| `src/app/pace/assignmentGroup/AssignmentGroupTypes.ts` | `AssignmentGroup` type — critical for understanding the mixed-concern problem |

These five files give you the full picture of what the engine does, what it consumes, and where the current memoization lives. Everything else is implementation detail.

---

## Background: Why This Document Exists

The pace engine (`runPaceEngine`) is a pure function that receives all Redux state as a plain
`PaceEngineInputs` object and returns `PaceEngineResult`. It is currently memoized as a single
unit by `selectPaceEngineResult` in `paceEngineSelect.ts` — any input change re-runs the entire
engine.

The engine is heavy. It was designed as a pure function for testability and clarity, but that
design defers the question of *when* to re-run to the selector layer. This document analyzes
where memoization boundaries could be introduced, what would be gained, and what stands in the way.

---

## Use Cases (Frequency Context)

Understanding when inputs change is essential to evaluating memoization value.

| Scenario | Frequency | What changes |
|---|---|---|
| User changes `mainDate` | **Most frequent** — daily use | `mainDate` only |
| In-season calibration | 5–10 times per season, 5–30 min sessions | Goals, planned dates, sequences |
| Annual season planning | Once per year, hours over a week | Everything future-facing; past never changes |
| RealGreen sync (`servCodes`) | Once on page load | `servCodes` |
| Employee availability/PTO | Occasional | `employees` |

**Key insight for annual season planning:** The user is on the pace page for hours tweaking
planned dates, employee goals, and sequences. `mainDate` is fixed (projecting next season).
`servCodes` is fixed (last season's completed data). The past phase result is pure waste on
every re-run — it scans all `servCodes` multiple times and produces the same output every time.

---

## Engine Pipeline & Phase Dependency Map

```
Inputs
  │
  ├─ sequences ──────────────────────────────────────────────────────────────────────────────┐
  │                                                                                           ▼
  │                                                                          buildGroupSequenceClassifier()
  │                                                                                           │
  ├─ servCodes ──────────────────────────────────────────────────────────────────────────┐   │
  ├─ assignmentGroups (servCodeIds, plannedEnd, overdueAsOfMainDate) ────────────────┐   │   │
  ├─ mainDate ──────────────────────────────────────────────────────────────────────┐ │   │   │
  │                                                                                 ▼ ▼   ▼   │
  │                                                                          crawlPastPhase() │
  │                                                                                 │         │
  │                                                                          [snapshot pools] │
  │                                                                                 │         │
  ├─ servCodes (credit-hold subtraction) ───────────────────────────────────────────┤         │
  │                                                                                 ▼         │
  │                                                                        crawlPresentPhase()│
  │                                                                                 │         │
  ├─ assignmentGroups (goalsByEmployee, assignedEmployeeIds, plannedStart) ─────────┤         │
  ├─ sequences (cascade logic, daysSince) ──────────────────────────────────────────┤         │
  ├─ employees (availability, PTO) ─────────────────────────────────────────────────┤         │
  ├─ assignmentPlans / goalByEmployeeByGroup ────────────────────────────────────────┤         │
  ├─ cascadeThreshold / groupScheduleMap ───────────────────────────────────────────┤         │
  ├─ servCodes (constrained queues only) ───────────────────────────────────────────┤         │
  ├─ mainDate ──────────────────────────────────────────────────────────────────────┤         │
  │                                                                                 ▼         ▼
  │                                                                          crawlFuturePhase()
  │                                                                                 │
  ├─ assignmentGroups ──────────────────────────────────────────────────────────────┤
  ├─ sequences ─────────────────────────────────────────────────────────────────────┤
  ├─ mainDate ──────────────────────────────────────────────────────────────────────┤
  │                                                                                 ▼
  │                                                                       assembleGroupResults()
  │                                                                                 │
  │                                                                                 ▼
  │                                                                         PaceEngineResult
```

### Phase input summary

| Phase | Inputs | Depends on prior phase? |
|---|---|---|
| `buildGroupSequenceClassifier` | `sequences` | No |
| `crawlPastPhase` | `servCodes`, `assignmentGroups` (doc fields only), `mainDate` | No |
| `crawlPresentPhase` | `servCodes` (credit-hold), `pastState` | Yes — mutates `pastState.poolStates` |
| `crawlFuturePhase` | `assignmentGroups` (props fields), `sequences`, `employees`, `assignmentPlans`, `cascadeThreshold`, `groupScheduleMap`, `servCodes` (constrained queues), `mainDate`, `presentState`, `classifier` | Yes |
| `assembleGroupResults` | `assignmentGroups`, `sequences`, `mainDate`, `futureState`, `pastState` | Yes |

---

## Proposed Memoization Boundaries

### Boundary 1: `selectPastPhaseState`

**Memoized on:** `servCodes` + `assignmentGroups` (doc fields: `servCodeIds`, `plannedEnd`) + `mainDate`

**Skips past phase when:** Only future-facing inputs change (goals, sequences, season plan, employees).

**Win during annual season planning:** Every goal tweak, sequence reorder, or planned-date
adjustment skips the past phase entirely. The past phase iterates `servCodes` multiple times
(pool accumulation, production breakdown, printed services, `accumulateActualProduction`) —
this is the most expensive scan in the engine.

**Win during in-season calibration:** Same — goal tweaks and season plan adjustments skip the past phase.

**No win when:** `mainDate` changes (most frequent daily use). The past phase must re-run.

### Boundary 2: `selectGroupSequenceClassifier`

**Memoized on:** `sequences` only

**Skips classifier rebuild when:** Anything other than sequences changes.

**Win:** Trivial — `buildGroupSequenceClassifier` is cheap. But it's a free win with zero
implementation risk. Sequences change rarely; this boundary costs nothing to add.

### Boundary 3: `selectConstrainedQueues` (potential)

**Memoized on:** `servCodes` + `sequences` + `mainDate` + `servCodeToGroupId` (from past phase)

**Note:** `buildCrawlServiceQueues` currently runs inside `crawlFuturePhase`. Extracting it
as a separate memoized step would allow it to be cached when only `employees` or `assignmentPlans`
change. However, it depends on `servCodeToGroupId` from the past phase, so it can only be
memoized after `selectPastPhaseState` is stable. The benefit is modest — this function is
not the bottleneck.

---

## The Mixed-Concern Problem: `AssignmentGroup`

This is the most important obstacle to clean memoization.

### The problem

`AssignmentGroup` is a fat hydrated type that mixes two logically independent concerns:

```typescript
// AssignmentGroupDoc — stored in MongoDB, changes rarely
type AssignmentGroupDoc = {
  groupId: string;
  label: string;
  servCodeIds: string[];   // ← used by PAST phase (servCodeToGroupId)
};

// AssignmentGroupProps — hydrated from SeasonPlan + AssignmentPlan, changes during setup
type AssignmentGroupProps = {
  sequenceId: string | null;
  plannedStart: string | null;
  plannedEnd: string | null;   // ← used by PAST phase (overdueAsOfMainDate)
  goalsByEmployee: Map<string, number | null>;   // ← used by FUTURE phase only
  assignedEmployeeIds: string[];                 // ← used by FUTURE phase only
};
```

`createSelector` uses referential equality. When a user tweaks a goal rate, the Redux store
updates the `assignmentGroups` array with a new object reference — even though only
`goalsByEmployee` changed. The `selectPastPhaseState` selector sees a new `assignmentGroups`
reference and re-runs the past phase, even though nothing the past phase cares about changed.

### Why this matters

During annual season planning, goal tweaks are the most frequent action. Without resolving
this conflict, `selectPastPhaseState` is invalidated on every goal change — eliminating the
primary benefit of the memoization boundary.

### Resolution options

#### Option A: Projection selector (low complexity, moderate benefit)

Add a selector that projects `assignmentGroups` to only the past-relevant fields:

```typescript
const selectAssignmentGroupsForPastPhase = createSelector(
  [paceAssignmentGroupSelect.assignmentGroupsScaled],
  (groups) => groups.map(g => ({ groupId: g.groupId, servCodeIds: g.servCodeIds, plannedEnd: g.plannedEnd }))
);
```

`selectPastPhaseState` depends on this projection instead of the full `assignmentGroups`.
A goal change updates `goalsByEmployee` but not `servCodeIds` or `plannedEnd` — the projection
output is referentially stable (new array, but `createSelector` compares by reference, so this
only works if the projection itself is memoized and its inputs are stable).

**Caveat:** This requires the projection selector to produce a stable reference when the
projected fields haven't changed. Standard `createSelector` won't do this — it always returns
a new array. You'd need a custom equality check or a selector that compares field-by-field.
Alternatively, use `reselect`'s `createSelectorCreator` with a deep-equal comparator on the
projected output.

**Refactor complexity:** Medium — requires a custom equality comparator or structural memoization.
**Memoization benefit:** High — goal tweaks (most frequent setup action) no longer invalidate the past phase.

#### Option B: Split `AssignmentGroup` at the data model level (high complexity, full benefit)

Store past-relevant and future-relevant fields in separate Redux slices:

- `assignmentGroupSlice` — stores `AssignmentGroupDoc` (`groupId`, `label`, `servCodeIds`)
- `assignmentPlanSlice` — already stores goals; `plannedStart`/`plannedEnd` move to `seasonPlanSlice`

Then `selectPastPhaseState` depends only on `assignmentGroupSlice` state and `seasonPlanSlice`
for `plannedEnd`. A goal change touches only `assignmentPlanSlice` — the past phase selector
is not invalidated.

**Refactor complexity:** High — requires schema changes, Mongo migration for `plannedEnd`
(currently hydrated from SeasonPlan, so may already be separate), and updates to all
consumers of `AssignmentGroup`.

**Memoization benefit:** Full — clean separation means zero false invalidations.

#### Option C: Accept the limitation (no complexity, partial benefit)

Do not resolve the mixed-concern problem. Add `selectPastPhaseState` and `selectClassifier`
as described, accepting that goal changes will still invalidate the past phase. The benefit
is limited to: sequence changes, season plan changes, and employee/availability changes —
all of which skip the past phase. Goal changes do not.

**Refactor complexity:** None beyond the selector additions.
**Memoization benefit:** Partial — covers sequence/season/employee changes but not goal changes.

---

## Benefit vs. Complexity Summary

| Optimization | Refactor Complexity | Memoization Benefit | Notes |
|---|---|---|---|
| `selectClassifier` (sequences only) | **Trivial** | Low (cheap function) | Free win, zero risk |
| `selectPastPhaseState` (Option C — accept limitation) | **Low** | Moderate | Helps sequence/season/employee changes; goal changes still invalidate |
| `selectPastPhaseState` + projection selector (Option A) | **Medium** | High | Requires custom equality; goal changes no longer invalidate past phase |
| Full data model split (Option B) | **High** | Full | Clean architecture; requires Mongo migration |

---

## Design Lesson: Memoization Must Be Designed In

The core lesson from this analysis: **selector-based memoization is only as granular as your
data model allows.** `createSelector` uses referential equality — if two logically independent
pieces of data live in the same object, a change to either one invalidates both.

The right time to ask "what changes together?" is when designing the schema, not when
optimizing selectors after the fact. If `goalsByEmployee` and `servCodeIds` had always lived
in separate Redux slices (which they almost do — goals are in `assignmentPlanSlice`), the
memoization boundary would be clean by construction.

When designing new features that will feed a heavy computation:

1. **Identify which inputs belong to which phase** before writing the schema.
2. **Store phase-specific data in separate slices** so their Redux references are independent.
3. **Hydrate at the selector layer** — combine slice data into a rich type only at the point
   of consumption, not at the storage layer.
4. **Avoid fat hydrated types** that mix data from multiple sources with different change
   frequencies. The `AssignmentGroup` type is a cautionary example — `servCodeIds` (rarely
   changes) and `goalsByEmployee` (changes constantly during setup) are co-located in the
   same object, coupling their change signals permanently at the Redux reference level.
