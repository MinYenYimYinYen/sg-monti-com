# CrawlerDay Plan

## Required Reading

Before implementing any part of this plan, read the following files in full:

| File | Why |
|---|---|
| `src/app/pace/CrawlerDay.ts` | The new canonical crawl output type being defined |
| `src/app/pace/PaceEngineTypes.ts` | All existing engine types — understand what gets replaced vs. kept |
| `src/app/pace/lib/PaceEngineInputs.ts` | How inputs are assembled; synthetic sequence injection |
| `src/app/pace/lib/assembleGroupResults/assembleGroupResults.ts` | Where `GroupResult[]`, `SequenceResult[]`, and `PaceEngineResult` are built — this is where `crawlerDays` will be assembled |
| `src/app/pace/lib/crawlPastPhase/crawlPastPhase.ts` | Past phase — `breakdownsByGroupByDate` is already computed here; `CrawlerDay` entries for past days come from this data |
| `src/app/pace/lib/crawlFuturePhase/crawlFuturePhase.ts` | Future phase — `dailyGroupStats` is already computed here; `CrawlerDay` entries for future days come from this data |
| `src/app/pace/lib/crawlFuturePhase/helpers/resolveSequenceCascade.ts` | Cascade logic — explains why group pools restart and why the burndown "jumps" |
| `src/app/pace/burndownSelect.ts` | First downstream consumer to migrate to `CrawlerDayUtils` |
| `src/app/pace/ganttSelect.ts` | Second downstream consumer to migrate |
| `src/app/pace/burndown/_components/SeriesDetail.tsx` | The UI that currently shows the confusing merged pool history |

---

## 1. Problem Statement

### 1.1 The Merged Pool History Problem

`PoolDaySnapshot` is recorded per group and then merged across sequence members by `mergePoolHistories` in `assembleGroupResults.ts`. This merge sums `completed` and `remaining` across all groups in a sequence for each date.

The result is **mathematically correct but semantically broken**:

- When LR5 finishes and LR6 cascades open, the merged sequence's `completed` drops and `remaining` jumps — because LR6's pool is added to the sequence total at the cascade date.
- A user viewing the burndown table sees `$157,606 completed → $12,550 completed` on the next row with no explanation.
- Downstream selectors have no way to know *why* the numbers changed — they only see the merged totals.

### 1.2 The Missing Hierarchy

The crawl engine operates at the level of `day → group → employee`. The current `PoolDaySnapshot` collapses this to `day → totals`, losing the group and employee layers. This makes it impossible to answer:

- "Which group was being worked on 10/14?"
- "Which employees worked LR5 vs. LR6 on the same day?"
- "When did the cascade from LR5 to LR6 fire, and how much pool was carried forward?"

### 1.3 The Fabrication Risk

The user's initial `CrawlerDay` sketch included a `servCodes` layer with per-day drain data. The future phase does **not** track per-servCode drain — it drains the group pool as a whole. Adding a `servCodes` layer in the future phase would require fabricating an allocation (e.g., proportional by price), which would be misleading. The past phase *does* have per-service completion data (via `doneDate`), but for consistency the `servCodes` layer is kept as **static membership metadata** on `GroupResult`, not as per-day drain data in `CrawlerDay`.

---

## 2. Goals

1. **`CrawlerDay[]` becomes the canonical crawl output** — a faithful, hierarchical record of what the engine did on each day, at the `day → group → employee` granularity.
2. **`CrawlerDayUtils`** provides all aggregation, pivoting, and filtering operations so selectors and components never re-implement crawl logic.
3. **Non-destructive migration** — `crawlerDays: CrawlerDay[]` is added to `PaceEngineResult` alongside existing fields. Old consumers continue working. New consumers read from `CrawlerDay[]` via `CrawlerDayUtils`. Unused fields are removed in a later cleanup pass.
4. **Burndown `SeriesDetail`** becomes the first consumer to demonstrate the new hierarchy — showing per-group breakdown within a sequence day, explaining cascade transitions.
5. **Long-term**: `poolHistory` on `GroupResult` and `SequenceResult` is removed once all consumers are migrated.

---

## 3. Type Design

### 3.1 Why No ServCode Layer in `CrawlerDay`

The engine assigns employees to **groups**, not to individual servCodes. A group's pool is the sum of its servCodes' service prices, but the drain is tracked at the group level. The future phase has no per-servCode drain data — only the group total. Adding a `servCodes` layer would require fabricating an allocation that the engine never computed.

ServCode membership is available as static metadata on `GroupResult.memberServCodeIds` and `MemberResult`. That is the correct place for it.

The current `CrawlerDay.ts` draft includes a `servCodes` array — **this should be removed**. The `isFinished`, `isOverdue`, `isTrendingEarly`, `isTrendingLate` flags belong on `GroupResult` (summary level), not on a per-day per-servCode basis.

