# Planned Time Off — Implementation

See `plannedTimeOffPlan.md` for the full design rationale and architecture decisions.

---

## Implementation Order

### Step 1 — Types

**`src/app/plannedTimeOff/plannedTimeOffTypes.ts`** (replace existing):
```typescript
import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { TRange } from "@/lib/primatives/tRange/TRange";

export type PlannedTimeOff = CreatedUpdated & {
  plannedTimeOffId: string;
  employeeId: string;
  dateRange: TRange<string>;
  note: string;
};
```

**`src/app/holiday/holidayTypes.ts`** (new file):
```typescript
import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { TRange } from "@/lib/primatives/tRange/TRange";

export type Holiday = CreatedUpdated & {
  holidayId: string;
  description: string;
  dateRange: TRange<string>;
};
```

---

### Step 2 — Mongoose Models

**`src/app/plannedTimeOff/PlannedTimeOffModel.ts`** (new):
- Schema fields: `plannedTimeOffId` (String, required), `employeeId` (String, required), `dateRange` (TRangeSchema, required), `note` (String, required, default "")
- `{ timestamps: true }`
- Index: `{ plannedTimeOffId: 1 }` unique
- Use `createModel("PlannedTimeOff", schema)`

**`src/app/holiday/HolidayModel.ts`** (new):
- Schema fields: `holidayId` (String, required), `description` (String, required), `dateRange` (TRangeSchema, required)
- `{ timestamps: true }`
- Index: `{ holidayId: 1 }` unique
- Use `createModel("Holiday", schema)`

TRangeSchema (reuse pattern from `PriorityServiceModel.ts`):
```typescript
const TRangeSchema = new mongoose.Schema(
  { min: { type: String, required: true }, max: { type: String, required: true } },
  { _id: false },
);
```

---

### Step 3 — API Contracts

**`src/app/plannedTimeOff/api/PlannedTimeOffContract.ts`** (new):
```typescript
import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { PlannedTimeOff } from "@/app/plannedTimeOff/plannedTimeOffTypes";

export interface PlannedTimeOffContract extends ApiContract {
  getAll: { params: {}; result: DataResponse<PlannedTimeOff[]> };
  upsert: { params: { doc: PlannedTimeOff }; result: DataResponse<PlannedTimeOff> };
  deleteOne: { params: { plannedTimeOffId: string }; result: DataResponse<PlannedTimeOff> };
}
```

**`src/app/holiday/api/HolidayContract.ts`** (new):
```typescript
import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { Holiday } from "@/app/holiday/holidayTypes";

export interface HolidayContract extends ApiContract {
  getAll: { params: {}; result: DataResponse<Holiday[]> };
  upsert: { params: { doc: Holiday }; result: DataResponse<Holiday> };
  deleteOne: { params: { holidayId: string }; result: DataResponse<Holiday> };
}
```

---

### Step 4 — API Routes

**`src/app/plannedTimeOff/api/route.ts`** (new):
- `getAll`: `PlannedTimeOffModel.find({}).lean()` → `cleanMongoArray`
- `upsert`: `findOneAndUpdate({ plannedTimeOffId }, doc, { upsert: true, new: true })` → `cleanMongoObject`
- `deleteOne`: `findOneAndDelete({ plannedTimeOffId })` → `cleanMongoObject`
- Wrap with `createRpcHandler(handlers)`

**`src/app/holiday/api/route.ts`** (new):
- Same pattern with `HolidayModel` and `holidayId`

---

### Step 5 — Redux Slices

**`src/app/plannedTimeOff/plannedTimeOffSlice.ts`** (new):
- State: `{ docs: PlannedTimeOff[] }`
- Thunks: `getAll`, `upsert`, `deleteOne` via `createStandardThunk`
- `extraReducers`:
  - `getAll.fulfilled` → replace `state.docs`
  - `upsert.fulfilled` → find by `plannedTimeOffId` and replace, or push if new
  - `deleteOne.fulfilled` → filter out by `plannedTimeOffId`
- Export `plannedTimeOffActions`, `plannedTimeOffReducer`

**`src/app/holiday/holidaySlice.ts`** (new):
- Same pattern with `Holiday`, `holidayId`, `HolidayContract`
- Export `holidayActions`, `holidayReducer`

---

### Step 6 — Selectors

**`src/app/plannedTimeOff/plannedTimeOffSelect.ts`** (new):
```typescript
const selectDocs = (state: AppState) => state.plannedTimeOff.docs;

const selectAll = createSelector([selectDocs], (docs) => docs);

const selectByEmployeeId = createSelector(
  [selectDocs],
  (docs): Map<string, PlannedTimeOff[]> =>
    new Grouper(docs).toGroupMap((d) => d.employeeId),
);

export const plannedTimeOffSelect = { all: selectAll, byEmployeeId: selectByEmployeeId };
```

