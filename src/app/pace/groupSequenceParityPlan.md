# Group Sequence Parity Plan

## Required Reading

Before implementing any part of this plan, read the following files in full:

| File | Why |
|---|---|
| `src/app/pace/PaceEngineTypes.ts` | `PoolDaySnapshot`, `GroupResult`, `PaceEngineResult` — the types being extended |
| `src/app/pace/groupSequence/GroupSequenceTypes.ts` | `GroupSequence` — the entity being promoted |
| `src/app/pace/lib/groupSequenceClassifier.ts` | The classifier that answers sequence-membership questions |
| `src/app/pace/lib/PaceEngineInputs.ts` | Where inputs are assembled — synthetic sequences are injected here |
| `src/app/pace/lib/assembleGroupResults/assembleGroupResults.ts` | Where `GroupResult[]` and `PaceEngineResult` are built |
| `src/app/pace/lib/crawlPastPhase/crawlPastPhase.ts` | Past phase — `accumulateActualProduction` for `employeeBreakdowns` |
| `src/app/pace/lib/crawlFuturePhase/crawlFuturePhase.ts` | Future phase — snapshot recording, cascade ordering bug |
| `src/app/pace/burndownSelect.ts` | How `BurndownSeries` is built from engine output |
| `src/app/pace/ganttSelect.ts` | How `GanttRow` is built from engine output |
| `src/app/pace/gantt/_components/GanttPage.tsx` | How the Gantt renders rows |
| `src/app/pace/burndown/_components/BurndownPage.tsx` | How the Burndown lists series |
| `src/app/pace/assignments/_components/PaceAssignmentGroupManager.tsx` | The Groups panel |

---

## 1. Problem Statement

Groups that belong to a `GroupSequence` are currently accessible in two ways:

1. As individual `GroupResult` entries in `PaceEngineResult.groups`
2. As members of a `GroupSequence` (via `sequenceId` on `GroupResult`)

This creates **duplicate access paths** and **inconsistent UI behavior**:

- The Gantt shows LR5+OW4 and LR6+LM3 as separate rows AND as part of "MLC Sequence"
- The Burndown lists them as individual series AND as a merged sequence series
- The Assignments panel shows all groups including sequence members without distinction
- The Gantt bar for LR6+LM3 starts at its `plannedStart` (plan band) even though it is locked — visually misleading

The engine is the canonical source of truth. The UI should reflect what the engine knows: sequence members are not independent — they are steps in a chain.

Additionally, `PoolDaySnapshot` currently only captures totals per day. It does not capture per-employee breakdowns, making it impossible to answer "who worked what on this day?" from the burndown.

---

## 2. Goals

1. **Unified sequence model** — all groups are wrapped as sequences at the input layer. Standalone groups become synthetic sequences of 1 element. The engine operates exclusively on `SequenceResult[]`.
2. **`PoolDaySnapshot` gains per-employee breakdowns** — future phase populates from simulation; past phase populates from `service.production.doneBy` + `doneDate`.
3. **Gantt shows stacked member bars within a sequence container** — historical bars can overlap; projected bars are sequential. The container is a subtle background band that does not conflict with vertical alignment.
4. **Burndown and Assignments panel handle sequences only** — no duplicate rows, no individual sequence members shown outside their sequence context.
5. **Burndown table shows all available `PoolDaySnapshot` fields**.

---

## 3. Unified Sequence Model (Key Architectural Decision)

### 3.1 Standalones become sequences of 1

In `selectPaceEngineInputs` (or a new `selectNormalizedSequences` selector), every `AssignmentGroup` that is NOT already in a user-created `GroupSequence` is wrapped in a synthetic `GroupSequence`:

```typescript
const syntheticSequence: GroupSequence = {
  sequenceId: group.groupId + "-seq",
  label: group.label,
  groupIds: [group.groupId],
};
```

The `inputs.sequences` array passed to the engine always contains ALL groups — some as multi-member sequences, some as synthetic single-member sequences.

### 3.2 Benefits

- The engine operates uniformly on `SequenceResult[]` — no `standaloneGroups` partition needed
- `GroupSequenceClassifier` simplifies: `isInSequence` is always true; `isOnlyMember` replaces `isStandalone`
- `PaceEngineResult` has one collection: `sequenceResults: SequenceResult[]`
- Selectors, Gantt, Burndown, Assignments all iterate `sequenceResults` uniformly
- The cascade logic already handles 1-element sequences correctly (inner loop never executes for length 1)

### 3.3 UI distinction

The Assignments panel distinguishes user-created sequences (multi-member) from synthetic single-member sequences by checking `sequence.groupIds.length === 1`. Single-member sequences are shown in the Groups panel; multi-member sequences are shown in the Sequences panel.

---

## 4. Type Changes

### 4.1 `PoolDaySnapshot` — add per-employee breakdown