### 3.2 The Correct Hierarchy

```
CrawlerDay                          ← one per crawl day
  └── groups: CrawlerDayGroup[]     ← one per AssignmentGroup active that day
        └── employees: CrawlerDayEmployee[]  ← one per employee who worked that group
```

The sequence layer is **implicit** — derived by grouping `CrawlerDay.groups` by `sequenceId`. This avoids nesting sequences inside days (a day can have multiple sequences active simultaneously, and a sequence can span many days).

### 3.3 Final Type Definitions

```typescript
// src/app/pace/CrawlerDay.ts

/** Which phase of the crawl produced this day's snapshot. */
export type CrawlerDayPhase = "past" | "present" | "future";

/**
 * One employee's contribution to a group on a single crawl day.
 * Past phase: priceCompleted from service.production.doneBys; priceForecasted = 0.
 * Future phase: priceCompleted = drained amount; priceForecasted = goalDailyPrice.
 */
export type CrawlerDayEmployee = {
  employeeId: string;
  /** $ drained from this group's pool by this employee on this day. */
  priceCompleted: number;
  /** This employee's goalDailyPrice for this group (0 in past phase). */
  priceForecasted: number;
};

/**
 * One group's state on a single crawl day.
 * Only groups with active pool on this day are included (locked groups excluded).
 */
export type CrawlerDayGroup = {
  groupId: string;
  label: string;
  /** The user-created sequence this group belongs to. null for synthetic single-member sequences. */
  sequenceId: string | null;
  /** Cumulative $ completed across all past days including this one. */
  poolCompletedSoFar: number;
  /** Active pool remaining after this day's drain. */
  poolRemaining: number;
  /** $ completed on this specific day (sum of employee contributions). */
  priceCompleted: number;
  /** $ forecasted for this day (sum of employee goalRates). */
  priceForecasted: number;
  /** poolCompletedSoFar / totalPool. */
  percentCompleted: number;
  /** Total pool at season start (static — does not change day to day). */
  totalPool: number;
  /**
   * True if a cascade fired on this day — this group's remaining pool was
   * carried forward into its successor. Only set on the predecessor group.
   */
  cascadedToSuccessor: boolean;
  /** Employees who worked this group on this day. */
  employees: CrawlerDayEmployee[];
};

/**
 * The canonical crawl output for a single day.
 * Replaces PoolDaySnapshot as the authoritative per-day record.
 *
 * Past phase: one CrawlerDay per production day (days with actual work).
 * Present: one CrawlerDay for mainDate (the handoff point).
 * Future phase: one CrawlerDay per simulated weekday until all pools drain.
 */
export type CrawlerDay = {
  /** ISO date string. */
  date: string;
  /** Which phase of the crawl produced this snapshot. */
  phase: CrawlerDayPhase;
  /** All groups that had active pool on this day (locked groups excluded). */
  groups: CrawlerDayGroup[];
};
```

### 3.4 `CrawlerDayUtils` — The Query Interface

```typescript
// src/app/pace/crawlerDayUtils.ts

export const CrawlerDayUtils = {
  // --- Filtering ---
  pastDays(days: CrawlerDay[], mainDate: string): CrawlerDay[]
  futureDays(days: CrawlerDay[], mainDate: string): CrawlerDay[]
  daysForGroup(days: CrawlerDay[], groupId: string): CrawlerDay[]
  daysForSequence(days: CrawlerDay[], sequenceId: string): CrawlerDay[]

  // --- Pivoting ---
  /** Map<groupId, CrawlerDay[]> — only days where that group appears. */
  byGroup(days: CrawlerDay[]): Map<string, CrawlerDay[]>
  /** Map<sequenceId, CrawlerDay[]> — days where any member of the sequence appears. */
  bySequence(days: CrawlerDay[]): Map<string, CrawlerDay[]>
  /** Map<employeeId, { day: CrawlerDay; group: CrawlerDayGroup }[]> */
  byEmployee(days: CrawlerDay[]): Map<string, { day: CrawlerDay; group: CrawlerDayGroup }[]>

  // --- Aggregation (backward-compat bridge) ---
  /**
   * Produces a PoolDaySnapshot[] for a single group — for backward compatibility
   * with existing consumers that read GroupResult.poolHistory.
   */
  groupPoolHistory(days: CrawlerDay[], groupId: string): PoolDaySnapshot[]

  /**
   * Produces a merged PoolDaySnapshot[] for a sequence — replaces mergePoolHistories.
   * Groups within the sequence are shown as separate sub-entries per day,
   * so the "completed restarts" problem is visible and explainable.
   */
  sequencePoolHistory(days: CrawlerDay[], sequenceId: string): PoolDaySnapshot[]
};
```

