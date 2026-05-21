# Pace Crawler — ServCode Groups

**Phase 1 Plan** | Extension: `bizPlan/paceCrawler_01_servCodeGroups`

---

## Purpose

The current crawl treats each servCode as an independent unit of work. In reality, employees
often route multiple servCodes together on the same day — e.g., `RC1`, `R01`, and `P01` go on
the same route sheet. Treating them independently causes the crawl to underestimate throughput
and produce unrealistically far-out projected end dates for servCodes that are always worked
alongside higher-priority ones.

**ServCode Groups** allow the assignment plan to declare that a set of servCodes are always
worked together. The crawl treats the group as a single priority entry, draining all member
pools simultaneously at the employee's total daily capacity.

---

## Desired Behaviors

### Assignment Plan

- An employee's priority list can contain both **single servCodes** and **groups**
- A group is an ordered set of servCodes that are always worked together on the same day
- Groups have an optional display label (e.g., "Renovation Bundle")
- A servCode can belong to at most one group per employee
- **Constraint**: at most one sequential servCode per group (two sequential servCodes in the
  same group is disallowed — no valid use case)

### Crawl Simulation

- A group entry is treated as a single priority slot in the employee's list
- On a day when the group is the highest-priority eligible entry, the employee drains all
  member pools simultaneously
- The group's drain rate = `employee.totalAvgDailyPrice` (full daily capacity)
  - Rationale: a group represents a full-day route; the employee's entire output goes to it
  - Summing per-programType rates would overcount (rates were computed independently and
    may reflect days where the employee also worked other programTypes)
- The group's combined pool = sum of member pools
- The group's open date floor = `min(member.openDateFloor)`
- The group's `currentMax` fallback = `max(member.currentMax)`
- Each member's `projectedEndDate` = the group's drain date (they all finish together)
- Each member's `proposedMax` = `projectedEndDate + member.paddingDays`

### Sequential Behavior

- If a group contains one sequential servCode, the group inherits that servCode's sequential
  identity: it is locked until the predecessor drains, and it unlocks the successor when it drains
- The non-sequential members of the group have their individual dateRanges superseded by the
  group's behavior — they open and close with the sequential member
- Example: grouping `OW1` with `LR1` means OW1 is done by the time LR1 is done; OW1's
  individual dateRange is irrelevant to the crawl

### Fallback Rate (No Lookback Data)

- If the employee has no `totalAvgDailyPrice` data: fall back to
  `sum(member team averages) / knownCount` — same fallback logic as single servCodes,
  applied to the group's combined pool
- If no team data at all: rate = 0 (group contributes nothing to the crawl)

---

## Schema Change

### `AssignmentPlan` (breaking change — clean migration)

```typescript
// Before
type AssignmentPlan = {
  employeeId: string;
  servCodeIds: string[]; // flat ordered list
};

// After
type AssignmentEntry =
  | { kind: "single"; servCodeId: string }
  | { kind: "group"; servCodeIds: string[]; label?: string };

type AssignmentPlan = {
  employeeId: string;
  entries: AssignmentEntry[]; // ordered by priority, index 0 = highest
};
```

The flat `servCodeIds` field is removed entirely. Existing Mongo data will be dropped and
re-entered via the new assignment editor.

### Derived selectors

`assignmentsByServCodeId` is derived by flattening all entries (both single and group members).
`employee.servCodeIds` (used by `employeeSelect`) is derived by flattening all entries.
These derived shapes remain `string[]` — consumers don't need to know about groups.

---

## Rate Model

| Entry type | Daily rate | Pool |
|---|---|---|
| Single servCode | `lookbackRate[employee][programType]` or team fallback | `activePoolPrice[servCodeId]` |
| Group | `totalAvgDailyPrice[employee]` or team fallback | `sum(activePoolPrice[member])` |

**Why `totalAvgDailyPrice` for groups:**
- A group = a full-day route; the employee's entire capacity goes to it
- Per-programType rates were computed independently and cannot be summed without double-counting
- `totalAvgDailyPrice` is already computed in `cascadeSelect.employeeLookbackMap` (via
  `stats.totalAvgDailyCSP.price` on any entry)
- This is conservative and honest — it doesn't assume the group is additive

---

