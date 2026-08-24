# Assignment Group Plan — Unified Group Model

**Status**: Planning
**Supersedes**: Previous "Named Shared Groups (Option A)" plan

---

## Overview

This plan addresses three compounding problems with the current per-employee group system:

1. **Incorrect projected end dates** — different employees declare different group memberships for the same servCodes, causing the crawl to use different timeline keys and undercount the combined drain rate.
2. **Broken Gantt display** — `GanttChartPanel` picks the first group label it encounters per servCode, making other employees' drain invisible.
3. **Incorrect drain distribution within groups** — the current proportional-by-pool-size drain ignores individual member deadlines, causing front-loaded members (e.g., SE3 ending 9/1 grouped with CC3 ending 9/30) to drain too slowly.

The solution has four integrated parts:

- **New `assignmentGroup` data module** — scenario-level group definitions stored in their own MongoDB collection
- **Unified group model in the crawler** — every assignment entry is treated as a group (single-member groups for solo servCodes), eliminating the `single` / `group` code split
- **Urgency-weighted drain** — drain is distributed by `pool / remainingWeekdays` per member, not by pool size
- **Employee Card group rows** — group header + expandable member sub-rows, each with its own required rate and deadline

---

## Part 1 — New `assignmentGroup` Data Module

### Why a Separate Module

The existing `assignmentPlan` module stores `Scenario` documents with embedded `AssignmentPlan[]`. We do **not** migrate this data. Instead, `AssignmentGroup` documents live in their own MongoDB collection. The paceCrawler selectors resolve group entries by looking up the matching `AssignmentGroup` — if a match exists, use the shared `groupId`; if not (old data), fall back to the current normalized label.

This means:
- Existing stored data keeps working without any migration
- New groups created via the Group Manager automatically get the correct shared `groupId`
- The two modules have clean separation of responsibility

### File Structure

```
src/app/assignmentGroup/
  AssignmentGroupTypes.ts         ← AssignmentGroup type
  AssignmentGroupModel.ts         ← Mongoose model ("AssignmentGroup" collection)
  assignmentGroupSlice.ts         ← Redux slice + thunks
  assignmentGroupSelect.ts        ← Selectors (groupMap, etc.)
  useAssignmentGroup.ts           ← Hook (autoLoad)
  api/
    AssignmentGroupContract.ts    ← API contract
    route.ts                      ← Next.js API route
  _components/
    AssignmentGroupManager.tsx    ← CRUD UI (used in paceCrawler Assignments tab)
```

### Types

```typescript
// AssignmentGroupTypes.ts

/**
 * A named group of servCodes that are always worked together on the same day.
 * Groups are scenario-level entities — all employees who work this group reference
 * the same groupId. This ensures the crawl uses a single timeline key and the
 * Gantt renders one bar per group regardless of how many employees work it.
 */
export type AssignmentGroup = {
  /** Stable natural key. Auto-generated as sorted servCodeIds joined with "+". */
  groupId: string;
  /** Display label. Defaults to groupId. Can be customized (e.g. "Renovation Bundle"). */
  label: string;
  /** The servCodes that are always worked together. */
  servCodeIds: string[];
};
```

### MongoDB Schema

```typescript
// AssignmentGroupModel.ts
const AssignmentGroupSchema = new Schema({
  groupId: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  servCodeIds: { type: [String], required: true },
});

export const AssignmentGroupModel = createModel("AssignmentGroup", AssignmentGroupSchema);
```

### API Contract

```typescript
// AssignmentGroupContract.ts
export interface AssignmentGroupContract extends ApiContract {
  getGroups: {
    params: {};
    result: DataResponse<AssignmentGroup[]>;
  };
  upsertGroup: {
    params: AssignmentGroup;
    result: DataResponse<AssignmentGroup>;
  };
  deleteGroup: {
    params: { groupId: string };
    result: DataResponse<{ groupId: string }>;
  };
}
```

Roles: `["admin", "office"]` for upsert/delete; `["admin", "office", "tech"]` for getGroups.

### Redux Slice

```typescript
// assignmentGroupSlice.ts
type AssignmentGroupState = {
  groups: AssignmentGroup[];
};
```