**`src/app/holiday/holidaySelect.ts`** (new):
```typescript
const selectDocs = (state: AppState) => state.holiday.docs;

const selectAll = createSelector([selectDocs], (docs) => docs);

// Expands all holiday dateRanges into individual weekday date strings.
const selectHolidayDates = createSelector(
  [selectDocs],
  (docs): Set<string> => {
    const result = new Set<string>();
    for (const holiday of docs) {
      // Walk from min to max, adding each weekday
      let day = holiday.dateRange.min;
      while (day <= holiday.dateRange.max) {
        if (dateStrings.isWeekDay(day)) result.add(day);
        day = dateStrings.addDays(day, 1);
      }
    }
    return result;
  },
);

export const holidaySelect = { all: selectAll, holidayDates: selectHolidayDates };
```

---

### Step 7 — Hooks

**`src/app/plannedTimeOff/usePlannedTimeOff.ts`** (new):
```typescript
export function usePlannedTimeOff({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (autoLoad) {
      dispatch(plannedTimeOffActions.getAll({ params: {}, config: { loadingMsg: "Loading time off..." } }));
    }
  }, [autoLoad, dispatch]);
}
```

**`src/app/holiday/useHoliday.ts`** (new):
- Same pattern with `holidayActions.getAll`

---

### Step 8 — Root Reducer

**`src/store/reducers/index.ts`** — add imports and entries:
```typescript
import { plannedTimeOffReducer } from "@/app/plannedTimeOff/plannedTimeOffSlice";
import { holidayReducer } from "@/app/holiday/holidaySlice";

// In combineReducers:
plannedTimeOff: plannedTimeOffReducer,
holiday: holidayReducer,
```

---

### Step 9 — Employee Hydration

**`src/app/realGreen/employee/types/EmployeeTypes.ts`**:
- Add `import { PlannedTimeOff } from "@/app/plannedTimeOff/plannedTimeOffTypes";`
- Add `plannedTimeOff: PlannedTimeOff[];` to `EmployeeProps`

**`src/app/realGreen/employee/employeeSelect.ts`**:
- Add `plannedTimeOffSelect.byEmployeeId` as a new input to `selectEmployees`
- Map each doc: `plannedTimeOff: byEmployeeId.get(doc.employeeId) ?? []`

---

### Step 10 — Crawler Integration

**`src/app/bizPlan/paceCrawler/PaceCrawlerTypes.ts`**:
- Add `timeOffDates: Set<string>;` to `DayCrawlEmployeeEntry`

**`src/app/bizPlan/paceCrawler/_lib/dayCrawlSimulation.ts`**:
- In the per-employee section of the day loop (after `const prevEntryLabel = ...`), add:
  ```typescript
  if (employee.timeOffDates.has(day)) {
    // Employee is on leave — treat as downtime without recording a downtime event
    lastWorkedEntryLabel.set(employee.employeeId, null);
    continue;
  }
  ```
  > Note: We skip silently (no downtime event recorded) so the timeline doesn't get cluttered with leave entries. The projected end date naturally shifts later.

**`src/app/bizPlan/paceCrawler/paceCrawlerSelect.ts`**:
- Add `employeeSelect.employees` and `holidaySelect.holidayDates` as inputs to `selectCrawlerResult`
- When building `DayCrawlEmployeeEntry[]`, compute `timeOffDates` per employee:
  ```typescript
  // Build timeOffDates: personal PTO dates ∪ global holiday dates
  const timeOffDates = new Set<string>(holidayDates);
  const employee = employeeMap.get(employeeId);
  if (employee) {
    for (const pto of employee.plannedTimeOff) {
      let day = pto.dateRange.min;
      while (day <= pto.dateRange.max) {
        if (dateStrings.isWeekDay(day)) timeOffDates.add(day);
        day = dateStrings.addDays(day, 1);
      }
    }
  }
  ```

---

### Step 11 — Employee Card Badges

**`src/app/bizPlan/paceCrawler/_lib/diffChecker/DiffCheckerTypes.ts`**:
- Add to `EmployeeCardData`:
  ```typescript
  isOnLeave: boolean;
  isHoliday: boolean;
  ```

**`src/app/bizPlan/paceCrawler/employeeCardSelect.ts`** (`selectEmployeeCardData`):
- Add `holidaySelect.holidayDates` and `employeeSelect.employeeMap` as inputs (employee map already present)
- For each card, compute:
  ```typescript
  const isHoliday = holidayDates.has(mainDate);
  const isOnLeave = (employee.plannedTimeOff ?? []).some(
    (pto) => mainDate >= pto.dateRange.min && mainDate <= pto.dateRange.max,
  );
  ```
- Include `isOnLeave` and `isHoliday` in the pushed card object

**`src/app/bizPlan/paceCrawler/devComponents/EmployeeCardPanel.tsx`** (`EmployeeCard`):
- In the card header, add badges after the existing "⚠ Routed" badge:
  ```tsx
  {cardData.isOnLeave && (
    <span className="text-accent text-xs font-medium shrink-0 ml-2">🏖 On Leave</span>
  )}
  {cardData.isHoliday && (
    <span className="text-secondary text-xs font-medium shrink-0 ml-2">🎉 Holiday</span>
  )}
  ```

---

### Step 12 — `usePaceCrawlerDeps`