## New Selector: `selectTotalAvgDailyPriceByEmployee`

A new Layer 3a selector alongside `selectEmployeeLookbackPriceMap`:

```typescript
// Map<employeeId, number>
// = totalAvgDailyCSP.price from any programType entry in the lookback map
const selectTotalAvgDailyPriceByEmployee = createSelector(
  [cascadeSelect.employeeLookbackMap],
  (lookbackMap): Map<string, number> => {
    const result = new Map<string, number>();
    for (const [employeeId, byProgramType] of lookbackMap) {
      for (const stats of byProgramType.values()) {
        if (stats?.totalAvgDailyCSP.price > 0) {
          result.set(employeeId, stats.totalAvgDailyCSP.price);
          break; // totalAvgDailyCSP is the same across all programType entries
        }
      }
    }
    return result;
  },
);
```

---

## Changes Required

### Data layer (human tasks)

| File | Change |
|---|---|
| `AssignmentPlanTypes.ts` | Add `AssignmentEntry` type, replace `servCodeIds` with `entries` |
| `AssignmentPlanModel.ts` | Update Mongoose schema |
| `AssignmentPlanContract.ts` | Update API contract |
| `assignmentPlanSlice.ts` | Update `reorderServCodes` action to accept `entries` |
| `assignmentPlanSelect.ts` | Update `assignmentsByEmployeeId` and `assignmentsByServCodeId` to flatten entries |
| `employeeSelect.ts` | Update `employee.servCodeIds` derivation to flatten entries |

### Crawl layer (AI tasks)

| File | Change |
|---|---|
| `PaceCrawlerTypes.ts` | Add `DayCrawlGroupEntry`, update `DayCrawlEmployeeEntry.servCodeIds` to `entries` |
| `dayCrawlSimulation.ts` | Handle group entries — drain all members at `totalAvgDailyPrice` rate |
| `paceCrawlerSelect.ts` | Add `selectTotalAvgDailyPriceByEmployee`; update `selectDailyRateByEmployeeByServCode` to handle groups; update `selectCrawlerResult` to build group entries |
| `AssignmentEditorPanel.tsx` | Add group creation/editing UI (drag servCodes into a group, label the group) |

---

## Open Questions (Resolved)

| Question | Decision |
|---|---|
| Group rate model | `totalAvgDailyPrice` — full daily capacity, not sum of per-programType rates |
| Sequential + group | At most one sequential servCode per group; group inherits sequential identity |
| Two sequential servCodes in a group | Disallowed — no valid use case |
| Schema migration | Clean break — drop existing Mongo data, new schema |
| Backward compat with pace module | Not needed — pace module will be deprecated |
| ServCode in multiple groups | Disallowed — at most one group per servCode per employee |

---

## Open Questions (Unresolved)

| Question | Notes |
|---|---|
| Group rate fallback when no `totalAvgDailyPrice` | Use `sum(member team averages) / knownCount`; if no team data, rate = 0 |
| How to handle a group where one member has no pool | Member with zero pool is excluded from the group's combined pool; group still drains at full rate for remaining members |
| Group label in the UI | Optional free-text label; defaults to member servCodeIds joined with "+" |

---

## Implementation Order

1. Update `AssignmentPlanTypes.ts`, `AssignmentPlanModel.ts`, `AssignmentPlanContract.ts`
2. Update `assignmentPlanSlice.ts`, `assignmentPlanSelect.ts`, `employeeSelect.ts`
3. Add `selectTotalAvgDailyPriceByEmployee` to `paceCrawlerSelect.ts`
4. Update `PaceCrawlerTypes.ts` with group entry types
5. Update `dayCrawlSimulation.ts` to handle group entries
6. Update `selectCrawlerResult` to build group entries
7. Update `AssignmentEditorPanel.tsx` with group UI

---

## Implementation Status (as of 2026-05-20)

### Completed (G1–G4)

**G1 — `AssignmentPlanTypes.ts`** ✅
- Added `AssignmentSingleEntry`, `AssignmentGroupEntry`, `AssignmentEntry` discriminated union
- `AssignmentPlan.entries: AssignmentEntry[]` replaces `servCodeIds: string[]`
- Added `flattenEntries(entries)` helper — returns all servCodeIds in order

