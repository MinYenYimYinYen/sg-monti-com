# Delta Projection Accuracy — Known Limitation & Proposed Fix

## Background

The delta projection (`selectServCodePaceDeltaMap` in `matrixSelect.ts`) estimates when each
servCode's remaining work pool will be exhausted, given the assigned employees' daily rates and
their cascade-derived availability dates.

The core simulation is `computePoolDrainDate`. It accepts a list of
`{ availableFrom: string; rate: number }` entries — one per employee — and drains a single-dimension
pool across time intervals, adding each employee's rate only after their `availableFrom` date.

The `availableFrom` values come from `cascadeSelect.employeeCascadeMap`, which runs a
priority-ordered, interval-by-interval simulation per employee. For an employee like `1RR` with
assignment priority `[IC1, IC2, LR1, LR2, LR3, LR4, LR5, LR6]`, the cascade correctly computes
that `1RR`'s `availableFrom` for `LR3` is approximately the date `IC2` finishes — because `IC2`
blocks `LR3` in the priority queue.

---

## The Problem: Mid-ServCode Interruption

The cascade simulation is **non-preemptive within an interval**, but interval boundaries are
determined by each servCode's `openDate` and `closeDate`. This means:

1. `1RR` may begin contributing to `LR3` before `IC2` opens (if `LR3` starts first).
2. When `IC2`'s `openDate` arrives, it becomes a new interval boundary and `1RR` switches to `IC2`.
3. `1RR` contributes **zero** to `LR3` during the `IC2` window.
4. After `IC2` is exhausted, `1RR` resumes `LR3`.

The cascade captures this correctly in `contributedCSP` (total contribution to `LR3` before `IC2`
preempted) and `availableFrom` (the *first* date `1RR` worked on `LR3`).

**The delta projection does not model this gap.** `buildDimensionAvailability` treats `availableFrom`
as a one-time gate: once `availableFrom <= intervalStart`, `1RR`'s full `dailyRate` is added to
every subsequent interval. It does not know that `1RR` will be pulled off `LR3` when `IC2` opens.

This causes the delta projection to be **too optimistic** for servCodes that share employees with
higher-priority, overlapping servCodes.

---

## Proposed Fix

### Core Idea

The cascade simulation already computed the correct answer: `contributedCSP` is the work `1RR`
will do on `LR3` before `IC2` preempts, and `availableFrom` is when `1RR` resumes after `IC2`.

Instead of re-simulating from a single `availableFrom` with a continuous `dailyRate`, the delta
projection should model each employee's contribution in two phases:

1. **Pre-interruption phase**: `contributedCSP` is already committed. It will be done by
   `availableFrom` (the first worked date). No simulation needed — treat it as already scheduled.
2. **Post-interruption phase**: The remaining pool per employee is
   `pool_share - contributedCSP`. The employee resumes at `availableFrom` (which, for the
   interrupted case, is actually the *resume* date after `IC2` finishes).

### Implementation Sketch

**Change `buildDimensionAvailability`** to return per-employee remaining work alongside availability:

```typescript
type EmployeeAvailability = {
  availableFrom: string;
  rate: number;
  alreadyCommitted: number; // from contributedCSP — reduces the pool before simulation
};
```

**Change `computePoolDrainDate`** to accept `alreadyCommitted` per employee and subtract it from
the pool before the interval simulation begins:

```typescript
const effectivePool = pool - employeeAvailability.reduce((s, e) => s + e.alreadyCommitted, 0);
if (effectivePool <= 0) return projectionStart; // already done
```

Then simulate the remaining `effectivePool` using the staggered `availableFrom` + `rate` as before.

### Why This Works

- For employees with no interruption (IC2 never preempts LR3), `contributedCSP` for LR3 will be
  zero (they haven't started yet), so `alreadyCommitted = 0` and behavior is unchanged.
- For `1RR` on `LR3`, `contributedCSP` reflects the work done before IC2 preempted. The remaining
  pool is smaller, and `availableFrom` correctly reflects when `1RR` resumes — so the simulation
  produces an accurate projected end date.

### Scope

Changes are confined to `matrixSelect.ts`:
- `buildDimensionAvailability` — add `alreadyCommitted` per employee
- `computePoolDrainDate` — subtract committed work from pool before simulation
- `selectServCodePaceDeltaMap` — pass `cascadeMap` entries with `contributedCSP` to the builder

No changes needed to `cascadeSelect.ts` or any other selector.