```typescript
export type PoolDaySnapshotEmployeeBreakdown = {
  employeeId: string;
  priceCompleted: number;
  priceForecasted: number;
};

export type PoolDaySnapshot = {
  date: string;
  completed: number;
  remaining: number;
  priceCompleted: number;
  priceForecasted: number;
  employeesWorking: string[];
  percentCompleted: number;
  /**
   * Per-employee breakdown for this day.
   * Future phase: populated from simulation drain (which employee drained what).
   * Past phase: populated from service.production.doneBy + doneDate.
   */
  employeeBreakdowns: PoolDaySnapshotEmployeeBreakdown[];
};
```

### 4.2 `PaceEngineResult` — sequences only

```typescript
export type PaceEngineResult = {
  /** All sequence results — includes synthetic single-member sequences for standalone groups. */
  sequenceResults: SequenceResult[];
  /** Map<sequenceId, SequenceResult> for O(1) lookup. */
  sequenceResultMap: Map<string, SequenceResult>;
  /** Map<groupId, GroupResult> for O(1) lookup — all groups including sequence members. */
  groupMap: Map<string, GroupResult>;
  employeeTimeline: Map<string, { date: string; event: EmployeeTimelineEvent }[]>;
  urgentGroups: UrgentGroup[];
  mainDate: string;
  seasonStart: string;
  seasonEnd: string;
};
```

### 4.3 New `SequenceResult` type

```typescript
export type SequenceResult = {
  sequenceId: string;
  label: string;
  /** True when this sequence was auto-generated for a standalone group (groupIds.length === 1). */
  isSynthetic: boolean;
  /** Ordered member GroupResults — index 0 opens first. */
  members: GroupResult[];
  /** Merged pool history across all members (summed by date). */
  poolHistory: PoolDaySnapshot[];
  /** Earliest plannedStart across all members. */
  plannedStart: string | null;
  /** Latest plannedEnd across all members. */
  plannedEnd: string | null;
  /** Earliest projectedStartDate across members with work. */
  projectedStartDate: string | null;
  /** Latest projectedEndDate across all members. */
  projectedEndDate: string | null;
  /** Sum of totalPool across all members. */
  totalPool: number;
  /** True if any member has work remaining. */
  hasWork: boolean;
  /** True if any member is overdue. */
  isOverdue: boolean;
};
```

---

## 5. Engine Changes

### 5.1 `selectPaceEngineInputs` — inject synthetic sequences

After loading `sequences` from Redux, wrap any group not already in a sequence:

```typescript
const sequencedGroupIds = new Set(sequences.flatMap((s) => s.groupIds));
const syntheticSequences: GroupSequence[] = groups
  .filter((g) => !sequencedGroupIds.has(g.groupId))
  .map((g) => ({
    sequenceId: g.groupId + "-seq",
    label: g.label,
    groupIds: [g.groupId],
  }));
const normalizedSequences = [...sequences, ...syntheticSequences];
```

`inputs.sequences` is always the normalized array.

### 5.2 `assembleGroupResults.ts` — build `SequenceResult[]`

After building `GroupResult[]` for all groups:

1. Build `SequenceResult[]` by iterating `inputs.sequences` (already normalized)
2. For each sequence, resolve member `GroupResult`s in order, merge pool histories
3. Compute `plannedStart`, `plannedEnd`, `projectedStartDate`, `projectedEndDate`, `totalPool`, `hasWork`, `isOverdue` from members
4. Set `isSynthetic = sequence.groupIds.length === 1`
5. Return `PaceEngineResult` with `sequenceResults`, `sequenceResultMap`, `groupMap`

The `mergePoolHistories` logic moves from `burndownSelect.ts` into `assembleGroupResults.ts`.

### 5.3 `crawlFuturePhase.ts` — fix cascade ordering + populate `employeeBreakdowns`

**Cascade ordering fix** — move `resolveSequenceCascade` BEFORE `activeGroupIds` build:

```
Current (wrong):
  1. Build activeGroupIds (stale lock state)
  2. resolveSequenceCascade (updates locks)
  3. Employee work loop
  4. Snapshot loop (uses stale activeGroupIds)

Correct:
  1. resolveSequenceCascade (update locks first)
  2. Build activeGroupIds (reflects current lock state)
  3. Employee work loop
  4. Snapshot loop
```

**`employeeBreakdowns` in future snapshots** — accumulate per-employee drain in `dailyGroupStats`:

```typescript
type DailyGroupStat = {
  priceCompleted: number;
  priceForecasted: number;
  employeesWorking: string[];
  employeeBreakdowns: PoolDaySnapshotEmployeeBreakdown[];
};
```

When an employee drains a group, push `{ employeeId, priceCompleted: drained, priceForecasted: goalRate }` to `employeeBreakdowns`.

### 5.4 `crawlPastPhase.ts` — populate `employeeBreakdowns` from `doneBy`

In `buildPastPoolHistory`, when building the `byDate` map, also build a `breakdownsByDate` map:

