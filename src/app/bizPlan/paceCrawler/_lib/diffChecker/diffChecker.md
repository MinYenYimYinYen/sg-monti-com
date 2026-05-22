
# DiffChecker — Implementation Plan

**Feature**: `bizPlan/paceCrawler/_lib/diffChecker`

---

## Purpose

The **DiffChecker** answers the question the simulator cannot:

> *"Given the committed `servCode.dateRange`, how much price/day does each employee need to
> produce to finish on time — and how does that compare to their historical average?"*

The simulator solved for **dateRange** (given avg daily price → when does the pool drain?).
The DiffChecker inverts the equation: it uses **dateRange as a fixed input** and solves for
**required daily price**.

This is the data source for the Employee Card view — the daily deployment guide for the
production manager.

---

## Relationship to the Simulator

The DiffChecker does **not** re-run `dayCrawlSimulation`. It consumes the same upstream
inputs the simulator uses, but performs a simpler point-in-time calculation:

| Simulator | DiffChecker |
|---|---|
| Input: avg daily price | Input: `servCode.dateRange` (committed) |
| Solves for: projected end date | Solves for: required daily price |
| Walks forward day-by-day | Point-in-time ratio |
| Output: `CrawlerResult` | Output: `DiffResult` per employee × servCode |

**Shared upstream inputs** (already computed in `paceCrawlerSelect`):
- `activePoolPriceByServCode` — remaining unscheduled work pool
- `dailyRateByEmployeeByServCode` — historical avg daily price (the baseline)
- `servCode.dateRange` — the committed window (from `progServSelect.servCodeMap`)
- `mainDate` — the reference date

---

## Core Equation

For a given employee × servCode on `mainDate`:

```
remainingWeekdays = weekdaysBetween(mainDate, servCode.dateRange.max)
employeeShare     = activePool × (employeeDailyRate / teamDailyRate)
requiredDailyPrice = employeeShare / remainingWeekdays
diff              = requiredDailyPrice - historicalDailyPrice
```

**Edge cases:**
- `remainingWeekdays <= 0` → servCode is overdue; `isOverdue = true`, `requiredDailyPrice = Infinity`
- `teamDailyRate === 0` → no assigned employees with rates; `requiredDailyPrice = activePool / remainingWeekdays` (undivided)
- `activePool === 0` → servCode is done; `requiredDailyPrice = 0`, `diff = 0`
- `alwaysAsap` servCodes → no committed dateRange; excluded from DiffChecker (they are always urgent)

---

## Implementation Steps

Each step produces a single-purpose selector and a corresponding dev UI panel.
Steps are implemented in order — each builds on the previous.

---

### Step D1 — Remaining Weekdays per ServCode

**Selector**: `selectRemainingWeekdaysByServCode` → `Map<servCodeId, number>`

*"How many weekdays remain in each servCode's committed window from mainDate?"*

**Logic:**
- For each servCode with a valid `dateRange` (non-alwaysAsap):
  - `remainingWeekdays = dateRanges.weekdaysBetween(mainDate, servCode.dateRange.max)`
  - Include servCodes where `remainingWeekdays <= 0` (overdue) — the DiffChecker needs to
    flag these, not silently exclude them.
- Exclude `alwaysAsap` servCodes (no committed window).

**Reads from:** `progServSelect.servCodeMap`, `paceCrawlerSelect.mainDate`

**Dev UI**: `DiffD1RemainingWeekdaysPanel` — table: ServCode | SC Max | Remaining Weekdays
(highlight overdue in destructive, future in accent)

---

### Step D2 — Team Daily Rate per ServCode

**Selector**: `selectTeamDailyRateByServCode` → `Map<servCodeId, number>`

*"What is the combined daily rate of all assigned employees for each servCode?"*

**Logic:**
- For each servCode, sum `dailyRateByEmployeeByServCode.get(employeeId)?.get(servCodeId)`
  across all employees in `assignmentsByServCodeId.get(servCodeId)`.
- This is the denominator for computing each employee's proportional share.
- A zero team rate means no assigned employees have lookback data for this servCode.

