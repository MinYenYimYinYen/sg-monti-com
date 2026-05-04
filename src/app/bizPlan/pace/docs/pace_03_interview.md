# Pace — Employee Pace Feature: Phase 1 Interview

## Extension Index: `pace_03`

This document records the Phase 1 interview for the employee pace feature. Questions are asked
in dependency order — answers to earlier questions constrain later ones.

---

## Background

The current `ServCodePace.employeeShares` splits required daily pace evenly across all assigned
employees. This is inaccurate because:

1. An employee may be assigned to more than one `servCode` simultaneously.
2. Employees vary in production capacity — some do more small jobs, others fewer large ones.

A "lookback" on historical employee production is needed to address both problems.

**Available data:**
- `ServCodePace.finishedCSP` — already computed; total finished work per servCode
- `Service.production.doneBys[]` — which employees completed a finished service and at what percent
- `Service.doneDate` — when the service was completed
- `ServiceDocProps.assignments[]` — `AssignmentDoc[]` per service; tracks scheduled dates and employees
- `AssignmentDoc.schedDate`, `.employeeId`, `.status` — scheduled date, assigned employee, status

---

## Q1 — Unit of production

**Q:** What is the unit of employee production?

**A:** Any property of `CountSizePrice` (count, size, price). The production manager would be
interested in all three. `count` is the default — easiest to reason about when scheduling — but
the UI should support switching to `size` or `price`.

`CountSizePriceOps` already provides the math abstractions needed.

---

## Q2 — `DoneBy.percent` reliability

**Q:** Is `DoneBy.percent` reliable? The remap function has a `//todo` noting uncertainty about
whether `1` means 1% or 100%.

**A:** The data is believed to be reliable. The `//todo` is a reminder to verify the remap: if
RealGreen sends `1` to mean 1%, the remap should divide by 100. For this feature, **assume
`percent` comes across as a decimal (e.g., `0.01` = 1%, `1.0` = 100%)**.

An employee's contribution to a finished service = `service.size * doneBy.percent` (or count/price
equivalent).

---

## Q3 — Lookback scope: per-servCode or cross-servCode?

**Q:** Should the lookback be scoped to a specific `servCode`, or cross-servCode?

**A:** **Per `programType`** (not per servCode, not cross-all). The lookback groups finished
services by `servCode.progCode.programType`. This handles:
- Seamless transitions between servCodes of the same type (e.g., LR1 → LR2)
- Cross-progCode groupings (e.g., P01, PIV, PCI are all pest control and share a programType)

If no historical data exists for an employee on a given `programType` within the lookback window,
the result is `null`. The feature must handle `null` gracefully (display as "no data", exclude
from averages, etc.).

---

## Q4 — Lookback window

**Q:** How far back should we look?

**A:** **User configurable** — either a date picker or a number-of-days input (weekdays only).
`dateStrings.ts` has weekday utilities (`isWeekDay`, `countWeekdays`) and may need expansion.

**Default for now:** current season only. A future special case may consider all loaded
customers/services for season-end evaluation or next-season planning.

`dateRanges.countWeekdays` already exists and can count weekdays in a range.

**Possible `dateStrings.ts` additions needed:**
- `weekdaysAgo(n)` — go back N weekdays from today (for configurable lookback window)

---

## Q5 — Completion rate and "missed day" exclusion

**Q:** What does "completion rate" mean? How do we use `AssignmentDoc[]`?

**A:** `AssignmentDoc[]` on a service is ordered. If an `AssignmentDoc` is **not the last one**
in the array, the employee did not complete the service on that scheduled date — it was
rescheduled. The last `AssignmentDoc` represents the final assignment.

From this we can build a selector: **per employee, per `programType`, per scheduled date** —
how much work was assigned vs. how much was completed.

**Handling "rain-out" / absence days:**
- If an employee completed **0 jobs** on a given date, that date should be **excluded** from the
  lookback accumulation — it is not a representation of capacity.