```typescript
// For each service with doneDate <= mainDate and doneBy set:
const breakdown = { employeeId: service.production.doneBy, priceCompleted: service.price, priceForecasted: 0 };
breakdownsByDate.get(date)?.push(breakdown) ?? breakdownsByDate.set(date, [breakdown]);
```

Include `employeeBreakdowns` in each past snapshot. Snapshots with no `doneBy` data get `[]`.

---

## 6. Selector Changes

### 6.1 `ganttSelect.ts`

- `ganttRows` reads from `sequenceResults` — one `GanttSequenceRow` per sequence
- `GanttSequenceRow` contains `members: GanttRow[]` (one per member group) plus sequence-level metadata
- The Gantt renders sequence containers with stacked member bars inside

### 6.2 `burndownSelect.ts`

- `burndownSeries` reads from `sequenceResults` only — no separate group series
- `isSynthetic` sequences are labeled by their group label (no "seq" badge)
- Remove `mergePoolHistories` — `SequenceResult.poolHistory` is already merged by the engine
- `BurndownSeries` gains all `PoolDaySnapshot` fields for the detail table

### 6.3 `paceAssignmentGroupSelect.ts`

- No change needed — the Assignments panel already reads from `paceAssignmentGroupSelect.groups`
- The Groups panel filters to groups where `sequenceIdByGroupId` has no entry (standalone) OR where the sequence is synthetic (`isSynthetic`)
- The Sequences panel shows only non-synthetic sequences

---

## 7. UI Changes

### 7.1 Gantt Page — Sequence Container with Stacked Bars

Each `GanttSequenceRow` renders:
- A **container div** with a subtle background (`bg-secondary/5` or `bg-accent/5`) spanning the full sequence window (from earliest `plannedStart` to latest `projectedEndDate`)
- Inside the container, each member group renders its own bar at the standard `ROW_HEIGHT`
- The container height = `members.length × (ROW_HEIGHT + GROUP_GAP)`
- The label column shows the sequence label at the top of the container; member labels are indented below
- For synthetic (single-member) sequences, the container background is omitted — renders identically to the current standalone group row

Historical bars can overlap (LR5 still running while LR6 opens). Projected bars are sequential by definition. Both are rendered at their correct date positions within the container.

### 7.2 Burndown Page

- Left panel: one entry per `SequenceResult` — synthetic sequences show group label without "seq" badge; multi-member sequences show sequence label with "seq" badge
- Detail table: show all `PoolDaySnapshot` fields — `date`, `completed`, `remaining`, `priceCompleted`, `priceForecasted`, `employeesWorking` (names resolved), `percentCompleted`, `phase`
- For multi-member sequences: show per-member contribution breakdown using `employeeBreakdowns`

### 7.3 Assignments Page — Groups Panel

`PaceAssignmentGroupManager` shows groups where the sequence is synthetic (`isSynthetic === true`). Groups in multi-member sequences are shown only in the Sequences panel. This is determined by checking `sequenceIdByGroupId` and whether the sequence has `isSynthetic`.

---

## 8. Implementation Order

1. **Fix cascade ordering bug** — move `resolveSequenceCascade` before `activeGroupIds` build in `crawlFuturePhase.ts` (block reorder, no type changes)
2. **Add `employeeBreakdowns` to `PoolDaySnapshot`** — type change; update past phase (`doneBy`) and future phase (simulation drain); update all snapshot construction sites to include `employeeBreakdowns: []` or populated array
3. **Add `SequenceResult` type to `PaceEngineTypes.ts`** and update `PaceEngineResult`
4. **Inject synthetic sequences in `selectPaceEngineInputs`**
5. **Update `assembleGroupResults.ts`** — build `sequenceResults`, `sequenceResultMap`; move `mergePoolHistories` here
6. **Update `GroupSequenceClassifier`** — simplify predicates for unified model
7. **Update `ganttSelect.ts`** — produce `GanttSequenceRow[]`
8. **Update `burndownSelect.ts`** — read from `sequenceResults`, remove `mergePoolHistories`
9. **Update UI** — Gantt (sequence containers + stacked bars), Burndown (full snapshot fields), Assignments panel (filter by `isSynthetic`)

Steps 1 and 2 are independent and can be done immediately. Steps 3–9 are a coordinated refactor that must be done together.

---

## 9. Resolved Decisions

| Decision | Resolution |
|---|---|
| Gantt sequence visual | Stacked member bars inside a subtle background container. Historical bars can overlap; projected bars are sequential. Container background omitted for synthetic (single-member) sequences. |
| Standalone vs sequence distinction | All groups wrapped as sequences at input layer. Standalones become synthetic sequences of 1. Engine operates on `SequenceResult[]` only. |
| Past `employeeBreakdowns` | Populated from `service.production.doneBy` + `doneDate` in `crawlPastPhase`. |
| `groups` field on `PaceEngineResult` | Removed. Replaced by `sequenceResults` + `groupMap`. |
| Urgency | At the sequence level — a sequence is urgent if any member is overdue. |
