# Pace Module — Documentation

## Purpose

The Pace module answers two related questions for a production manager:

1. **Season planning** — Given the current servCode assignments and date ranges, will we finish everything on time? *(Assignment Matrix)*
2. **Daily scheduling** — For the servCodes that are active right now, are we on pace, and how much work should I schedule for each employee today? *(Employee Pace)*

---

## The Two Views

### Assignment Matrix (`/bizPlan/assignmentPlan/matrix`)

A spreadsheet-style view where **rows are programs/servCodes** and **columns are employees**. Checkboxes at each intersection indicate whether that employee is assigned to that servCode.

**Intended use:** High-level season planning. The manager uses this view to:
- Assign employees to servCodes across the whole season
- See at a glance which programs are covered and which are not
- Identify programs that are behind or ahead of pace (delta days badges)
- Filter and sort by date range, assignment status, pace category, or delta days

The matrix is not a daily tool — it's a planning canvas for the season.

### Employee Pace (`/bizPlan/pace/employee`)

A card-per-employee view showing each employee's current workload relative to their historical capacity.

**Intended use:** Daily scheduling. The manager uses this view to:
- See which servCodes are active and how much unfinished work remains
- Understand how much of each employee's daily capacity is consumed by their assigned servCodes
- Identify overloaded or underloaded employees before printing routes
- Spot servCodes that are behind schedule (asap/overdue categories)

---

## Core Concepts

### ServCode and ProgCode

Data comes from RealGreen. A **ProgCode** (program code) groups one or more **ServCodes** (service codes). Each servCode has a date range (season window), a set of services (individual customer jobs), and a list of assigned employees.

### CountSizePrice (CSP)

All work quantities are expressed as a `CountSizePrice` object — see `Service` type for field definitions. The three primary dimensions used throughout the pace module are:

- **Count** — number of service jobs
- **Size** — total area (sq ft)
- **Price** — revenue

All three are tracked independently. Delta projections and capacity fractions are computed per-dimension.

### PaceCategory

Each servCode is classified into one of five categories based on its date range and the `alwaysAsap` flag:

| Category | Meaning |
|---|---|
| `asap` | `alwaysAsap` flag is set — always treated as urgent regardless of date |
| `overdue` | Today is past `dateRange.max` |
| `inProgress` | Today is within `dateRange.min`–`dateRange.max` |
| `notStarted` | Today is before `dateRange.min` |
| `notSet` | No valid date range configured |

**`alwaysAsap`** is used for incidental, unplannable servCodes — service calls, curatives, and similar work that has no fixed season window.

---

## Data Pipeline

### Layer 1 — Raw Pace (`rawPaceSelect.ts`)

Computes basic finished/unfinished CSP totals and rates for each servCode, with no employee-level logic.

Key outputs:
- `unfinishedCSP` — total remaining work (active + asap + printed services)
- `unfinishedRate` — remaining work ÷ days remaining in date range
- `finishedCSP` — completed work (status `S`, active program)
- `finishedRate` — completed work ÷ days elapsed

**Per-day variant** (`RawServCodePacePerDay`):
- `activeAsapCSP` — unfinished work excluding printed (committed) services
- `unfinishedPerDay` — `activeAsapCSP` ÷ days remaining after the last printed schedDate
- `projectionStartDate` — the day after the latest printed schedDate (or today if no printed services)

The per-day variant excludes printed services from the numerator because they are already committed to specific dates. This prevents the delta from fluctuating intraday as today's route is completed.

### Layer 2 — Employee Lookback (`employeeLookbackUtils.ts`, `paceSelect.ts`)

Builds a historical production profile for each employee, grouped by **programType** (a CRM field on each ProgCode).

**Lookback window** — configurable via `lookbackConfig.lookbackStart`. The window includes both completed services (by `doneDate`) and printed services (by `schedDate`). Printed services are treated as effectively done because they are committed to a specific date.

**Valid production dates** — not every date in the window is used. A date is excluded if:
- No services were completed or printed on it, OR
- The completion ratio (`effectiveCount / assignedCount`) is below `completionThreshold`

The `completionThreshold` is a rain-out / sick-day filter. A threshold of 0.5 means any day where fewer than 50% of scheduled jobs were completed is excluded from the lookback. A threshold of 0 (default) disables the filter and includes all days with any production.