Standard `createStandardThunk` pattern. `extraReducers` handles:
- `getGroups.fulfilled` → replace `groups`
- `upsertGroup.fulfilled` → upsert by `groupId`
- `deleteGroup.fulfilled` → remove by `groupId`

### Selectors

```typescript
// assignmentGroupSelect.ts

/** Map<groupId, AssignmentGroup> for O(1) lookups */
const selectGroupMap = createSelector(
  [selectGroups],
  (groups): Map<string, AssignmentGroup> =>
    new Grouper(groups).toUniqueMap((g) => g.groupId),
);

/**
 * Map<sortedServCodeKey, AssignmentGroup> — used to resolve old-format
 * AssignmentGroupEntry (inline servCodeIds) to the shared group.
 * Key = [...servCodeIds].sort().join("+")
 */
const selectGroupByServCodeKey = createSelector(
  [selectGroups],
  (groups): Map<string, AssignmentGroup> => {
    const result = new Map<string, AssignmentGroup>();
    for (const group of groups) {
      const key = [...group.servCodeIds].sort().join("+");
      result.set(key, group);
    }
    return result;
  },
);
```

### Hook

```typescript
// useAssignmentGroup.ts
export function useAssignmentGroup({ autoLoad }: { autoLoad?: boolean } = {}) {
  // dispatches getGroups on mount when autoLoad is true
  // exposes: upsertGroup(group), deleteGroup(groupId)
}
```

### `usePaceCrawlerDeps.ts` Update

Add `useAssignmentGroup({ autoLoad: true })` so group data is always available in the paceCrawler context.

---

## Part 2 — Unified Group Model in the Crawler

### The Core Insight

Every assignment entry — whether a single servCode or a multi-member group — is treated as a group in the crawl. Single servCodes become single-member groups. This eliminates the `kind: "single" | "group"` code split in `dayCrawlSimulation.ts` and makes the logic uniform.

### Updated `DayCrawlPriorityEntry` Type

```typescript
// PaceCrawlerTypes.ts — replaces DayCrawlSingleEntry + DayCrawlGroupEntry

/**
 * A priority entry in an employee's assignment plan.
 * Always a group — single servCodes are wrapped as single-member groups.
 * This eliminates the single/group code split in the simulation.
 */
export type DayCrawlPriorityEntry = {
  /** Stable timeline key. For shared groups: AssignmentGroup.groupId. For singles: servCodeId. */
  groupId: string;
  /** Display label. For shared groups: AssignmentGroup.label. For singles: servCodeId. */
  label: string;
  /** One or more member servCodes. */
  servCodeIds: string[];
};
```

`DayCrawlSingleEntry` and `DayCrawlGroupEntry` are removed.

### Resolution Logic in `selectCrawlerResult`

When building `DayCrawlPriorityEntry[]` from `assignmentPlan.entries`:

```typescript
// In paceCrawlerSelect.ts — selectCrawlerResult

for (const entry of plan.entries) {
  if (entry.kind === "single") {
    // Wrap single as a single-member group
    priorityEntries.push({
      groupId: entry.servCodeId,
      label: entry.servCodeId,
      servCodeIds: [entry.servCodeId],
    });
  } else {
    // Resolve to shared group if one exists; fall back to normalized label
    const sortedKey = [...entry.servCodeIds].sort().join("+");
    const sharedGroup = groupByServCodeKey.get(sortedKey);
    priorityEntries.push({
      groupId: sharedGroup?.groupId ?? sortedKey,
      label: sharedGroup?.label ?? sortedKey,
      servCodeIds: entry.servCodeIds,
    });
  }
}
```

**Key invariant**: All employees who reference the same `AssignmentGroup` will produce the same `groupId` in their `DayCrawlPriorityEntry`. The crawl's `servCodeTimeline` will have exactly one entry per group, aggregating all employees' events under the same key.

### `selectGroupMap` Addition to `paceCrawlerSelect`

```typescript
// In paceCrawlerSelect.ts — new input selector
const selectGroupByServCodeKey = (state: AppState) =>
  assignmentGroupSelect.groupByServCodeKey(state);
```