**Reads from:** `paceCrawlerSelect.dailyRateByEmployeeByServCode`,
`assignmentPlanSelect.assignmentsByServCodeId`

**Dev UI**: `DiffD2TeamRatePanel` — table: ServCode | Team $/day | # Assigned Employees
(highlight zero-rate in destructive)

---

### Step D3 — Required Daily Price per Employee per ServCode

**Selector**: `selectRequiredDailyPriceByEmployeeByServCode`
→ `Map<employeeId, Map<servCodeId, RequiredDailyEntry>>`

*"How much price/day does each employee need to produce on each servCode to finish on time?"*

```typescript
type RequiredDailyEntry = {
  servCodeId: string;
  activePool: number;
  remainingWeekdays: number;
  employeeShare: number;       // employee's proportional share of the pool
  requiredDailyPrice: number;  // employeeShare / remainingWeekdays
  isOverdue: boolean;          // remainingWeekdays <= 0
};
```

**Logic:**
- For each employee in `assignmentsByEmployeeId`:
  - For each servCodeId in their flattened entries:
    - Skip if servCode is `alwaysAsap` (no committed window)
    - Skip if `activePool === 0` (done)
    - `employeeRate = dailyRateByEmployeeByServCode.get(employeeId)?.get(servCodeId) ?? 0`
    - `teamRate = teamDailyRateByServCode.get(servCodeId) ?? 0`
    - `employeeShare = teamRate > 0 ? activePool × (employeeRate / teamRate) : activePool`
    - `remainingWeekdays = remainingWeekdaysByServCode.get(servCodeId) ?? 0`
    - `isOverdue = remainingWeekdays <= 0`
    - `requiredDailyPrice = isOverdue ? Infinity : employeeShare / remainingWeekdays`

**Reads from:** Step D1, Step D2, `paceCrawlerSelect.activePoolPriceByServCode`,
`paceCrawlerSelect.dailyRateByEmployeeByServCode`, `assignmentPlanSelect.assignmentsByEmployeeId`

**Dev UI**: `DiffD3RequiredRatePanel` — table grouped by employee:
Employee | ServCode | Pool | Remaining Days | My Share | Required $/day
(highlight overdue in destructive)

---

### Step D4 — Diff Result per Employee per ServCode

**Selector**: `selectDiffResultByEmployeeByServCode`
→ `Map<employeeId, Map<servCodeId, DiffResult>>`

*"Is the employee ahead or behind their historical average for each servCode?"*

```typescript
type DiffResult = {
  servCodeId: string;
  requiredDailyPrice: number;   // from Step D3
  historicalDailyPrice: number; // from dailyRateByEmployeeByServCode (simulator's source of truth)
  diffPrice: number;            // required - historical (positive = need to do more, negative = ahead)
  diffPercent: number | null;   // diffPrice / historicalDailyPrice (null if historical is 0)
  isOverdue: boolean;
  isAhead: boolean;             // diffPrice < 0
  isBehind: boolean;            // diffPrice > 0
};
```

**Logic:**
- For each employee × servCode entry from Step D3:
  - `historicalDailyPrice = dailyRateByEmployeeByServCode.get(employeeId)?.get(servCodeId) ?? 0`
  - `diffPrice = requiredDailyPrice - historicalDailyPrice`
  - `diffPercent = historicalDailyPrice > 0 ? diffPrice / historicalDailyPrice : null`
  - `isAhead = diffPrice < 0`, `isBehind = diffPrice > 0`

**Reads from:** Step D3, `paceCrawlerSelect.dailyRateByEmployeeByServCode`

**Dev UI**: `DiffD4DiffResultPanel` — table grouped by employee:
Employee | ServCode | Historical $/day | Required $/day | Diff $ | Diff %
(green = ahead, red = behind, destructive = overdue)

---

### Step D5 — Employee Card Data (Final Assembly)

**Selector**: `selectEmployeeCardData` → `EmployeeCardData[]`

*"One card per assigned employee with all display data assembled."*

