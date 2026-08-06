# Assignment Group Plan — Named Shared Groups (Option A)

**Status**: Planning  
**Motivation**: The current per-employee group system causes incorrect projected end dates and
broken Gantt display when two employees have overlapping but non-identical group memberships
for the same servCodes.

---

## The Problem

Groups are currently **employee-local** — each employee independently declares which servCodes
they work together inside their `AssignmentPlan.entries`. This causes three compounding issues:

### 1. Incorrect projected end dates

When Employee A has group `CC3+LA3+SC2+SE3` and Employee B has group `CC3+LA3`, the crawl
treats them as two separate group entries with different labels. Both drain the same underlying
servCode pools (CC3, LA3), but the crawl accounts for each employee's drain under a different
timeline key. The result: the pool drains faster than any single group's team rate suggests,
producing a projected end date that is too early.

**Example from production**: Pool $58,998, displayed team rate $2,968/day → expected ~20 days,
but bar showed ~13 days because a third employee was draining under a different group label.

### 2. Broken Gantt display

`GanttChartPanel` builds a `servCodeGroupMap` by scanning all employees' assignment plans and
picking the **first** group label encountered for each servCode. When two employees have
different group memberships for the same servCode, the Gantt picks one group label and ignores
the other. The bar only reflects one group's crew events — the other group's drain is invisible.

### 3. Inconsistent timeline keys

`servCodeTimeline` in the crawl is keyed by the normalized group label (sorted servCodeIds
joined with `+`). Different group memberships produce different keys, so the SC Timeline panel
shows multiple separate entries for what is conceptually the same work.

---

## Proposed Design: Named Shared Groups (Option A)

Groups become **first-class entities** that exist at the `Scenario` level, independent of any
individual employee's assignment plan. All employees who work the same group reference the same
`groupId`. The crawl uses `groupId` as the stable timeline key.

---

## Type Changes

### New: `AssignmentGroup`

```typescript
// In AssignmentPlanTypes.ts

/**
 * A named group of servCodes that are always worked together on the same day.
 * Groups are scenario-level entities — all employees who work this group reference
 * the same groupId. This ensures the crawl uses a single timeline key and the
 * Gantt renders one bar per group regardless of how many employees work it.
 */
export type AssignmentGroup = {
  /** Stable identifier. Auto-generated as sorted servCodeIds joined with "+". */
  groupId: string;
  /** Display label. Defaults to groupId. Can be customized (e.g. "Renovation Bundle"). */
  label: string;
  /** The servCodes that are always worked together. */
  servCodeIds: string[];
};
```

### Updated: `AssignmentGroupEntry`

```typescript
// Before
export type AssignmentGroupEntry = {
  kind: "group";
  servCodeIds: string[];
  label?: string;
};

// After
export type AssignmentGroupEntry = {
  kind: "group";
  /** References AssignmentGroup.groupId in the scenario's groups array. */
  groupId: string;
};
```

### Updated: `Scenario`

```typescript
// Before
export type Scenario = {
  name: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  plans: AssignmentPlan[];
};

// After
export type Scenario = {
  name: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  /** Shared group definitions for this scenario. */
  groups: AssignmentGroup[];
  plans: AssignmentPlan[];
};
```

---

## Migration Strategy

### Auto-migration from existing data

When loading a `Scenario` from MongoDB that has the old inline `servCodeIds` format, a
migration function converts it to the new format:

```typescript
function migrateScenario(raw: LegacyScenario): Scenario {
  const groupMap = new Map<string, AssignmentGroup>();

  // Collect all unique groups from all employee plans
  for (const plan of raw.plans) {
    for (const entry of plan.entries) {
      if (entry.kind === "group") {
        const groupId = [...entry.servCodeIds].sort().join("+");
        if (!groupMap.has(groupId)) {
          groupMap.set(groupId, {
            groupId,
            label: entry.label ?? groupId,
            servCodeIds: entry.servCodeIds,
          });
        }
      }
    }
  }

  // Rewrite entries to use groupId references
  const migratedPlans = raw.plans.map((plan) => ({
    ...plan,
    entries: plan.entries.map((entry) => {
      if (entry.kind !== "group") return entry;
      const groupId = [...entry.servCodeIds].sort().join("+");
      return { kind: "group" as const, groupId };
    }),
  }));

  return {
    ...raw,
    groups: [...groupMap.values()],
    plans: migratedPlans,
  };
}
```

This migration runs transparently when loading scenarios from the API — no manual data
re-entry required.

---

## Crawl Changes

### `selectCrawlerResult` in `paceCrawlerSelect.ts`

When building `DayCrawlPriorityEntry[]` for each employee, resolve `groupId` references to
the full `AssignmentGroup` from `scenario.groups`:

```typescript
// Before (inline servCodeIds)
return {
  kind: "group",
  servCodeIds: entry.servCodeIds,
  label: normalizedLabel,
};

// After (resolved from scenario.groups)
const group = groupMap.get(entry.groupId);
return {
  kind: "group",
  servCodeIds: group.servCodeIds,
  label: group.groupId, // stable, canonical key
};
```

**Key invariant**: All employees who reference the same `groupId` will produce the same
`label` in their `DayCrawlGroupEntry`. The crawl's `servCodeTimeline` will have exactly one
entry per group, aggregating all employees' events under the same key.

### `dayCrawlSimulation.ts`

No changes needed. The simulation already uses `label` as the timeline key. The fix is
upstream — ensuring all employees use the same label for the same group.

---

## Assignment Editor Changes