---

## 4. Engine Changes

### 4.1 What the Past Phase Already Has

`crawlPastPhase.ts` already computes `breakdownsByGroupByDate`:

```
Map<groupId, Map<date, PoolDaySnapshotEmployeeBreakdown[]>>
```

This is exactly the data needed to build `CrawlerDay` entries for past days. The past phase needs to **return** this map so `assembleGroupResults` can use it.

Currently `breakdownsByGroupByDate` is local to `crawlPastPhase` and only used to populate `employeeBreakdowns` on `PoolDaySnapshot`. It needs to be added to `PastPhaseState`.

### 4.2 What the Future Phase Already Has

`crawlFuturePhase.ts` already computes `dailyGroupStats` per day:

```typescript
Map<groupId, {
  priceCompleted: number;
  priceForecasted: number;
  employeesWorking: string[];
  employeeBreakdowns: PoolDaySnapshotEmployeeBreakdown[];
}>
```

This is exactly the data needed to build `CrawlerDay` entries for future days. The future phase needs to **accumulate** these into a `CrawlerDay[]` and return it.

### 4.3 `PastPhaseState` — Add `breakdownsByGroupByDate`

```typescript
export type PastPhaseState = {
  poolStates: Map<string, GroupPoolState>;
  servCodeToGroupId: Map<string, string>;
  groupProductionStats: Map<string, GroupProductionStats>;
  /** NEW: per-group, per-date employee breakdowns for CrawlerDay construction. */
  breakdownsByGroupByDate: Map<string, Map<string, PoolDaySnapshotEmployeeBreakdown[]>>;
};
```

### 4.4 `FuturePhaseState` — Add `crawlerDays`

```typescript
export type FuturePhaseState = {
  poolStates: Map<string, GroupPoolState>;
  servCodeToGroupId: Map<string, string>;
  employeeTimeline: Map<string, { date: string; event: EmployeeTimelineEvent }[]>;
  crewTimelines: Map<string, ServCodeTimelineEvent[]>;
  groupProductionStats: Map<string, GroupProductionStats>;
  /** NEW: ordered CrawlerDay[] for future days (mainDate+1 onward). */
  crawlerDays: CrawlerDay[];
};
```

### 4.5 `assembleGroupResults.ts` — Build `crawlerDays` and Add to `PaceEngineResult`

After building `GroupResult[]` and `SequenceResult[]`:

1. Build past `CrawlerDay[]` from `pastState.breakdownsByGroupByDate` + `poolStates`
2. Build present `CrawlerDay` (mainDate handoff) from `poolStates`
3. Concatenate with `futureState.crawlerDays`
4. Sort by date
5. Add `crawlerDays` to `PaceEngineResult`

### 4.6 `PaceEngineResult` — Add `crawlerDays`

```typescript
export type PaceEngineResult = {
  sequenceResults: SequenceResult[];
  sequenceResultMap: Map<string, SequenceResult>;
  groupMap: Map<string, GroupResult>;
  employeeTimeline: Map<string, { date: string; event: EmployeeTimelineEvent }[]>;
  urgentGroups: UrgentGroup[];
  mainDate: string;
  seasonStart: string;
  seasonEnd: string;
  /** NEW: canonical per-day crawl output. Primary source for burndown, gantt, and timeline consumers. */
  crawlerDays: CrawlerDay[];
};
```

---

## 5. `CrawlerDayUtils` Implementation

### 5.1 File Location

`src/app/pace/crawlerDayUtils.ts`

### 5.2 Key Methods

**`groupPoolHistory(days, groupId)`** — backward-compat bridge:
- Filter days to those containing `groupId`
- Map each day to a `PoolDaySnapshot` using the group's fields
- Returns the same shape as the old `GroupResult.poolHistory`

**`sequencePoolHistory(days, sequenceId)`** — replaces `mergePoolHistories`:
- Filter days to those containing any group with `sequenceId`
- For each day, sum across all matching groups
- Correctly handles cascade transitions — the sum naturally reflects which groups are active

**`byGroup(days)`** — pivot for per-group consumers:
- Returns `Map<groupId, CrawlerDay[]>` where each entry only contains days that group appears in

**`bySequence(days)`** — pivot for per-sequence consumers:
- Returns `Map<sequenceId, CrawlerDay[]>` where each entry contains days any member appears in

---

## 6. Selector Changes

### 6.1 `burndownSelect.ts`

Replace `sequence.poolHistory` with `CrawlerDayUtils.sequencePoolHistory(crawlerDays, sequence.sequenceId)`.

This fixes the "completed restarts" problem — the merged history now correctly reflects which groups were active on each day, and cascade transitions are visible.