**`src/app/bizPlan/paceCrawler/usePaceCrawlerDeps.ts`**:
- Add imports and calls:
  ```typescript
  import { usePlannedTimeOff } from "@/app/plannedTimeOff/usePlannedTimeOff";
  import { useHoliday } from "@/app/holiday/useHoliday";

  usePlannedTimeOff({ autoLoad: true });
  useHoliday({ autoLoad: true });
  ```

---

### Step 13 — Calendar Page

**`src/app/plannedTimeOff/calendar/page.tsx`** (new):

Dependencies loaded: `usePlannedTimeOff`, `useHoliday`, `useEmployee`.

State: `viewMonth: string` (ISO "yyyy-MM" format, defaults to current month via `format(new Date(), "yyyy-MM")`).

Selectors needed:
- `plannedTimeOffSelect.all` — all PTO docs
- `holidaySelect.all` — all holidays
- `employeeSelect.employees` — for name lookup

**Calendar grid logic**:
- Compute first Monday on or before the 1st of the month
- Compute last Friday on or after the last day of the month
- Walk weekdays only (Mon–Fri), grouping into rows of 5
- For each cell date:
  - Filter `plannedTimeOff` where `date >= pto.dateRange.min && date <= pto.dateRange.max`
  - Filter `holidays` where `date >= h.dateRange.min && date <= h.dateRange.max`

**Add Sheet/Drawer** (`PlannedTimeOffSheet.tsx`):
- Props: `defaultDate: string`, `existingDoc?: PlannedTimeOff`, `onClose: () => void`
- Internal state: `search: string`, `selectedEmployeeId: string`, `dateRange: TRange<string>`, `note: string`
- Employee list filtered by `search` (toLower match on `employeeId` or `name`)
- On save: dispatch `plannedTimeOffActions.upsert({ doc: { plannedTimeOffId: crypto.randomUUID(), ... } })`
- On delete (edit mode): dispatch `plannedTimeOffActions.deleteOne({ plannedTimeOffId })`

---

### Step 14 — Holiday CRUD Page

**`src/app/holiday/page.tsx`** (new):

Dependencies: `useHoliday({ autoLoad: true })`.

Layout (mirrors `priorityService/page.tsx` pattern):
- Left panel: scrollable list of holidays; "New Holiday" button at top
- Right panel: form card with `description` input, `dateRange` picker, Save/Delete buttons
- `selected: string | "new" | null` state (keyed by `holidayId`)
- On save: dispatch `holidayActions.upsert({ doc: { holidayId: crypto.randomUUID(), ... } })`
- On delete: dispatch `holidayActions.deleteOne({ holidayId })`

---

### Step 15 — Nav Menu

**`src/components/navBar/NavMenu.tsx`**:

Add to `schedulingSection.navItems`:
```typescript
{ title: "Time Off Calendar", href: "/plannedTimeOff/calendar", roles: ["admin", "office"] },
{ title: "Holidays", href: "/holiday", roles: ["admin"] },
```

---

## Files Created / Modified Summary

| File | Action |
|---|---|
| `src/app/plannedTimeOff/plannedTimeOffTypes.ts` | Modified |
| `src/app/plannedTimeOff/PlannedTimeOffModel.ts` | New |
| `src/app/plannedTimeOff/api/PlannedTimeOffContract.ts` | New |
| `src/app/plannedTimeOff/api/route.ts` | New |
| `src/app/plannedTimeOff/plannedTimeOffSlice.ts` | New |
| `src/app/plannedTimeOff/plannedTimeOffSelect.ts` | New |
| `src/app/plannedTimeOff/usePlannedTimeOff.ts` | New |
| `src/app/plannedTimeOff/calendar/page.tsx` | New |
| `src/app/plannedTimeOff/calendar/PlannedTimeOffSheet.tsx` | New |
| `src/app/holiday/holidayTypes.ts` | New |
| `src/app/holiday/HolidayModel.ts` | New |
| `src/app/holiday/api/HolidayContract.ts` | New |
| `src/app/holiday/api/route.ts` | New |
| `src/app/holiday/holidaySlice.ts` | New |
| `src/app/holiday/holidaySelect.ts` | New |
| `src/app/holiday/useHoliday.ts` | New |
| `src/app/holiday/page.tsx` | New |
| `src/store/reducers/index.ts` | Modified |
| `src/app/realGreen/employee/types/EmployeeTypes.ts` | Modified |
| `src/app/realGreen/employee/employeeSelect.ts` | Modified |
| `src/app/bizPlan/paceCrawler/PaceCrawlerTypes.ts` | Modified |
| `src/app/bizPlan/paceCrawler/_lib/dayCrawlSimulation.ts` | Modified |
| `src/app/bizPlan/paceCrawler/paceCrawlerSelect.ts` | Modified |
| `src/app/bizPlan/paceCrawler/_lib/diffChecker/DiffCheckerTypes.ts` | Modified |
| `src/app/bizPlan/paceCrawler/employeeCardSelect.ts` | Modified |
| `src/app/bizPlan/paceCrawler/devComponents/EmployeeCardPanel.tsx` | Modified |
| `src/app/bizPlan/paceCrawler/usePaceCrawlerDeps.ts` | Modified |
| `src/components/navBar/NavMenu.tsx` | Modified |