### `AssignmentEditorPanel.tsx`

The "Make Group" action currently creates an inline `AssignmentGroupEntry` with `servCodeIds`.
After this change, it must:

1. Generate a `groupId` (sorted servCodeIds joined with `+`)
2. Check if a group with that `groupId` already exists in `scenario.groups`
3. If not, dispatch an action to add it to `scenario.groups`
4. Write `{ kind: "group", groupId }` into the employee's entries

The "Break Group" action removes the `groupId` reference from the employee's entries. If no
other employee references that `groupId`, the group can optionally be removed from
`scenario.groups` (or left as an orphan — harmless).

### Group label editing

A new UI affordance (e.g., clicking the group badge in the editor) allows renaming the group's
`label` field. This updates `scenario.groups` directly and propagates to all employees who
reference that `groupId` via the selector.

---

## Selector Changes

### New: `selectGroupMap`

```typescript
// In assignmentPlanSelect.ts

const selectGroupMap = createSelector(
  [selectScenarios],
  (scenarios): Map<string, AssignmentGroup> => {
    const active = scenarios.find((s) => s.isActive);
    if (!active) return new Map();
    return new Grouper(active.groups).toUniqueMap((g) => g.groupId);
  },
);
```

### Updated: `selectCrawlerResult`

Reads `groupMap` to resolve `groupId` → `AssignmentGroup` when building employee entries.

### Updated: `buildServCodeGroupMap` in `GanttChartPanel.tsx`

Currently scans employee plans to build `servCodeId → groupLabel`. After this change, reads
directly from `scenario.groups`:

```typescript
function buildServCodeGroupMap(groups: AssignmentGroup[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const group of groups) {
    for (const servCodeId of group.servCodeIds) {
      result.set(servCodeId, group.groupId);
    }
  }
  return result;
}
```

This guarantees every servCode maps to exactly one group label, regardless of how many
employees work it or with what membership.

---

## MongoDB Schema Changes

### `ScenarioSchema` in `AssignmentPlanModel.ts`

```typescript
const AssignmentGroupSchema = new Schema(
  {
    groupId: { type: String, required: true },
    label: { type: String, required: true },
    servCodeIds: { type: [String], required: true },
  },
  { _id: false },
);

const AssignmentEntrySchema = new Schema(
  {
    kind: { type: String, enum: ["single", "group"], required: true },
    // single entry
    servCodeId: { type: String },
    // group entry — references AssignmentGroup.groupId
    groupId: { type: String },
  },
  { _id: false },
);

const ScenarioSchema = new Schema({
  name: { type: String, required: true, unique: true },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
  isActive: { type: Boolean, required: true, default: false },
  groups: { type: [AssignmentGroupSchema], required: true, default: [] },
  plans: { type: [AssignmentPlanEmbedSchema], required: true, default: [] },
});
```

---

## Constraints Preserved

| Constraint | How enforced |
|---|---|
| At most one sequential servCode per group | Validated in `AssignmentEditorPanel` when creating a group |
| A servCode can belong to at most one group per scenario | `groupId` is derived from sorted servCodeIds — two groups with overlapping members would have different `groupId`s, which is allowed but flagged in the editor |
| Group drain rate = `totalAvgDailyPrice` | Unchanged — the crawl still uses `employee.totalAvgDailyPrice` for group entries |

---

## Implementation Order

### Step 1 — Types + Migration
- [ ] Update `AssignmentPlanTypes.ts`: add `AssignmentGroup`, update `AssignmentGroupEntry`, update `Scenario`
- [ ] Add `migrateScenario()` helper
- [ ] Update `AssignmentPlanModel.ts`: add `AssignmentGroupSchema`, update `AssignmentEntrySchema`

### Step 2 — API + Slice
- [ ] Update `route.ts`: apply migration when loading old scenarios
- [ ] Update `assignmentPlanSlice.ts`: add `addGroup`, `removeGroup`, `updateGroupLabel` actions
- [ ] Update `assignmentPlanSelect.ts`: add `selectGroupMap`

### Step 3 — Crawl
- [ ] Update `selectCrawlerResult` in `paceCrawlerSelect.ts`: resolve `groupId` → `AssignmentGroup`

### Step 4 — Gantt
- [ ] Update `buildServCodeGroupMap` in `GanttChartPanel.tsx`: read from `scenario.groups`

### Step 5 — Assignment Editor
- [ ] Update `AssignmentEditorPanel.tsx`: "Make Group" creates/reuses a shared group; "Break Group" removes the reference

### Step 6 — Verify
- [ ] Confirm the CC3+LA3+SC2+SE3 group produces a single timeline key
- [ ] Confirm the Gantt bar end date matches `pool / teamRate` math
- [ ] Confirm the SC Timeline panel shows one entry per group

---

## Files Changed

| File | Change |
|---|---|
| `AssignmentPlanTypes.ts` | Add `AssignmentGroup`, update `AssignmentGroupEntry`, update `Scenario` |
| `AssignmentPlanModel.ts` | Add `AssignmentGroupSchema`, update `AssignmentEntrySchema` |
| `assignmentPlanSlice.ts` | Add group management actions |
| `assignmentPlanSelect.ts` | Add `selectGroupMap` |
| `paceCrawlerSelect.ts` | Resolve `groupId` in `selectCrawlerResult` |
| `GanttChartPanel.tsx` | Read group map from `scenario.groups` |
| `AssignmentEditorPanel.tsx` | "Make Group" creates shared group; "Break Group" removes reference |
| `api/route.ts` | Apply `migrateScenario()` on load |