```typescript
type OpenServCodeRow = {
  servCodeId: string;
  historicalDailyPrice: number;
  requiredDailyPrice: number;
  diffPrice: number;
  diffPercent: number | null;
  poolRemaining: number;
  remainingWeekdays: number;
  isOverdue: boolean;
  isAhead: boolean;
  isBehind: boolean;
};

type EmployeeCardData = {
  employee: Employee;
  isAlreadyRouted: boolean;
  openServCodes: OpenServCodeRow[];   // open on mainDate, pool > 0, priority-ordered
  assignedServCodeIds: string[];      // all assigned (for context)
};
```

**"Open on mainDate"** criteria (same as employeeCardPlan.md):
1. ServCode is in the employee's assignment plan entries
2. `mainDate` is within `servCode.dateRange` OR `alwaysAsap === true`
3. `activePool > 0`

**isAlreadyRouted**: employee has any printed service (`status === "$"`) with
`lastAssigned.schedDate === mainDate`

**Sorting**: employees with open servCodes first (by name), then employees with no open servCodes.

**Reads from:** Step D4, `paceCrawlerSelect.activePoolPriceByServCode`,
`assignmentPlanSelect.assignmentsByEmployeeId`, `progServSelect.servCodeMap`,
`employeeSelect.employeeMap`, `deepSelect.servCodes`, `paceCrawlerSelect.mainDate`

**Dev UI**: `DiffD5EmployeeCardPanel` — the actual Employee Card grid (replaces the
placeholder in `EmployeeCardPanel.tsx`). One card per employee showing open servCodes with
historical vs required $/day and diff indicators.

---

## File Plan

| File | Action |
|---|---|
| `_lib/diffChecker/diffChecker.md` | This document |
| `_lib/diffChecker/DiffCheckerTypes.ts` | `RequiredDailyEntry`, `DiffResult`, `OpenServCodeRow`, `EmployeeCardData` |
| `employeeCardSelect.ts` | Add selectors D1–D5 (chained, exported) |
| `devComponents/diffChecker/DiffD1RemainingWeekdaysPanel.tsx` | Dev UI for Step D1 |
| `devComponents/diffChecker/DiffD2TeamRatePanel.tsx` | Dev UI for Step D2 |
| `devComponents/diffChecker/DiffD3RequiredRatePanel.tsx` | Dev UI for Step D3 |
| `devComponents/diffChecker/DiffD4DiffResultPanel.tsx` | Dev UI for Step D4 |
| `devComponents/diffChecker/DiffD5EmployeeCardPanel.tsx` | Dev UI for Step D5 (final card) |
| `page.tsx` | Add second `TabsList` row for DiffChecker tabs (D1–D5) |

---

## Page Layout — Second Tab Row

The existing `page.tsx` has one `TabsList` with simulator dev tabs. We add a second
`TabsList` row below it for the DiffChecker steps:

```
Row 1 (existing): Next Date | Open Floor | Lookback | Daily Rate | Active Pool |
                  Crawl Result | Delta Map | Assignments | Timeline | SC Timeline |
                  Gantt | Employee Plan

Row 2 (new):      D1: Remaining Days | D2: Team Rate | D3: Required Rate |
                  D4: Diff Result | D5: Employee Cards
```

Both rows share the same `<Tabs>` wrapper (same `value` namespace), so only one panel
is visible at a time.

---

## What We're NOT Building (in this phase)

- Group entry DiffChecker (groups use `totalAvgDailyPrice` — a separate calculation)
- Editing controls on the Employee Card
- Persistence of DiffChecker results
- CSP (count/size) dimensions — price only throughout

---

## Implementation Order

1. `DiffCheckerTypes.ts` — define all types
2. Step D1 selector + `DiffD1RemainingWeekdaysPanel`
3. Step D2 selector + `DiffD2TeamRatePanel`
4. Step D3 selector + `DiffD3RequiredRatePanel`
5. Step D4 selector + `DiffD4DiffResultPanel`
6. Step D5 selector + `DiffD5EmployeeCardPanel`
7. Wire second tab row into `page.tsx`