- A **user-configurable threshold** should also be supported: if the employee completed less than
  X% of their assigned work on a date, exclude that date from the lookback. This covers partial
  rain-outs.
- Invalidation is **per date only** — not per employee and not per servCode. If a date is
  invalidated, all assignments on that date are excluded.
- We do not have a way to determine *why* a day was missed (absence, weather, PTO, holiday). This
  is an accepted data gap for now.

**Isolation note:** Because the completion-rate / missed-day logic is ambiguous and likely to be
refactored, it should be isolated in its own file(s) to minimize maintenance surface.

**Future extension — `SkipReason` (documented, not built now):**
A future improvement would add `skipReason: SkipReason | null` to `AssignmentDoc`:

```typescript
type SkipReason = {
  reason: string;
  invalidatesAssignment: boolean;
};
```

`SkipReason` values could be hard-coded or user-defined. If user-defined, a data module would be
needed. This would allow explicit tracking of holidays, sick days, weather delays, etc., and make
the invalidation logic deterministic rather than inferred.

---

## Q6 — Employee view

**Q:** Should the employee view be a new top-level panel/page, or a drill-down from the existing
pace list?

**A:** **Drill-down for now** — clicking an employee name opens a popover showing detail for that
employee (their servCode assignments, capacity allocation, pace metrics).

A shared component should be designed so it can also be used on a future standalone employee page.
That page would require a different selector flow (different filters/sorts) and should not be
mixed into this build — document as future overhead.

---

## Q7 — Capacity allocation across multiple servCodes

**Q:** How do we calculate an employee's capacity split when assigned to multiple servCodes?

**A:** The model:

1. For each `programType` an employee is assigned to, look back at their historical production
   for that `programType` across all servCodes of that type.
2. Compute **max daily production** (single highest day) and **average daily production**
   (excluding invalidated days per Q5). Both are useful:
   - Max = "what can this person do on a good day" → capacity planning
   - Average = "what do they typically do" → realistic projection
3. For each servCode assigned to the employee, calculate the fraction of their `programType` max
   consumed by the remaining work in that servCode:
   `fractionConsumed = remainingWork / maxDailyCapacity`
4. Sum `fractionConsumed` across all assigned servCodes. If > 1.0, the employee is overloaded.
5. `freeCapacityFraction = max(0, 1 - totalFractionConsumed)`

**Output per employee (replaces current even-split `shareCSP`):**
- `maxDailyCSP` — lookback-derived max for this `programType`
- `avgDailyCSP` — lookback-derived average for this `programType`
- `shareCSP` — expected contribution based on max and remaining work (replaces even split)

**At the `ServCodePace` level:**
- Sum employee `shareCSP` values → compare to `unfinishedRate`
- Surface **delta** and **delta%** — tells the production manager whether the assigned team can
  hit the required pace

**Overloaded employee:** Surface visually (warning indicator) when `totalFractionConsumed > 1.0`.

---

## Q8 — Timeline view — *Deferred*

**Q:** What does the timeline represent?

**A:** Deferred to a future extension. Documented intent:

Timeline groups `ServCode.assignedTo[][]` by individual date. Vertical layout:
```
{date}
  Begin
    {servCode[]}: {employee[]}
```

Not needed for this build.

---

## Q9 — Scope

**Q:** One extension or split into data layer + UI?

**A:** **One extension (`pace_03`)**. Data layer without UI isn't a feature — we want to see the
result when it's done.

---

## Notes on `programType`

`ProgCode.programType` is `string | null` (from RealGreen API). Treat `null` as its own bucket
for grouping purposes — don't silently drop services with no programType.

`ServCode` → `ServCode.progCode.programType` is the path to the grouping key from a service.
`ServCodeDeep` (used in `paceSelect`) already has `progCode` hydrated, so this is accessible
without additional data fetching.