This is passed into `selectCrawlerResult` as an additional input.

---

## Part 3 — Urgency-Weighted Drain

### The Problem with Pool-Proportional Drain

Current formula:
```
memberDrain = actualDrain × (memberPool / totalPool)
```

This ignores deadlines. A member with a large pool but a tight deadline gets the same proportional drain as a member with a large pool and a distant deadline.

**Real-world example**:
- CC3: $42,000 pool, ends 9/30 (35 weekdays) → required $1,200/day
- SE3: $4,500 pool, ends 9/1 (8 weekdays) → required $562/day
- SC2: $4,500 pool, ends 9/1 (8 weekdays) → required $562/day

With pool-proportional drain (totalAvgDailyPrice = $2,800):
- CC3 gets 82% → $2,296/day (way more than needed)
- SE3 gets 9% → $252/day (less than half of what's needed)
- SC2 gets 9% → $252/day (less than half of what's needed)

SE3 and SC2 will not finish by 9/1.

### New Formula — Urgency-Weighted Drain

```typescript
// In dayCrawlSimulation.ts — group drain section

// Compute urgency weight for each eligible member
const memberWeights: number[] = eligibleMemberIds.map((servCodeId) => {
  const pool = pools.get(servCodeId) ?? 0;
  const scMax = servCodeEntries.find(e => e.servCodeId === servCodeId)?.servCodeRangeMax ?? day;
  const remainingWeekdays = Math.max(1, dateRanges.weekdaysBetween(day, scMax));
  return pool / remainingWeekdays; // required daily rate = urgency weight
});

const totalWeight = memberWeights.reduce((sum, w) => sum + w, 0);

// Distribute actualDrain by urgency weight
for (let i = 0; i < eligibleMemberIds.length; i++) {
  const servCodeId = eligibleMemberIds[i];
  const memberPool = pools.get(servCodeId) ?? 0;
  const weight = totalWeight > 0
    ? memberWeights[i] / totalWeight
    : 1 / eligibleMemberIds.length; // equal split if all weights are zero
  const memberDrain = Math.min(memberPool, actualDrain * weight);
  pools.set(servCodeId, memberPool - memberDrain);
}
```

With urgency-weighted drain (same $2,800/day):
- CC3 weight: $42,000/35 = $1,200 → 52% → $1,456/day
- SE3 weight: $4,500/8 = $562 → 24% → $672/day
- SC2 weight: $4,500/8 = $562 → 24% → $672/day

SE3 drains in ~6.7 days (finishes before 9/1 ✓). CC3 drains in ~29 days (finishes ~9/28 ✓).

### Per-Member `projectedEndDate`

With urgency-weighted drain, each member drains at a different rate and finishes on a different day. The simulation records each member's individual `projectedEndDate` when its pool hits zero — exactly as it does today for single entries.

**No type change needed** — `CrawlerServCodeResult.projectedEndDate` is already per-servCode. The change is purely in the drain formula.

### "All Drained" Group Finish Event

The group `finishes` event in `servCodeTimeline` is recorded when **all** members have drained (the last member to finish). Individual member drain events are not recorded in the timeline — only the group-level finish. This keeps the timeline clean.

### Data Flow

```
dayCrawlSimulation.ts
  → per-member projectedEndDate in CrawlerResult.byServCode
  → CrawlerServCodeResult.optimizedMax = projectedEndDate (per member)

paceCrawlerSelect.selectSeasonOptimizerResult
  → SeasonOptimizedRange per servCode with its own optimizedMax

GanttChartPanel
  → each member's bar ends at its own optimizedMax (already works this way)
  → bars are per-servCode, so SE3 bar ends 9/1, CC3 bar ends 9/28

employeeCardSelect (DiffChecker D5)
  → per-member required rates: pool / weekdays_to_member_scMax
  → group header required = sum of per-member required rates
  → compare against totalAvgDailyPrice → behind/ahead signal

EmployeeCardPanel
  → group header: sum required vs totalAvgDailyPrice
  → member sub-rows: individual required rate + deadline
```

---

## Part 4 — Employee Card Group Rows

### New Types in `DiffCheckerTypes.ts`

```typescript
/**
 * One member servCode within an expanded group row.
 */
export type OpenGroupMemberRow = {
  servCodeId: string;
  poolRemaining: number;
  /** pool / weekdays_to_member_scMax */
  requiredDailyPrice: number;
  remainingWeekdays: number;
  /** This member's dateRange.max */
  scMax: string;
  isOverdue: boolean;
};

/**
 * A group entry on an employee's card — header + expandable members.
 */
export type OpenGroupRow = {
  kind: "group";
  groupId: string;
  label: string;
  servCodeIds: string[];
  combinedPool: number;
  /** Sum of per-member required rates (each member: pool / weekdays_to_member_scMax) */
  requiredDailyPrice: number;
  /** Employee's totalAvgDailyPrice — the actual drain rate for this group */
  historicalDailyPrice: number;
  diffPrice: number;
  diffPercent: number | null;
  /** Latest member dateRange.max — shown on the header as the group's window */
  latestScMax: string;
  latestRemainingWeekdays: number;
  /** True if ANY member is overdue */
  isOverdue: boolean;
  isAhead: boolean;
  isBehind: boolean;
  members: OpenGroupMemberRow[];
};
```

### Updated `EmployeeCardData`

```typescript
export type EmployeeCardData = {
  employee: Employee;
  isAlreadyRouted: boolean;
  isOnLeave: boolean;
  isHoliday: boolean;
  /** Priority-ordered open entries — singles or groups */
  openEntries: (OpenServCodeRow | OpenGroupRow)[];
  assignedServCodeIds: string[];
};
```

`openServCodes: OpenServCodeRow[]` is replaced by `openEntries`.

### `employeeCardSelect.ts` Changes

**Step D0**: `OpenServCodesForEmployee` gains an `openEntries: AssignmentEntry[]` field — the group-aware list of open entries (preserving group structure, filtered to entries with at least one open member).

**Step D5**: Build `openEntries: (OpenServCodeRow | OpenGroupRow)[]` from `openEntries`:
- `kind === "single"` → `OpenServCodeRow` (unchanged logic)
- `kind === "group"` → `OpenGroupRow`:
  - For each member with pool > 0: compute `requiredDailyPrice = memberPool / weekdays_to_member_scMax`
  - `combinedPool = sum(memberPools)`
  - `requiredDailyPrice = sum(memberRequiredRates)`
  - `historicalDailyPrice = totalAvgDailyPriceByEmployee.get(employeeId) ?? teamAvgTotalDailyPrice`
  - `latestScMax = max(member.dateRange.max)`
  - `latestRemainingWeekdays = weekdaysBetween(mainDate, latestScMax)`
  - `isOverdue = any member has remainingWeekdays <= 0`
  - `members = [OpenGroupMemberRow per member with pool > 0]`

### `EmployeeCardPanel.tsx` Changes

Replace `ServCodeRow` with two components:

**`SingleServCodeRow`** — identical to current `ServCodeRow` (renamed)

**`GroupEntryRow`** — new component with local expand/collapse state:

```
[▶] CC3+LA3+SC2+SE3  [group]
    $3,400/day req · hist: $2,800/day (+$600/+21%)  [behind]
    $58,998 left · ends 9/30 · 35d

  (when expanded:)
  ↳ CC3   $1,200/day req · $42,000 left · 9/30 (35d)
  ↳ LA3   $800/day req   · $8,000 left  · 9/30 (35d)
  ↳ SC2   $700/day req   · $4,500 left  · 9/1  (8d)  [behind]
  ↳ SE3   $700/day req   · $4,498 left  · 9/1  (8d)  [behind]
```

The `EmployeeCard` component maps `openEntries` and renders either `SingleServCodeRow` or `GroupEntryRow` based on the `kind` discriminant.

---

## Part 5 — Assignment Editor Redesign

### Why the Current Editor Becomes Obsolete

The current `AssignmentEditorPanel` lets each employee independently declare groups via "Make Group" / "Break Group" actions on inline `servCodeIds`. After the unified group model, groups are scenario-level entities managed in the `assignmentGroup` module. The editor needs to reflect this separation.

### New Two-Panel Layout

**Left panel — Group Manager** (scenario-level, reads from `assignmentGroupSelect`):
- List all `AssignmentGroup` documents with `groupId`, `label`, member servCodes
- "New Group" button → inline form: pick servCodes (grouped by progCode), set label
- Click a group → edit label, add/remove member servCodes
- Delete a group → removes from `assignmentGroup` collection; removes `groupId` references from employee plans (dispatches `reorderEntries` for affected employees)
- `groupId` is auto-generated as sorted servCodeIds joined with "+"

**Right panel — Employee Assignment** (per-employee, reads from `assignmentPlanSelect`):
- Employee selector (same as today — checkbox list, "Select Assigned" shortcut)
- For each selected employee: priority-ordered entry list
- Each entry is either:
  - A **single servCode** — shown as `servCodeId` with date range
  - A **group reference** — shown as `group.label` with "group" badge and member count
- "Add entry" → pick from:
  - Available singles (servCodes not yet assigned to this employee)
  - Available groups (groups not yet assigned to this employee)
- Reorder entries (up/down) as today
- Remove entry (X button) as today

### Priority Semantics

An employee's priority list is ordered by index. The crawl works the highest-priority eligible entry each day:

> A group entry is eligible if **any** member has actionable work (pool > 0) AND the day ≥ the group's effective open date.

So if Employee A has [Group 1, Group 2], Group 1 is worked first as long as any member of Group 1 has remaining pool. When Group 1 is fully drained, Group 2 becomes the active entry.

### Group Creation Flow

1. Click "New Group" in Group Manager
2. Multi-select servCodes (grouped by progCode, same picker as current "Add servCodes" section)
3. Optionally set a label (defaults to sorted servCodeIds joined with "+")
4. Dispatch `upsertGroup` → stored in `assignmentGroup` collection
5. Group now appears in the "Available groups" list in the Employee Assignment panel

### Files Changed

| File | Change |
|---|---|
| `src/app/assignmentGroup/AssignmentGroupTypes.ts` | New — `AssignmentGroup` type |
| `src/app/assignmentGroup/AssignmentGroupModel.ts` | New — Mongoose model |
| `src/app/assignmentGroup/assignmentGroupSlice.ts` | New — Redux slice + thunks |
| `src/app/assignmentGroup/assignmentGroupSelect.ts` | New — `groupMap`, `groupByServCodeKey` |
| `src/app/assignmentGroup/useAssignmentGroup.ts` | New — hook |
| `src/app/assignmentGroup/api/AssignmentGroupContract.ts` | New — API contract |
| `src/app/assignmentGroup/api/route.ts` | New — Next.js API route |
| `src/app/assignmentGroup/_components/AssignmentGroupManager.tsx` | New — Group Manager UI |
| `src/store/reducers/index.ts` | Add `assignmentGroup: assignmentGroupReducer` |
| `src/app/bizPlan/paceCrawler/usePaceCrawlerDeps.ts` | Add `useAssignmentGroup({ autoLoad: true })` |
| `src/app/bizPlan/paceCrawler/PaceCrawlerTypes.ts` | Replace `DayCrawlSingleEntry` + `DayCrawlGroupEntry` with unified `DayCrawlPriorityEntry` |
| `src/app/bizPlan/paceCrawler/paceCrawlerSelect.ts` | Add `groupByServCodeKey` input; update `selectCrawlerResult` resolution logic |
| `src/app/bizPlan/paceCrawler/_lib/dayCrawlSimulation.ts` | Urgency-weighted drain formula; unified group code path |
| `src/app/bizPlan/paceCrawler/_lib/diffChecker/DiffCheckerTypes.ts` | Add `OpenGroupMemberRow`, `OpenGroupRow`; update `EmployeeCardData` |
| `src/app/bizPlan/paceCrawler/employeeCardSelect.ts` | D0: add `openEntries`; D5: build group rows |
| `src/app/bizPlan/paceCrawler/devComponents/EmployeeCardPanel.tsx` | Add `GroupEntryRow`; map `openEntries` |
| `src/app/bizPlan/paceCrawler/devComponents/diffChecker/DiffD5EmployeeCardPanel.tsx` | Same UI update |
| `src/app/bizPlan/paceCrawler/devComponents/AssignmentEditorPanel.tsx` | Redesign: two-panel Group Manager + Employee Assignment |
| `src/app/bizPlan/paceCrawler/devComponents/GanttChartPanel.tsx` | `buildServCodeGroupMap` reads from `assignmentGroupSelect.groupByServCodeKey` |
| `src/app/bizPlan/paceCrawler/devComponents/ActivePoolPanel.tsx` | Group registry from `assignmentGroupSelect` |
| `src/app/bizPlan/paceCrawler/devComponents/CrawlerResultPanel.tsx` | Group registry from `assignmentGroupSelect` |
| `src/app/bizPlan/paceCrawler/devComponents/DeltaMapPanel.tsx` | Group registry from `assignmentGroupSelect` |

---

## Implementation Order

### Step 1 — `assignmentGroup` Data Module
- [ ] `AssignmentGroupTypes.ts`
- [ ] `AssignmentGroupModel.ts`
- [ ] `api/AssignmentGroupContract.ts` + `api/route.ts`
- [ ] `assignmentGroupSlice.ts`
- [ ] `assignmentGroupSelect.ts`
- [ ] `useAssignmentGroup.ts`
- [ ] Register reducer in `src/store/reducers/index.ts`
- [ ] Add `useAssignmentGroup({ autoLoad: true })` to `usePaceCrawlerDeps.ts`

### Step 2 — Unified Group Model in Crawler
- [ ] Update `PaceCrawlerTypes.ts`: replace `DayCrawlSingleEntry` + `DayCrawlGroupEntry` with unified `DayCrawlPriorityEntry`
- [ ] Update `paceCrawlerSelect.ts`: add `groupByServCodeKey` input; update `selectCrawlerResult` resolution logic
- [ ] Update `dayCrawlSimulation.ts`: unified code path + urgency-weighted drain formula

### Step 3 — Employee Card Group Rows
- [ ] Update `DiffCheckerTypes.ts`: add `OpenGroupMemberRow`, `OpenGroupRow`; update `EmployeeCardData`
- [ ] Update `employeeCardSelect.ts`: D0 `openEntries` field; D5 group row assembly
- [ ] Update `EmployeeCardPanel.tsx`: `GroupEntryRow` component; map `openEntries`
- [ ] Update `DiffD5EmployeeCardPanel.tsx`: same UI update

### Step 4 — Dev Panel Updates
- [ ] Update `GanttChartPanel.tsx`: `buildServCodeGroupMap` from `assignmentGroupSelect`
- [ ] Update `ActivePoolPanel.tsx`, `CrawlerResultPanel.tsx`, `DeltaMapPanel.tsx`: group registry from `assignmentGroupSelect`

### Step 5 — Assignment Editor Redesign
- [ ] Build `AssignmentGroupManager.tsx` (Group Manager left panel)
- [ ] Redesign `AssignmentEditorPanel.tsx` (two-panel layout)

### Step 6 — Verify
- [ ] Confirm urgency-weighted drain: SE3/SC2 finish before 9/1, CC3 finishes ~9/28
- [ ] Confirm all employees referencing the same group produce the same `groupId` timeline key
- [ ] Confirm Gantt shows one bar per member with its own `optimizedMax`
- [ ] Confirm Employee Card group header shows correct sum of required rates
- [ ] Confirm SC Timeline shows one entry per group

---

## Constraints Preserved

| Constraint | How enforced |
|---|---|
| Group priority: any actionable member triggers eligibility | `groupHasPool = any member with pool > 0` in simulation |
| Urgency-weighted drain respects individual deadlines | `weight = pool / remainingWeekdays` per member |
| Single servCodes work identically to before | Wrapped as single-member groups; urgency weight = pool / remainingWeekdays (same as before for one member) |
| Existing stored data untouched | Resolution falls back to normalized label if no `AssignmentGroup` match |
| Group drain rate = `totalAvgDailyPrice` | Unchanged — total drain per day is still the employee's full daily capacity |