### 6.2 `ganttSelect.ts`

No immediate change needed — `GanttGroupRow` reads `group.poolHistory` which is still populated on `GroupResult`. Migrate in a later pass once `CrawlerDayUtils.groupPoolHistory` is available.

### 6.3 `paceEngineSelect.ts`

Pass `crawlerDays` through from `PaceEngineResult` so downstream selectors can access it.

---

## 7. UI Changes

### 7.1 `SeriesDetail.tsx` — Hierarchical Burndown Table

The current flat table (`date | completed | remaining | day$ | forecast$ | % | crew | phase`) is replaced with a hierarchical view:

**For synthetic (single-group) sequences**: same flat table as today — no change visible to user.

**For multi-member sequences**: each day row is expandable. Expanding shows per-group sub-rows:

```
Date        | Completed | Remaining | Day $   | Forecast $ | %   | Phase
10/13       | $169,513  | $28,888   | $12,600 | $12,600    | 85% | projected
  ↳ LR5     | $157,606  | $0        | $0      | $0         | 100%| (finished)
  ↳ LR6     | $11,907   | $28,888   | $12,600 | $12,600    | 29% |
10/14 ⚡    | $12,550   | $145,056  | $12,550 | $12,550    | 8%  | projected
  ↳ LR5     | $157,606  | $0        | $0      | $0         | 100%| cascade →
  ↳ LR6     | $12,550   | $145,056  | $12,550 | $12,550    | 8%  |
```

The `⚡` icon on 10/14 indicates a cascade fired that day. The sub-row for LR5 shows `cascade →` to explain why LR6's pool jumped.

This directly addresses the user's observation: "combining pool histories results in price totals that don't make sense on their own."

---

## 8. Implementation Order

1. **Finalize `CrawlerDay.ts`** — remove `servCodes` array; use the type definitions from §3.3
2. **Update `PastPhaseState`** — add `breakdownsByGroupByDate` to the return value of `crawlPastPhase`
3. **Update `FuturePhaseState`** — accumulate `crawlerDays: CrawlerDay[]` during the future phase loop
4. **Update `assembleGroupResults.ts`** — build past + present `CrawlerDay[]`, merge with future, add to `PaceEngineResult`
5. **Create `crawlerDayUtils.ts`** — implement `groupPoolHistory`, `sequencePoolHistory`, `byGroup`, `bySequence`, `byEmployee`
6. **Update `paceEngineSelect.ts`** — expose `crawlerDays` from engine result
7. **Update `burndownSelect.ts`** — use `CrawlerDayUtils.sequencePoolHistory` instead of `sequence.poolHistory`
8. **Update `SeriesDetail.tsx`** — hierarchical table with per-group sub-rows and cascade indicators

Steps 1–5 are the engine layer (no UI impact). Steps 6–8 are the consumer layer. Steps 1–5 can be done and verified independently before touching the UI.

---

## 9. Migration Strategy (Non-Destructive)

The migration is additive:

| Phase | Action |
|---|---|
| **Now** | Add `crawlerDays` to `PaceEngineResult`. Old `poolHistory` fields remain on `GroupResult`/`SequenceResult`. |
| **Consumer migration** | Each selector/component is migrated one at a time to read from `CrawlerDayUtils`. |
| **Cleanup** | Once all consumers are migrated, remove `poolHistory` from `GroupResult` and `SequenceResult`. |
| **Type cleanup** | Remove `PoolDaySnapshotEmployeeBreakdown` and `PoolDaySnapshot` from `PaceEngineTypes.ts` (they become internal to `CrawlerDayUtils`'s backward-compat bridge). |

At no point does a consumer break — old fields remain until explicitly removed.

---

## 10. Resolved Decisions

| Decision | Resolution |
|---|---|
| ServCode layer in `CrawlerDay` | **Omitted.** Future phase doesn't track per-servCode drain. ServCode membership stays as static metadata on `GroupResult.memberServCodeIds`. |
| Sequence layer in `CrawlerDay` | **Implicit** — derived by grouping `groups` by `sequenceId`. Not nested. |
| `phase` field values | `"past"` for `date < mainDate`, `"present"` for `date === mainDate`, `"future"` for `date > mainDate`. |
| `cascadedToSuccessor` flag | On `CrawlerDayGroup` — set when `resolveSequenceCascade` fires for this group on this day. Enables UI to show cascade indicators. |
| `mergePoolHistories` fate | Replaced by `CrawlerDayUtils.sequencePoolHistory`. The function in `assembleGroupResults.ts` is removed once `burndownSelect` is migrated. |
| `PoolDaySnapshot` fate | Kept as a backward-compat output type from `CrawlerDayUtils` bridge methods. Removed from `PaceEngineTypes.ts` in the final cleanup pass. |
