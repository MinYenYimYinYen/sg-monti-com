# Planned Time Off — Plan

## Overview

We need to be able to plan time off. Planned time off should be considered in the pace workflow. The Employee cards in the employee plan tab should show planned time off per employee. The crawler function should not include planned time off as a production day for the employee. Admins will manage time off via a calendar page with a CRUD workflow. We also want a full-screen desktop calendar view of planned time off.

---

## Types

### `PlannedTimeOff` (`src/app/plannedTimeOff/plannedTimeOffTypes.ts`)

```typescript
import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { TRange } from "@/lib/primatives/tRange/TRange";

export type PlannedTimeOff = CreatedUpdated & {
  plannedTimeOffId: string; // UUID, generated at creation time
  employeeId: string;
  dateRange: TRange<string>; // single day = min === max
  note: string;
};
```

- Always uses `dateRange` — a single day is represented as `min === max`.
- `plannedTimeOffId` is a UUID generated at object creation time (client-side via `crypto.randomUUID()`).
- No `Doc`/`Props` suffix — flat type with `CreatedUpdated` directly.

### `Holiday` (`src/app/holiday/holidayTypes.ts`)

```typescript
import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { TRange } from "@/lib/primatives/tRange/TRange";

export type Holiday = CreatedUpdated & {
  holidayId: string; // UUID, generated at creation time
  description: string;
  dateRange: TRange<string>; // single day = min === max
};
```

- Separate type from `PlannedTimeOff` — different purpose (company-wide vs. per-employee).
- Always uses `dateRange` — supports multi-day shutdowns.
- No `employeeId` — holidays apply to all employees.

### `Employee` hydration (`EmployeeTypes.ts`)

`EmployeeProps` gains a `plannedTimeOff` field:

```typescript
export type EmployeeProps = {
  servCodeIds: string[];
  plannedTimeOff: PlannedTimeOff[]; // hydrated in employeeSelect from plannedTimeOffSelect.byEmployeeId
};
```

---

## Data Modules (5-component pattern)

### PlannedTimeOff (`src/app/plannedTimeOff/`)

| File | Purpose |
|---|---|
| `PlannedTimeOffModel.ts` | Mongoose schema; `plannedTimeOffId` indexed unique |
| `api/PlannedTimeOffContract.ts` | `getAll`, `upsert`, `deleteOne` (by `plannedTimeOffId`) |
| `api/route.ts` | `createRpcHandler` |
| `plannedTimeOffSlice.ts` | Stores `PlannedTimeOff[]`; handles getAll/upsert/deleteOne |
| `plannedTimeOffSelect.ts` | `selectAll`, `selectByEmployeeId: Map<string, PlannedTimeOff[]>` |
| `usePlannedTimeOff.ts` | Dispatches `getAll` on mount |

### Holiday (`src/app/holiday/`)

| File | Purpose |
|---|---|
| `HolidayModel.ts` | Mongoose schema; `holidayId` indexed unique |
| `api/HolidayContract.ts` | `getAll`, `upsert`, `deleteOne` (by `holidayId`) |
| `api/route.ts` | `createRpcHandler` |
| `holidaySlice.ts` | Stores `Holiday[]`; handles getAll/upsert/deleteOne |
| `holidaySelect.ts` | `selectAll`, `selectHolidayDates: Set<string>` (all weekday dates covered by any holiday range) |
| `useHoliday.ts` | Dispatches `getAll` on mount |

---

## Employee Hydration

`employeeSelect.ts` — `selectEmployees` gains `plannedTimeOffSelect.byEmployeeId` as an input selector. Each employee gets `plannedTimeOff: byEmployeeId.get(employeeId) ?? []`.

---

## Crawler Integration (Option B — mid-crawl skip)

`DayCrawlEmployeeEntry` gains:
```typescript
timeOffDates: Set<string>; // ISO date strings on which this employee is on leave
```

In `runDayCrawlSimulation`, the per-employee inner loop adds a guard before draining:
```typescript
if (employee.timeOffDates.has(day)) continue; // skip — employee is on leave or holiday
```

`paceCrawlerSelect.selectCrawlerResult` builds `timeOffDates` per employee by:
1. Expanding each `PlannedTimeOff.dateRange` into individual weekday date strings
2. Unioning with the global `holidaySelect.holidayDates` set (holidays apply to all employees)

---

## Employee Card Badges

`EmployeeCardData` gains two new boolean fields:
```typescript
isOnLeave: boolean;  // personal PlannedTimeOff covers mainDate
isHoliday: boolean;  // a Holiday covers mainDate
```

The card header shows (in addition to the existing "⚠ Routed" badge):
- `isOnLeave` → `"🏖 On Leave"` badge (`text-accent` styling)
- `isHoliday` → `"🎉 Holiday"` badge (`text-secondary` styling)

These are distinct badges so the manager can tell the difference between individual time off and a company holiday.

---

## Calendar Page (`src/app/plannedTimeOff/calendar/`)

**Route**: `/plannedTimeOff/calendar`

**Dependencies** (lightweight — no pace crawler deps):
- `usePlannedTimeOff({ autoLoad: true })`
- `useHoliday({ autoLoad: true })`
- `useEmployee({ autoLoad: true })`

**Layout**:
- Full-screen desktop grid
- Defaults to current month; prev/next month navigation arrows
- 5 columns (Mon–Fri), enough rows for all weekdays of the month
- Each weekday cell shows:
  - Employee name chips for employees on leave that day
  - Holiday label if a holiday covers that day
- `+` icon in each cell opens a **Sheet/Drawer** with:
  - Search text input (filters by `employeeId` or `name`, case-insensitive)
  - Employee dropdown (filtered by search)
  - `dateRange` picker (defaults to clicked cell's date for both min and max)
  - `note` field
  - Save / Cancel

**Nav menu**: Added to `schedulingSection` in `NavMenu.tsx`:
```typescript
{ title: "Time Off Calendar", href: "/plannedTimeOff/calendar", roles: ["admin", "office"] }
```

---

## Holiday CRUD Page (`src/app/holiday/page.tsx`)

Simple admin CRUD page:
- Left panel: scrollable list of holidays (description + date range)
- Right panel: form to create/edit (description, dateRange picker, Save/Delete)

**Nav menu**: Added to `schedulingSection` (admin-only):
```typescript
{ title: "Holidays", href: "/holiday", roles: ["admin"] }
```

---

## Root Reducer

Add to `src/store/reducers/index.ts`:
```typescript
plannedTimeOff: plannedTimeOffReducer,
holiday: holidayReducer,
```

## `usePaceCrawlerDeps`

Add:
```typescript
usePlannedTimeOff({ autoLoad: true });
useHoliday({ autoLoad: true });
```
