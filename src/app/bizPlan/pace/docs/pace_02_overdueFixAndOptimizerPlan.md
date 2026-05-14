# Pace 02: Cascade Correctness Fixes + ProgCode Completion Date + DateRange Optimizer + Time Off Tracker

## How to Resume This Work

This document was written at the end of a planning session. To resume in a fresh conversation:

1. Read this file in full
2. Read the **Key Files** listed under each feature
3. The features are ordered by dependency — Feature 0 must be implemented before the others

---

## Background: How the Cascade Works

The cascade simulation (`selectEmployeeCascadeResults` in `paceSelectRefactor.ts`) models each
employee's work as a sequential waterfall. For each employee:

1. Build a `simDataList` — one entry per assigned servCode, containing `openDate`, `closeDate`,
   `pool` (employee's weighted share of `activeAsapCSP`), and `dailyRate` (from lookback)
2. Collect all boundary dates (union of all `openDate`s, `closeDate`s, and `today`)
3. Interval-by-interval drain loop: for each interval, find the **first** servCode in priority
   order that is open and has remaining pool, drain it, then `break` (one servCode per interval)
4. Output: `EmployeeCascadeEntry` per servCode — `contributedCSP`, `availableFrom`, `dailyRate`

The `availableFrom` for a servCode is the interval start at which the employee first works it.
For the second servCode in the waterfall, this is the interval after the first is exhausted.

This `availableFrom` is consumed by `makeSelectProjectedAllocations` to gate whether an employee
shows a CSP suggestion on a given date. If `date < availableFrom`, the allocation shows zero CSP.

---

## Feature 0: Per-Employee Printed Date Clamping (IMPLEMENT FIRST)

### User's Concern

Two related symptoms were identified:

**Symptom A** (discovered during analysis): The cascade uses `projectionStartDate` (the day after
the latest printed schedDate for a servCode, across all employees) as the `openDate` for every
employee on that servCode. When Employee A has routes printed through May 20th, the cascade sets
`openDate = May 21st` for **all** employees — including Employee B who has no printed routes and
is free today. Employee B then shows zero CSP on `mainDate` even though they're available.

**Symptom B** (user-reported, visible in `EmployeeCard`): When one employee already has a route
printed for `mainDate`, the `EmployeeCard` shows no CSP suggestions for any other employees on
that date. The "⚠ Already Routed" badge appears on the routed employee's card, but the other
employees' cards go blank instead of showing their available capacity.

Both symptoms share the same root cause: the cascade conflates **servCode-level scheduling state**
(when does the unscheduled pool start?) with **employee-level availability** (when is this
specific employee free?).

### Root Cause

`projectionStartDate` in `rawPaceSelect.ts` is:

```
day after the latest printed schedDate across ALL employees for this servCode
```

This is used as the `openDate` for the servCode in the cascade. But it should only gate the
*pool* (what work is left to schedule), not each employee's individual availability. An employee
with no printed routes should be able to start working on the unscheduled pool immediately.

### Fix

In `selectEmployeeCascadeResults`, replace the single servCode-level `openDate` with a
**per-employee, per-servCode** effective open date:

```typescript
// For each (employee, servCode) sim entry:
const employeeMaxPrintedForThisServCode = perDay.servCode.services
  .filter(
    (s) =>
      s.status === "$" &&
      s.lastAssigned.employeeId === employee.employeeId &&
      s.lastAssigned.schedDate != null,
  )
  .map((s) => s.lastAssigned.schedDate!)
  .sort()
  .at(-1);

const employeeAvailableFrom = employeeMaxPrintedForThisServCode
  ? dateStrings.nextWeekdayAfter(employeeMaxPrintedForThisServCode)
  : (perDay.projectionStartDate ?? today);

// openDate is the later of: employee's own availability, and the servCode's pool start
const servCodePoolStart =
  perDay.projectionStartDate ??
  (today > perDay.servCode.dateRange.min ? today : perDay.servCode.dateRange.min);

openDate = employeeAvailableFrom > servCodePoolStart
  ? employeeAvailableFrom
  : servCodePoolStart;
```

The `closeDate` assignment is unchanged.

### What This Fixes

- Employee B (no printed routes) gets `openDate = today` and shows real CSP on `mainDate`
- Employee A (routed through May 20th) gets `openDate = May 21st` and correctly shows zero CSP
  on `mainDate` (they're already booked)
- The cascade correctly models each employee's availability independently
- `makeSelectProjectedAllocations` gates correctly: Employee B is `available`, Employee A is
  `notYetAvailable` on `mainDate`

### Open Questions

- **Scope of printed date**: Should the per-employee printed date be scoped to this specific
  servCode's services only, or to all printed services for this employee across all servCodes?
  Scoping to the servCode is more precise (an employee could be routed for servCode A but free
  for servCode B). The fix above uses per-servCode scoping — confirm this is the right choice.
    - Answer: Let's discuss the implications of this choice. But I'm thinking that scoping to the employee and date is
      good enough. In that case, if the employee has any printed services on a given date, their next available date is
      the weekday after that.

- **`alwaysAsap` servCodes**: These use `openDate = today` and `closeDate = today` regardless.
  Should an employee's printed routes for an `alwaysAsap` servCode also clamp their `openDate`?
  Currently they would not, since the `alwaysAsap` branch runs before the printed date logic.
    - Let's leave this as is for now. The impact is minimal.
- **Impact on `fractionConsumed`**: When Employee A's `openDate` is pushed to May 21st, their
  `contributedCSP` for the current period drops. Does this cause their `fractionConsumed` to
  look artificially low (underutilized) even though they're actually fully booked on printed
  routes? May need a separate "printed capacity" display concept.
    - Agreed. When an employee is routed, what should the fraction consumed be? I need to know what is downstream from
      fractionConsumed. Is it just a display property or a calculation that affects other parts of the system?
- **`makeSelectProjectedAllocations` for the routed employee**: Currently, Employee A shows
  `notYetAvailable` on `mainDate` (zero CSP). Should the card instead show the printed services
  as a separate "already scheduled" line item, so the user can see what they're doing that day?
    - No, not for now.

### Key Files to Read

- `src/app/bizPlan/pace/paceSelectRefactor.ts` — `selectEmployeeCascadeResults` (Layer 3),
  specifically the `simDataList` construction loop and the `openDate`/`closeDate` assignment block
- `src/app/bizPlan/pace/rawPaceSelect.ts` — `selectRawServCodePacesPerDay`, specifically how
  `projectionStartDate` is computed (look for `latestPrintedSchedDate`)
- `src/app/bizPlan/pace/employee/components/EmployeeCard.tsx` — where the symptom is visible;
  see `printedForEmployeeToday` filter and `allDateAllocations` usage
- `src/app/bizPlan/pace/paceSelectRefactor.ts` — `makeSelectProjectedAllocations`, specifically
  the `neverAvailable` / `notYetAvailable` gate logic

---

## Feature 0.5 Fix: Effective Close Date for Overdue ServCodes

### User's Concern

When a servCode is past its `dateRange.max` but sales are still coming in (services still being
created), the cascade treats it as invisible. The `closeDate` is in the past, so the interval
guard `sim.closeDate >= intervalEnd` is never satisfied for any present/future interval. The
servCode's `contributedCSP` stays zero, `availableFrom` is never set, and the next servCode in
the employee's priority list gets the employee's full capacity — incorrectly optimistic.

### Fix

In `selectEmployeeCascadeResults`, when assigning `closeDate` for a non-`alwaysAsap` servCode,
detect the overdue condition and project a new effective close date using `price` as the dimension
(revenue-weighted blend of count and size — better than count alone):

```typescript
const isOverdue = today > perDay.servCode.dateRange.max;
if (isOverdue && perDay.activeAsapCSP.price > 0 && teamStats.teamAvgCSP.price > 0) {
  const daysNeeded = Math.ceil(perDay.activeAsapCSP.price / teamStats.teamAvgCSP.price);
  closeDate = dateStrings.addWeekdays(today, daysNeeded);
} else {
  closeDate = perDay.servCode.dateRange.max;
}
```

**Fallback**: If `teamAvgCSP.price === 0` (no lookback data), `closeDate = today`. The servCode
is treated as due immediately and gets highest priority in the current interval.

### What This Fixes

- Overdue servCodes enter the simulation and compete for employee capacity
- The second servCode's `availableFrom` is correctly pushed out until the overdue work is done
- `contributedCSP` and `fractionConsumed` for overdue servCodes become non-zero
- The delta projection (Layer 5) gets a valid `projectedEndDate` for overdue servCodes

### Open Questions

- **Sales still growing**: `activeAsapCSP.price` is a snapshot of current unscheduled work.
  If sales continue to come in after the optimizer runs, the projected close date will be
  stale. Should the effective close date be recomputed on every selector run (it is, since
  it's a derived value), or should there be a "freeze" mechanism?
    - We need not worry about this. The this will run whenever the user refreshes the browser. Stale data during a
      single user session is not a big deal.
- **No lookback data fallback**: When `teamAvgCSP.price === 0`, `closeDate = today` is used.
  This means the overdue servCode gets highest priority but with a zero-width window, so it
  drains in the first interval. Is this the right behavior, or should we use a global fallback
  rate (e.g., 1 service/day) to give it a realistic window?
    - No global fallback rate. All due today when overdue is correct. If it looks wrong to user, the user can adjust the
      date range.
- **Interaction with Feature 0**: If Employee A is routed through May 20th and the overdue
  servCode's effective close date is May 15th, Employee A's `openDate` (May 21st) is after
  the close date — so the overdue servCode is still invisible to Employee A. Is this correct
  (they can't help with it since they're booked), or should the close date be extended further?
    - The correct behavior is to treat the employee as fully booked on May 15th. Other employees not routed through May
      20th will still see the overdue servCode.

### Key Files to Read

- `src/app/bizPlan/pace/paceSelectRefactor.ts` — `selectEmployeeCascadeResults` (Layer 3),
  the `openDate`/`closeDate` assignment block (same location as Feature 0 fix)
- `src/app/bizPlan/pace/rawPaceSelect.ts` — `selectRawServCodePacesPerDay`, specifically
  `activeAsapCSP` (the unscheduled work pool) and how it differs from `unfinishedCSP`
- `src/app/bizPlan/pace/RawPaceTypes.ts` — `RawServCodePacePerDay` type, especially the
  `activeAsapCSP` and `projectionStartDate` fields and their JSDoc

---

## Feature 1: ProgCode Projected Completion Date

### User's Concern

There's no way to see when a ProgCode (a group of servCodes) is expected to be fully done.
The per-servCode `projectedEndDate` exists in Layer 5 but isn't aggregated up to the ProgCode
level. With the overdue fix in place, all servCodes return a valid projected end date, making
this aggregation meaningful.

### New Selector

A new selector on top of `selectServCodePaceDeltaMap` + `selectProgCodePaces`:

```typescript
// Returns: Map<progCodeId, string | null>
const selectProgCodeProjectedCompletionMap = createSelector(
  [selectProgCodePaces, selectServCodePaceDeltaMap],
  (progCodePaces, deltaMap) => {
    const result = new Map<string, string | null>();
    for (const progCodePace of progCodePaces) {
      const dates = progCodePace.servCodePaces
        .map((sp) => deltaMap.get(sp.servCode.servCodeId)?.projectedEndDate)
        .filter((d): d is string => d != null);
      result.set(
        progCodePace.progCode.progCodeId,
        dates.length > 0 ? [...dates].sort().at(-1)! : null,
      );
    }
    return result;
  },
);
```

Export from `paceSelect` as `progCodeProjectedCompletionMap`.

### Why This Works

The cascade's waterfall structure already encodes sequential dependency: employee capacity flows
from servCode 1 → servCode 2 → ... in priority order. The per-servCode projected end dates
already account for this sequencing. The ProgCode completion date is simply the latest of them.

### Open Questions

- **Display location**: Where should the ProgCode completion date be shown? Options include
  the AssignmentMatrix row header, a tooltip on the ProgCode name, or a dedicated summary panel.
  - It should be shown in the AssignmentMatrix row header.
- **Confidence indicator**: Should the projected date be shown with a confidence band (e.g.,
  based on `maxDailyRate` vs `avgDailyRate` to show best/worst case), or just the single
  expected date?
  - By default, we should use avgDailyRate.  However, a small slider control ranging from avgDailyRate to maxDailyRate could be useful for the production manager to see what end date is possible if we route aggressively.
- **Null handling**: If any servCode in the ProgCode has `projectedEndDate = null` (no team
  data), should the ProgCode completion date also be null, or should it be computed from the
  servCodes that do have data?
  - If no team data, we do straight math on the dateRange and assume the team shares the work equally and finishes on right on time.
  - The styling for this should be muted, to indicate no actual projection is being made.

### Key Files to Read

- `src/app/bizPlan/pace/paceSelectRefactor.ts` — `selectServCodePaceDeltaMap` (Layer 5) and
  `selectProgCodePaces` (Layer 4) — the two inputs to the new selector
- `src/app/bizPlan/pace/PaceTypesRefactor.ts` — `ServCodePaceDelta` type (has `projectedEndDate`)
  and `ProgCodePace` type
- `src/app/bizPlan/pace/RawPaceTypes.ts` — `RawServCodePacePerDay` for context on what
  `activeAsapCSP` and `projectionStartDate` represent

---

## Feature 2: DateRange Optimizer

### User's Concern

ServCode date ranges are currently set manually. The user wants a tool that automatically
computes realistic date ranges based on the team's actual throughput (from lookback data) and
the current unscheduled work pool. The key UX requirement is a **padding input** — the user
can add N extra weekdays per servCode as a buffer against late sales, weather, etc.

### Algorithm (Forward Pass)

```
for each progCode:
  cursor = progCode.openDate (or today if already started)
  for each servCode in priority order:
    daysNeeded = ceil(activeAsapCSP.price / teamAvgCSP.price)
    dateRange.min = cursor
    dateRange.max = addWeekdays(cursor, daysNeeded + paddingDays)
    cursor = addWeekdays(dateRange.max, 1)  // next servCode starts the day after
```

### UI

A panel or modal on the ProgCode row in the AssignmentMatrix (or a dedicated optimizer page).
Controls:

- **Padding per servCode** (number input, default 0): adds N extra weekdays to each servCode's
  computed window. Example: `paddingDays = 2` gives 2 extra days before the next servCode opens,
  preventing a single bad week from cascading into every subsequent servCode being overdue.
- **Run Optimizer** button: computes and previews the new date ranges
- **Apply** button: writes the new date ranges back

### Open Questions

- Does "Apply" write to the existing `assignmentPlan` model, or does it need a new API route?
  - Apply would write to the ServCodeDoc model (servCodeDoc.dateRange.min/max) 
- Should the optimizer respect existing `dateRange.min` values (don't move a start date already
  communicated to customers), or fully recompute from scratch?
  - No, but we do need a decision on overlap. In reality, date ranges do overlap, but the overdue algorithm above will handle that gracefully, so we might do better to keep the ranges non-overlapping for the purposes of the optimizer.  More discussion might be needed on this.  If we allow the user to set an overlap day count value, does that unnecessarily complicate the optimizer?
- Should the preview show a Gantt-style visualization of the new date ranges before applying?
  - Yes, this would be great.
- Multi-ProgCode optimization: run across all progCodes simultaneously, or one at a time?
  - One at a time seems right.

### Key Files to Read

- `src/app/bizPlan/pace/paceSelectRefactor.ts` — `selectServCodePaceDeltaMap` (Layer 5) for
  how `computePoolDrainDate` works — the optimizer's forward pass is a simplified version of this
- `src/app/bizPlan/pace/rawPaceSelect.ts` — `selectRawServCodePacesPerDay` for `activeAsapCSP`
  (the pool) and `selectRawServCodePacesPerDayMap` for per-servCode access
- `src/app/bizPlan/assignmentPlan/` — the existing assignment plan module; "Apply" will likely
  write here or need a new route alongside it
- `src/app/bizPlan/pace/components/` — where the optimizer UI will live (AssignmentMatrix area)

---

## Feature 3: Planned Time Off & Holiday Tracker

### User's Concern

The forecast assumes employees work every weekday. In reality, employees take vacations and there
are company holidays. These days should be subtracted from the forecast so that projected
completion dates and CSP suggestions are accurate. This requires its own data module (CRUD +
MongoDB) and integration into the pace selectors.

### Data Module (5-Component Pattern)

**Types** (`TimeOffTypes.ts`):

```typescript
type TimeOffDoc = {
  id: string;           // natural key (e.g., `${employeeId}_${startDate}` or UUID)
  employeeId: string | null;  // null = company-wide holiday
  startDate: string;    // ISO date
  endDate: string;      // ISO date (same as startDate for single days)
  label: string;        // "Vacation", "Holiday", "Personal", etc.
};
```

**Contract** (`timeOffContract.ts`): `getTimeOff`, `upsertTimeOff`, `deleteTimeOff`

**Route** (`api/route.ts`): Standard CRUD via `createRpcHandler`. Mongoose model with
`createModel("TimeOff", schema)`.

**Slice** (`timeOffSlice.ts`): Standard data slice. No UI state needed here.

**Selectors** (`timeOffSelect.ts`):

- `holidayDates`: `Set<string>` — all dates where the full team is off
- `employeeTimeOffDates`: `Map<employeeId, Set<string>>` — per-employee off dates

**Hook** (`useTimeOff.ts`): Auto-fetches on mount. No dependencies beyond auth.

### Integration with Pace Selectors

The time off data plugs into two places in the cascade:

1. **`dateRanges.countWeekdays`** calls throughout the cascade and Layer 5 need to become
   `countWorkingDays(range, holidaySet)` — a new utility that subtracts holidays from the
   weekday count. This affects `intervalWeekdays` in the drain loop and `computePoolDrainDate`.

2. **Per-employee `dailyRate` scaling**: In the interval simulation, if an employee has time off
   within an interval, their effective days for that interval are reduced:
   ```
   effectiveDays = intervalWeekdays - daysOffInInterval(employeeId, intervalStart, intervalEnd)
   drained = min(dailyRate × effectiveDays, remaining)
   ```

### Open Questions

- Should time off entries be stored as date ranges or as individual date records? Ranges are
  more compact; individual dates are simpler to query and diff.
  - We can use date ranges.  We can build out dateStrings.ts to handle whatever we need.
- Should the `countWorkingDays` utility live in `src/lib/primatives/dates/dateStrings` (alongside
  `countWeekdays`) or in a new pace-specific util?
  - That depends on the params of countWorkingDays.  It seems like this is more specific to pace, so we might want to create a new util.
- Do we need a "recurring holiday" concept (e.g., every Thanksgiving), or is manual entry
  sufficient for now?
  - Manual is fine.

### Key Files to Read

- `src/app/bizPlan/pace/paceSelectRefactor.ts` — every call to `dateRanges.countWeekdays` and
  `computePoolDrainDate` — these are the integration points
- `src/lib/primatives/dates/dateStrings.ts` — `countWeekdays`, `addWeekdays`, `nextWeekdayAfter`
  — the new `countWorkingDays` utility will live here or alongside it
- `src/app/bizPlan/pace/usePaceDeps.ts` — where `useTimeOff` will be added as a dependency
- Any existing data module (e.g., `src/app/schedPromise/`) as a reference for the 5-component
  pattern implementation

---

## Implementation Order

1. **Feature 0** (per-employee printed date clamping) — fixes the cascade's fundamental
   conflation of servCode-level and employee-level scheduling state. Unblocks correct behavior
   for all downstream features.
2. **Overdue Fix** — makes overdue servCodes visible to the cascade. Can be done alongside
   Feature 0 since they touch the same code block.
3. **Feature 1** (ProgCode completion date) — trivial selector addition once 0 + overdue fix
   are in place.
4. **Feature 3** (Time Off) — new data module + cascade integration. Independent of Features 1
   and 2 but improves their accuracy.
5. **Feature 2** (Optimizer) — depends on accurate cascade (0 + overdue fix) and benefits from
   Feature 3 (time off reduces effective days in the optimizer's forward pass).
