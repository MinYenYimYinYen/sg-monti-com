# By-Service Pool Architecture

## Overview

A proposed refactor of the pace engine's future phase to operate on **actual service objects** rather than a numeric price counter. The pool is the set of services themselves; the engine selects services each day until an employee's daily goal is reached.

---

## Motivation

The current engine drains a `poolRemaining: number` counter each day. This is fast but lossy — by the time the engine finishes, you only know *how much* was projected to be done, not *which services*. Selectors must re-derive everything from aggregate numbers.

A service-level pool gives the engine output that is richer and more directly useful:
- Selectors know exactly which services are projected for which day and employee
- Straggler detection is trivial: stragglers are services still in the pool after the cascade condition fires
- Any UI aggregation (by customer, by route, by service type) is a selector concern, not an engine concern
- The engine stops doing math it doesn't need to do

---

## Architecture

### Pool State

Replace `poolRemaining: number` with a mutable set of service references:

```ts
type GroupPoolState = {
  groupId: string;
  remainingServices: ProjectedService[];   // services not yet assigned
  assignedServices: ProjectedService[];    // services assigned during the crawl
  totalServiceCount: number;               // snapshot at crawl start (for cascade check)
  // ... timeline fields unchanged
};

type ProjectedService = {
  servCodeId: string;
  serviceId: string;   // unique key within the service
  price: number;
};
```

### Service Selection Algorithm

Each day, for each employee working a group:

1. **Pre-sort** (once per group, before the crawl loop): sort `remainingServices` by price descending
2. **Greedy selection**: iterate through the sorted list, accumulate price until `accumulated >= goalDailyPrice`
   - Take the next service if `accumulated + service.price <= goalDailyPrice * overshootTolerance`
   - Or simply: take services until `accumulated >= goalDailyPrice` (allow one overshoot — you don't stop mid-service)
3. Remove selected services from `remainingServices`, add to `assignedServices` with `{ date, employeeId }`

**Complexity**: O(k) per employee per day where k = services selected that day (typically small). Pre-sort is O(n log n) once per group before the crawl loop.

### Cascade Threshold

The cascade condition uses **service count** instead of price:

```ts
const completedCount = state.totalServiceCount - state.remainingServices.length;
const completionPct = completedCount / state.totalServiceCount;
// cascade fires when completionPct >= cascadeThreshold
```

This is O(1) and equally valid — a group with 5% of services remaining has effectively been completed by the team. Count-based is simpler and avoids floating-point price accumulation.

### Cascade Carry-Forward

When a cascade fires, the remaining service objects are moved into the successor group's pool:

```ts
successorState.remainingServices.push(...predecessorState.remainingServices);
predecessorState.remainingServices = [];
```

No price arithmetic needed — the services carry their own price.

### Pool History Snapshots

`PoolDaySnapshot` becomes count-based with a service-level field:

```ts
type PoolDaySnapshot = {
  date: string;
  remainingCount: number;
  completedCount: number;
  percentCompleted: number;          // completedCount / totalServiceCount
  assignedServiceIds: string[];      // services assigned on this specific day
};
```

Price totals (`completed: number`, `remaining: number`) become **selector concerns** — computed from the service objects, not stored in the snapshot. This keeps the snapshot lean and the engine free of aggregation math.

---

## What Changes

| Layer | Current | Proposed |
|---|---|---|
| `GroupPoolState` | `poolRemaining: number` | `remainingServices: ProjectedService[]` |
| `drainGroupPool` | subtracts price from counter | selects services from sorted list |
| `PoolDaySnapshot` | price-based fields | count-based + `assignedServiceIds[]` |
| `assembleGroupResults` | reads numeric pool fields | reads service arrays |
| Selectors | compute from pre-aggregated numbers | compute from service objects |
| Past phase | unchanged | unchanged (reads actual RealGreen completion data) |

---

## What Stays the Same

- **Cascade threshold logic**: same condition, different metric (count instead of price)
- **Sequence locking / cascade carry-forward**: unchanged — when a cascade fires, remaining services are moved into the successor group's pool
- **Straggler detection**: same condition (past `plannedEnd` + past cascade threshold + last-in-sequence), but now the straggler *is* the set of remaining service objects — directly surfaceable to the Priorities page without any additional data
- **Employee timeline events**: unchanged
- **`lastInSequenceGroupIds` logic**: unchanged

---

## Benefits

1. **Richer output**: the engine tells you *which* services are projected for each day, not just how much money
2. **Simpler straggler handling**: stragglers are just `remainingServices` — no need to track a separate price amount or re-query service data
3. **Selector flexibility**: any aggregation the UI needs can be computed from service objects without re-running the engine
4. **Cleaner cascade carry-forward**: move service objects between groups, not a price number
5. **Deterministic**: greedy sort-by-price is deterministic and produces sensible daily assignments
6. **No floating-point drift**: cascade threshold is integer count comparison, not accumulated price division

## Tradeoffs

1. **Memory**: storing service references instead of a single number increases memory usage proportionally to pool size
2. **Complexity**: the selection loop is more code than `poolRemaining -= goalRate`
3. **Large refactor**: touches `GroupPoolState`, `drainGroupPool`, `PoolDaySnapshot`, `assembleGroupResults`, and all consuming selectors

---

## Implementation Scope

This is a **future phase refactor** — the past phase is unaffected (it reads actual RealGreen completion data, not projections). The refactor is self-contained within:

- `src/app/pace/lib/crawlFuturePhase/` — pool state, selection algorithm, cascade carry-forward
- `src/app/pace/PaceEngineTypes.ts` — `GroupPoolState`, `PoolDaySnapshot`, new `ProjectedService` type
- `src/app/pace/lib/assembleGroupResults/` — reads service arrays instead of numeric fields
- All `*Select.ts` files that read `poolHistory` or pool state fields — compute price totals from service objects