**LookbackStats** (per employee, per programType):
- `avgDailyCSP` — mean daily production for this programType
- `maxDailyCSP` — best single day for this programType
- `totalAvgDailyCSP` — mean daily production across **all** programTypes (used as the capacity ceiling)
- `totalMaxDailyCSP` — best single day across all programTypes (display only — not used as ceiling because it's a per-dimension phantom that was never actually achieved in a single day)

### Layer 3 — Capacity Cascade (`paceSelect.ts → selectServCodePaces`)

Allocates each employee's daily capacity across their assigned servCodes in **priority order** (the order defined in the assignment plan).

For each employee, in priority order:
1. Initialize remaining capacity = `totalAvgDailyCSP`
2. For each servCode, compute the employee's **weighted share** of the servCode's demand, proportional to their `avgDailyCSP` relative to the team total for that programType
3. Allocate `min(remaining, weightedShare)` — higher-priority servCodes get first claim on capacity
4. Deduct from remaining capacity

Employees without lookback data for a programType receive an **even-split fallback**: their share is `1 / teamTotal` (neutral weight), where `teamTotal` includes 1 unit per unknown employee.

**`fractionConsumed`** — each allocation's `expectedCSP` divided by `totalAvgDailyCSP`. Summing across all allocations gives the employee's total load as a fraction of a typical day. Values > 1.0 indicate overload.

### Layer 4 — Delta Projection (`paceSelect.ts → selectServCodePaceDeltaMap`)

Projects a completion date for each servCode and computes `deltaDays` — how many weekdays ahead of or behind the `dateRange.max` the team is projected to finish.

Formula:
```
daysNeeded = activeAsapCSP.count / rawTeamAvgCount
projectedEndDate = addWeekdays(projectionStart, daysNeeded)
deltaDays = weekdaysBetween(dateRange.max, projectedEndDate)
```

- Positive `deltaDays` = behind schedule (will finish after the deadline)
- Negative `deltaDays` = ahead of schedule
- Within ±2 days = on pace (green in the UI)

**`rawTeamAvgCount`** = sum of `avgDailyCSP.count` for all assigned employees with lookback data. Employees without lookback data are estimated at the **per-programType team average** of the employees who do have data — so a new tech assigned alongside an experienced one is not invisible to the projection.

This layer uses no cascade or capacity deduction — it's a simple throughput projection for the matrix display.

---

## CRM Dependencies and Gotchas

### programType

The lookback and delta projection both group work by `programType`, a field set on each ProgCode in RealGreen. **This field must be correctly set** for the pace calculations to be meaningful.

- If two unrelated ProgCodes share the same `programType`, their lookback rates will be pooled, inflating the projected throughput.
- **Special Jobs gotcha**: Special Jobs have two `programType` fields in the CRM — one at the top of the Service setup page and one at the bottom. The **bottom field** is the one used here. Both must be set correctly.

### alwaysAsap

ServCodes with `alwaysAsap = true` bypass date range logic entirely and are always categorized as `asap`. Use this for incidental work (service calls, curatives) that has no fixed season window.

---

## Redux State (`paceSlice.ts`)

### `lookbackConfig`
- `lookbackStart` — ISO date string; start of the lookback window
- `completionThreshold` — 0–1; minimum completion ratio for a date to be included in lookback. 0 = include all days with any production.

### `matrixDisplayConfig`
Controls the Assignment Matrix display:
- `sortKey` — sort progCodes by `dateRange`, `assignedCount`, or a CSP dimension
- `filterAssigned` — show all / only assigned / only unassigned
- `filterCategories` — filter by pace category (empty = show all)
- `filterDeltaDays` — slider range filter on delta days (null = disabled)
- `cspDisplay` — which CSP variant to show in row headers: `total`, `perDay`, or `perDayPerEmployee`

---

## File Map

| File | Role |
|---|---|
| `RawPaceTypes.ts` | Types for raw (pre-employee) pace data |
| `PaceType.ts` | Types for employee-aware pace data and UI types |
| `rawPaceSelect.ts` | Layer 1 selectors — raw CSP totals and per-day rates |
| `paceSelect.ts` | Layers 2–4 — lookback, cascade, delta projection, matrix filters |
| `paceSlice.ts` | Redux state — lookback config and matrix display config |
| `_lib/employeeLookbackUtils.ts` | Pure functions for lookback accumulation and stats |
| `employee/` | Employee Pace view components and slice |
| `components/` | Shared pace UI components |
| `assignmentPlan/matrix/` | Assignment Matrix view (separate folder under `bizPlan`) |
