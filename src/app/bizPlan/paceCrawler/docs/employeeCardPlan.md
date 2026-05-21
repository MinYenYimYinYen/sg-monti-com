# Employee Card Plan — Plan

**Phase 1 Plan** | Feature: `bizPlan/paceCrawler/employeeCardPlan`

---

## Purpose

Give the production manager a daily deployment view: one card per employee showing which
servCodes they should be routing today and how much to route (in dollars). This replaces the
need to mentally cross-reference the Gantt chart with the assignment plan.

The view is read-only — no prioritization controls, no date editing, no add/remove servCode.
The manager uses the Assignments tab to configure priorities and the Gantt tab to apply
optimized ranges; this tab is purely for daily execution.

---

## What We're Building

### Employee Cards (flex-wrap grid)

One card per assigned employee. Layout mirrors `EmployeePace` but stripped of all editing
controls and pace bars.

**Card header**: Employee name | "Already Routed" badge (if employee has any printed service
with `schedDate === mainDate`)

**Card body**: Priority-ordered list of open servCodes for this employee on `mainDate`.
A servCode is "open" if:
1. It is in the employee's assignment plan entries (single or group member)
2. `mainDate` is within `servCode.dateRange` (or `alwaysAsap === true`)
3. `activePoolPriceByServCode.get(servCodeId) > 0` (has unscheduled work)

Each servCode row shows:
- ServCode ID (font-mono)
- **`$X,XXX/day`** — employee's daily rate for this servCode (the "route this much" number)
  = `dailyRateByEmployeeByServCode.get(employeeId)?.get(servCodeId) ?? 0`
- **`$X,XXX remaining`** — pool remaining (secondary context)
  = `activePoolPriceByServCode.get(servCodeId) ?? 0`

**Empty state**: "No open servCodes on this date"

### Urgent Card

Copied from `pace/employee/components/UrgentServCodeCard.tsx` and simplified:
- No CSP objects — uses `service.price` directly
- Same checklist popover (reuses `urgentSlice` / `urgentSelect` / `urgentActions` as-is)
- Placed first in the card grid (same position as in `EmployeePace`)

### Toolbar

`DatePicker` dispatching `paceCrawlerActions.setMainDate` — same pattern as `EmployeePace`.

---

## The Story — Selector Pipeline

All selectors live in `employeeCardPlanSelect.ts`. They read from `paceCrawlerSelect` and
other existing selectors — no new computation is introduced.

### Layer 1 — Already Routed flag per employee

**`selectAlreadyRoutedByEmployee`** → `Set<employeeId>`

*"Which employees have already been routed for mainDate?"*

= Scan `deepSelect.servCodes` → filter services where `status === "$"` AND
  `lastAssigned.schedDate === mainDate` → collect `lastAssigned.employeeId`

Reads from: `deepSelect.servCodes`, `paceCrawlerSelect.mainDate`

---

### Layer 2 — Open ServCode Rows per Employee

**`selectEmployeeCardRows`** → `Map<employeeId, OpenServCodeRow[]>`

*"For each assigned employee, which servCodes are open today and what are their rates?"*

```typescript
type OpenServCodeRow = {
  servCodeId: string;
  dailyRate: number;    // employee's $/day for this servCode
  poolRemaining: number; // active+asap pool price
};
```

For each employee in `assignmentPlanSelect.assignmentsByEmployeeId`:
- Flatten their entries (preserving priority order)
- For each servCodeId: check open conditions (dateRange contains mainDate or alwaysAsap, pool > 0)
- Look up `dailyRate` from `paceCrawlerSelect.dailyRateByEmployeeByServCode`
- Look up `poolRemaining` from `paceCrawlerSelect.activePoolPriceByServCode`

Reads from: `assignmentPlanSelect.assignmentsByEmployeeId`,
`progServSelect.servCodeMap`, `paceCrawlerSelect.dailyRateByEmployeeByServCode`,
`paceCrawlerSelect.activePoolPriceByServCode`, `paceCrawlerSelect.mainDate`

---

### Layer 3 — Employee Card Data

**`selectEmployeeCardPlanData`** → `EmployeeCardPlanData[]`

*"One card per assigned employee with all display data assembled."*

```typescript
type EmployeeCardPlanData = {
  employee: Employee;
  isAlreadyRouted: boolean;
  openServCodes: OpenServCodeRow[]; // priority-ordered, open only
};
```

Sorted: employees with open servCodes first (by name), then employees with no open servCodes.

Reads from: `employeeSelect.employeeMap`, Layer 1, Layer 2,
`assignmentPlanSelect.assignmentsByEmployeeId`

---

### Layer A — Urgent ServCodes (added to `paceCrawlerRawSelect`)

**`selectUrgentServCodes`** → `ServCodeDeep[]`

*"Which servCodes are urgent (asap or overdue) and have active/asap services with price > 0?"*

= Filter `deepSelect.servCodes`:
  - `alwaysAsap === true` OR (`dateRange.max` is valid AND `today > dateRange.max`)
  - Has at least one service with `status` in active/asap AND `service.price > 0`

Reads from: `deepSelect.servCodes`, `paceCrawlerSelect.mainDate`

The `UrgentServCodeCard` copy in `paceCrawler/devComponents/` reads from this selector
instead of `servCodePaceSelect.urgentServCodePaces`.

---

## File Plan

| File | Action |
|---|---|
| `paceCrawler/employeeCardPlanSelect.ts` | New — Layers 1–3 |
| `paceCrawler/paceCrawlerRawSelect.ts` | Add Layer A (`selectUrgentServCodes`) |
| `paceCrawler/devComponents/EmployeeCardPlanPanel.tsx` | New — card grid + DatePicker toolbar |
| `paceCrawler/devComponents/UrgentServCodeCard.tsx` | Copied from `pace/`, simplified (price-only) |
| `paceCrawler/page.tsx` | Add "Employee Plan" tab |

---

## State Dependencies

| State | Source | Notes |
|---|---|---|
| `state.paceCrawler.mainDate` | `paceCrawlerSlice` | Already exists ✅ |
| `state.urgent.checkedServIds` | `urgentSlice` | Already in root reducer ✅ |
| `state.urgent.expandedServCodeIds` | `urgentSlice` | Already in root reducer ✅ |

No new Redux state needed.

---

## What We're NOT Building

- Pace indicator bars
- Prioritization controls (up/down arrows)
- Date range editing
- Add/remove servCode
- CSP objects — price only throughout

---

## Implementation Order (Phase 2)

### A1: Layer A — `selectUrgentServCodes` in `paceCrawlerRawSelect`
### A2: Copy + simplify `UrgentServCodeCard` → `paceCrawler/devComponents/UrgentServCodeCard.tsx`
### A3: `employeeCardPlanSelect.ts` — Layers 1–3
### A4: `EmployeeCardPlanPanel.tsx` + "Employee Plan" tab in `page.tsx`