**G2 — `AssignmentPlanModel.ts` + `route.ts`** ✅
- Mongoose schema updated with `AssignmentEntrySchema` subdocument
- `route.ts` `upsertAssignmentPlan` handler uses `entries` field
- **⚠ Migration required**: existing Mongo data uses old `servCodeIds` schema — must drop collection before testing

**G3 — `assignmentPlanSlice.ts`** ✅
- `reorderServCodes` action renamed to `reorderEntries`
- Accepts `{ employeeId, entries: AssignmentEntry[] }`
- Creates new plan if one doesn't exist yet

**G4 — `assignmentPlanSelect.ts` + `employeeSelect.ts`** ✅
- `assignmentsByServCodeId` flattens entries via `flattenEntries`
- `employee.servCodeIds` derived by flattening entries (backward-compat for all consumers)
- All consumers updated: `EmployeeCard`, `MiniServCodeControls`, `employeeCardSelect`,
  `AssignmentMatrix`, `AssignmentEditorPanel`, `CrawlerResultPanel`, `paceCrawlerSelect`

**AssignmentEditorPanel group UI** ✅ (partial — UI supports groups, crawl does not yet)
- `AssignmentEditorPanel.tsx` supports creating, breaking, and adding to groups via checkboxes
- Groups display as `entry.servCodeIds.join(" + ")` with a "group" badge
- The crawl simulation still treats each entry as a single servCode (G5–G8 not done)

---

### Remaining (G5–G9)

**G5 — `selectTotalAvgDailyPriceByEmployee`** ☐
Add to `paceCrawlerSelect.ts` alongside `selectEmployeeLookbackPriceMap`:
```typescript
// Map<employeeId, number> — employee's total avg daily price across all programTypes
const selectTotalAvgDailyPriceByEmployee = createSelector(
  [cascadeSelect.employeeLookbackMap],
  (lookbackMap): Map<string, number> => {
    const result = new Map<string, number>();
    for (const [employeeId, byProgramType] of lookbackMap) {
      for (const stats of byProgramType.values()) {
        if (stats?.totalAvgDailyCSP.price > 0) {
          result.set(employeeId, stats.totalAvgDailyCSP.price);
          break;
        }
      }
    }
    return result;
  },
);
```
Also update `LookbackPricePanel` to show a "Total $/day" column.

**G6 — Update `PaceCrawlerTypes.ts`** ☐
Add `DayCrawlGroupEntry` type and update `DayCrawlEmployeeEntry`:
```typescript
export type DayCrawlSingleEntry = { kind: "single"; servCodeId: string };
export type DayCrawlGroupEntry = {
  kind: "group";
  servCodeIds: string[];
  // Combined pool = sum of member pools; rate = employee.totalAvgDailyPrice
};
export type DayCrawlPriorityEntry = DayCrawlSingleEntry | DayCrawlGroupEntry;

// Update DayCrawlEmployeeEntry:
export type DayCrawlEmployeeEntry = {
  employeeId: string;
  priorityEntries: DayCrawlPriorityEntry[]; // replaces servCodeIds
  dailyRates: Map<string, number>;          // per-servCode rates (for singles)
  totalAvgDailyPrice: number;               // for groups
  nextAvailableDate: string;
};
```

**G7 — Update `dayCrawlSimulation.ts`** ☐
Handle `DayCrawlGroupEntry` in the simulation loop:
- Group entry: drain all member pools simultaneously at `employee.totalAvgDailyPrice`
- Group's effective open date = `min(member.openDateFloor)`
- Group's sequential identity = inherited from the one sequential member (if any)
- Each member's `projectedEndDate` = the group's drain date

**G8 — Update `selectCrawlerResult`** ☐
Build `DayCrawlPriorityEntry[]` from `assignmentPlan.entries`:
- `single` entries → `DayCrawlSingleEntry`
- `group` entries → `DayCrawlGroupEntry` with combined pool from `activePoolMap`
- Pass `totalAvgDailyPriceByEmployee` to employee entries

**G9 — Update `AssignmentEditorPanel`** ☐
Minor: the editor already supports group creation/editing. After G5–G8 are done, verify
that the crawl correctly uses groups and update the dev panel display if needed.
