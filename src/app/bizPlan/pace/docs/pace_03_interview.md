# Pace — Employee Pace Feature: Phase 1 Interview

## Extension Index: `pace_03`

This document records the Phase 1 interview for the employee pace feature. Questions are asked
in dependency order — answers to earlier questions constrain later ones. Unanswered questions are
marked **OPEN**.

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

**A:** **Per-servCode only.** If no historical data exists for an employee on a given servCode
within the lookback window, the result is `null`. The feature must handle `null` gracefully
(display as "no data", exclude from averages, etc.).

---

## Q4 — Lookback window

**Q:** How far back should we look?

**A:** **User configurable** — either a date picker or a number-of-days input (weekdays only).
`dateStrings.ts` has weekday utilities (`isWeekDay`, `countWeekdays`) and may need expansion.

**Default for now:** current season only. A future special case may consider all loaded
customers/services for season-end evaluation or next-season planning.

`dateRanges.countWeekdays` already exists and can count weekdays in a range.

---

## Q5 — Completion rate definition

**Q:** What does "completion rate" mean? How do we use `AssignmentDoc[]`?

**A:** `AssignmentDoc[]` on a service is ordered. If an `AssignmentDoc` is **not the last one**
in the array, the employee did not complete the service on that scheduled date — it was
rescheduled. The last `AssignmentDoc` represents the final assignment.

From this we can build a selector: **per employee, per servCode, per scheduled date** — how much
work was assigned vs. how much was completed.

**Handling "rain-out" / absence days:**
- If an employee completed **0 jobs** on a given day, that day should be **excluded** from the
  lookback accumulation — it is not a representation of capacity.
- A **user-configurable threshold** should also be supported: if the employee completed less than
  X% of their assigned work on a day, exclude that day from the lookback. This covers partial
  rain-outs.
- We do not have a way to determine *why* a day was missed (absence, weather, PTO, holiday). This
  is an accepted data gap for now.

---

## Q6 — Employee view (inversion of current servCode view) — **OPEN**

**Q:** Should the employee view be a new top-level panel/page, or a drill-down from the existing
pace list (e.g., click an employee → see all their servCodes)?

**A:** *(Not yet answered)*

---

## Q7 — Priority when an employee has multiple servCodes on a given date — **OPEN**

**Q:** Is priority manually set by the production manager, or derived automatically (e.g., most
urgent category first, then earliest deadline)? Or is this purely a display/sort concern?

**A:** *(Not yet answered)*

---

## Q8 — Timeline view — **OPEN**

**Q:** What does the timeline represent — a calendar of scheduled dates with workload per day, a
projection of completion at current pace, or both? What is the time axis (days/weeks)? What is
the primary entity on the y-axis (employees, servCodes, or both)?

**A:** *(Not yet answered)*

---

## Q9 — Scope: one extension or split? — **OPEN**

**Q:** Should this be one `pace_03` extension covering all 7 concerns, or split into
`pace_03_employeeLookback` (data/metrics) and `pace_04_employeeView` (UI)?

**A:** *(Not yet answered)*

---

## Notes on `dateStrings.ts`

Current weekday utilities available:
- `dateStrings.isWeekDay(date)` — boolean
- `dateStrings.nextMonday(date)` — string
- `dateStrings.todayToWeekday()` — string
- `dateRanges.countWeekdays(dateRange)` — number

May need to add:
- `weekdaysAgo(n)` — go back N weekdays from today (for configurable lookback window)
- `countWeekdaysBetween(start, end)` — alias or variant of `countWeekdays` for clarity
