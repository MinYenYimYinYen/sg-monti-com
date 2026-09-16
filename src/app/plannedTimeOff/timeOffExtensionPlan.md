# Time Off Extension Plan

**Status**: Planning
**Supersedes**: Nothing — extends `plannedTimeOffPlan.md` and `plannedTimeOffImplementation.md`

---

## Overview

This plan extends the existing time-off and scheduling infrastructure with four new capabilities:

1. **Unplanned Absence Calendar UI** — A dedicated trigger and sheet for recording unplanned absences directly from the calendar page, with distinct destructive styling.
2. **Weather Days** — An extension to the existing `Holiday` module that marks certain holidays as weather days, giving them an additional "excuse" effect in the productivity module.
3. **Employee Availability** — A new data module that stores per-employee start/end dates (and future constraints), consumed by the paceCrawler to exclude unavailable days from projections.
4. **Badge Semantic Correction** — All "employee unavailable" badges on the Employee Card are unified to `text-destructive`, and the holiday badge is updated to show the holiday description.

---

## Current State (What Already Exists)

The following are **fully implemented** and must not be re-implemented:

| Module | Status |
|---|---|
| `PlannedTimeOff` data module (types, model, API, slice, select, hook) | ✅ Done |
| `Holiday` data module (types, model, API, slice, select, hook) | ✅ Done |
| Calendar page (`/plannedTimeOff/calendar`) | ✅ Done |
| `PlannedTimeOffSheet` (planned dates form) | ✅ Done |
| `reliabilitySelect` — reads `requestType === "unplannedAbsence"` | ✅ Done |
| Crawler integration — `timeOffDates` per employee (PTO + holidays) | ✅ Done |
| Employee card badges (`isOnLeave`, `isHoliday`) | ✅ Done (needs color fix) |
| `usePaceCrawlerDeps` — loads PTO + holidays | ✅ Done |
| Nav menu entries for Time Off Calendar and Holidays | ✅ Done |

---

## Phase 1 — Unplanned Absence Calendar UI

### Problem

The calendar page (`/plannedTimeOff/calendar`) has no way to create an unplanned absence. The `reliabilitySelect` already reads `requestType === "unplannedAbsence"` from the store, and the `reliabilityColumns.tsx` has an inline form for recording them from the productivity page. But there is no proactive entry point on the calendar.

### Design

A dedicated **"Record Unplanned Absence"** button sits above the calendar grid (in the calendar header area, alongside the month navigation). Clicking it opens `UnplannedAbsenceSheet` — a separate, visually distinct sheet with a `bg-destructive/30` header to signal the severity of the action.

**Key differences from `PlannedTimeOffSheet`:**
- Single date only (no date range picker — unplanned absences are always one day)
- Employee selector (same search + select pattern)
- Note field (required — must explain the absence)
- Header background: `bg-destructive/30` with `text-destructive` title
- Save dispatches `plannedTimeOffActions.upsert` with `requestType: "unplannedAbsence"`, `dateRange: { min: date, max: date }`, `timeRange: null`

**Calendar cell display for unplanned absences:**
- Currently: PTO chips use `bg-accent/20 text-accent` with 🏖
- Unplanned absences: `bg-destructive/20 text-destructive` with ⚠ symbol
- The `ptoByDate` map in `page.tsx` already groups all PTO by date — the cell rendering needs to branch on `pto.requestType`

### Files Changed

| File | Change |
|---|---|
| `src/app/plannedTimeOff/calendar/page.tsx` | Add "Record Unplanned Absence" button in header; update `CalendarCell` to render unplanned absences with destructive styling |
| `src/app/plannedTimeOff/calendar/UnplannedAbsenceSheet.tsx` | **New** — dedicated sheet for unplanned absences |

### `UnplannedAbsenceSheet` Spec

```typescript
type UnplannedAbsenceSheetProps = {
  defaultDate: string;
  employees: Employee[];
  onClose: () => void;
};
```

- Header: `bg-destructive/30`, title "Record Unplanned Absence", description "This records an absence that was not pre-approved."
- Fields: employee search + select, single date picker (not a range), required note textarea
- `canSave`: `selectedEmployeeId !== "" && date !== "" && note.trim() !== ""`
- On save: dispatch `plannedTimeOffActions.upsert` with `requestType: "unplannedAbsence"`, `dateRange: { min: date, max: date }`, `timeRange: null`
- No delete button (unplanned absences are created, not edited, from this sheet)

### `CalendarCell` Update

```tsx
// In the PTO chips section:
{ptoEntries.map((pto) => {
  const name = employeeNameMap.get(pto.employeeId) ?? pto.employeeId;
  const isUnplanned = pto.requestType === "unplannedAbsence";
  return (
    <button
      key={pto.plannedTimeOffId}
      onClick={() => onEdit(pto)}
      className={cn(
        "text-[9px] rounded px-1 py-0.5 truncate text-left transition-colors",
        isUnplanned
          ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
          : "bg-accent/20 text-accent hover:bg-accent/30",
      )}
    >
      {isUnplanned ? "⚠" : "🏖"} {name}
    </button>
  );
})}
```

---

## Phase 2 — Weather Days (Holiday Extension)

### Problem

There is no way to mark a day as a "weather day" — a company-wide excuse that:
1. Prevents the paceCrawler from counting it as a workable day (already handled by holidays)
2. Excludes it from the "suspicious zero days" detection in `reliabilitySelect`
3. Excludes it from the completion % denominator in `productivitySelect`

### Design Decision

**Extend `Holiday` with `isWeatherDay: boolean`.** No new module. The user creates a holiday called "Rain Day" or "Too Windy" and checks the "Weather Day" checkbox. This is semantically correct — a weather day is a company-wide closure, just like a holiday.

### Type Change

```typescript
// src/app/holiday/holidayTypes.ts
export type Holiday = CreatedUpdated & {
  holidayId: string;
  description: string;
  dateRange: TRange<string>;
  /** When true, this holiday is a weather/environmental closure. Affects productivity metrics. */
  isWeatherDay: boolean;
};
```

### Model Change

```typescript
// src/app/holiday/HolidayModel.ts — add to schema:
isWeatherDay: { type: Boolean, required: true, default: false },
```

### Selector Change

```typescript
// src/app/holiday/holidaySelect.ts — add:

/**
 * Set of weekday date strings covered by weather-day holidays.
 * Used by reliabilitySelect and productivitySelect to exclude these dates
 * from completion % denominators and suspicious-zero-day detection.
 */
const selectWeatherDayDates = createSelector(
  [selectDocs],
  (docs): Set<string> => {
    const result = new Set<string>();
    for (const holiday of docs) {
      if (!holiday.isWeatherDay) continue;
      let day = holiday.dateRange.min;
      while (day <= holiday.dateRange.max) {
        if (dateStrings.isWeekDay(day)) result.add(day);
        day = dateStrings.addDays(day, 1);
      }
    }
    return result;
  },
);

export const holidaySelect = {
  all: selectAll,
  holidayDates: selectHolidayDates,
  weatherDayDates: selectWeatherDayDates,  // NEW
};
```

### Holiday Page Form Change

Add a checkbox to `HolidayForm` in `src/app/holiday/page.tsx`:

```tsx
<FormGroup>
  <div className="flex items-center gap-2">
    <Checkbox
      id="isWeatherDay"
      checked={isWeatherDay}
      onCheckedChange={(checked) => setIsWeatherDay(!!checked)}
    />
    <Label htmlFor="isWeatherDay">Weather Day</Label>
  </div>
  <p className="text-[10px] text-muted-foreground">
    Weather days are excluded from productivity completion metrics.
  </p>
</FormGroup>
```

### Calendar Display Change

In `CalendarCell`, the holiday label currently shows `🎉 {holidayLabel}`. Update to:

```tsx
{holidayLabel && (
  <div className={cn(
    "text-[9px] rounded px-1 py-0.5 truncate font-medium",
    isWeatherDay
      ? "bg-destructive/20 text-destructive"
      : "bg-secondary/20 text-secondary",
  )}>
    {isWeatherDay ? "🌧" : "🎉"} {holidayLabel}
  </div>
)}
```

This requires passing `isWeatherDay: boolean` alongside `holidayLabel` to `CalendarCell`. The `holidayByDate` map in `page.tsx` should store `{ description: string; isWeatherDay: boolean }` instead of just a string.

### Reliability Select Change

```typescript
// src/app/productivity/reliabilitySelect.ts
// Add weatherDayDates as an input to selectReliabilityByEmployee:

const selectReliabilityByEmployee = createSelector(
  [
    selectUnplannedAbsencesInRange,
    productivitySelect.assignmentCompletionByEmployee,
    assignmentSelect.assignmentsByEmployeeForRange,
    selectServiceByServId,
    productivitySelect.completedServices,
    selectDatesWithAnyCompletion,
    holidaySelect.weatherDayDates,  // NEW
  ],
  (
    unplannedAbsencesByEmployee,
    completionByEmployee,
    assignmentsByEmployee,
    serviceByServId,
    completedServices,
    datesWithAnyCompletion,
    weatherDayDates,  // NEW
  ) => {
    // In the suspicious zero days detection loop:
    // Skip days that are weather days (company-wide excuse)
    if (weatherDayDates.has(date)) continue;
    // ...
  }
);
```

### Productivity Select Change

```typescript
// src/app/productivity/productivitySelect.ts
// selectAssignmentCompletionByEmployee gains weatherDayDates as input:
// Exclude assignments on weather days from the denominator.

const selectAssignmentCompletionByEmployee = createSelector(
  [
    selectCompletedServices,
    assignmentSelect.assignmentsByEmployeeForRange,
    holidaySelect.weatherDayDates,  // NEW
  ],
  (completedServices, assignmentsByEmployee, weatherDayDates) => {
    // When counting assigned:
    // if (weatherDayDates.has(assignment.schedDate)) continue; // exclude from denominator
  }
);
```

> **Note**: `useProductivity` already calls `usePlannedTimeOff({ autoLoad: true })` but not `useHoliday`. Add `useHoliday({ autoLoad: true })` to `useProductivity` so weather day data is available.

### Files Changed

| File | Change |
|---|---|
| `src/app/holiday/holidayTypes.ts` | Add `isWeatherDay: boolean` |
| `src/app/holiday/HolidayModel.ts` | Add `isWeatherDay` to schema |
| `src/app/holiday/holidaySelect.ts` | Add `selectWeatherDayDates` |
| `src/app/holiday/page.tsx` | Add weather day checkbox to form |
| `src/app/plannedTimeOff/calendar/page.tsx` | Update holiday display with weather day styling |
| `src/app/productivity/reliabilitySelect.ts` | Exclude weather days from suspicious-zero detection |
| `src/app/productivity/productivitySelect.ts` | Exclude weather days from completion % denominator |
| `src/app/productivity/useProductivity.ts` | Add `useHoliday({ autoLoad: true })` |

---

## Phase 3 — Employee Availability Module

### Problem

There is no way to define when an employee starts or ends their employment season. The paceCrawler currently assumes all assigned employees are available every weekday (minus PTO and holidays). This prevents:
- Creating plans for future hires (days before their start date would be incorrectly counted as workable)
- Modeling seasonal employees who end before the season closes

### Design

A new `employeeAvailability` data module following the standard 5-component pattern. The type is intentionally sparse — only `employeeId` is required. All constraint fields are optional, making the system **semantically additive but operationally subtractive**: define nothing, get full availability.

### Type

```typescript
// src/app/employeeAvailability/EmployeeAvailabilityTypes.ts

/**
 * Per-employee availability constraints for the paceCrawler.
 *
 * All constraint fields are optional. An employee with no record (or an empty record)
 * is assumed to be fully available (minus PTO and holidays).
 *
 * Design intent: subtractive. Define nothing = full availability.
 * Define startDate = days before it are not workable for this employee.
 * Define endDate = days after it are not workable for this employee.
 *
 * Future extensions (not implemented yet):
 *   daysOff?: ("M" | "T" | "W" | "Th" | "F")[];
 */
export type EmployeeAvailability = {
  employeeId: string;
  /** The earliest date this employee is available to work. Undefined = no restriction. */
  startDate?: string;
  /** The last date this employee is available to work. Undefined = no restriction. */
  endDate?: string;
};
```

### Mongoose Model

```typescript
// src/app/employeeAvailability/EmployeeAvailabilityModel.ts
const EmployeeAvailabilitySchema = new mongoose.Schema<EmployeeAvailability>(
  {
    employeeId: { type: String, required: true },
    startDate: { type: String },
    endDate: { type: String },
  },
  { timestamps: true },
);
EmployeeAvailabilitySchema.index({ employeeId: 1 }, { unique: true });
export const EmployeeAvailabilityModel = createModel("EmployeeAvailability", EmployeeAvailabilitySchema);
```

### API Contract

```typescript
// src/app/employeeAvailability/api/EmployeeAvailabilityContract.ts
export interface EmployeeAvailabilityContract extends ApiContract {
  getAll: {
    params: Record<string, never>;
    result: DataResponse<EmployeeAvailability[]>;
  };
  upsert: {
    params: { doc: EmployeeAvailability };
    result: DataResponse<EmployeeAvailability>;
  };
  deleteOne: {
    params: { employeeId: string };
    result: DataResponse<EmployeeAvailability>;
  };
}
```

### API Route

```typescript
// src/app/employeeAvailability/api/route.ts
// getAll: EmployeeAvailabilityModel.find({}).lean() → cleanMongoArray
// upsert: findOneAndUpdate({ employeeId }, { $set: doc }, { upsert: true, new: true }) → cleanMongoObject
// deleteOne: findOneAndDelete({ employeeId }) → cleanMongoObject
// Roles: ["admin", "office"] for all operations
```

### Redux Slice

```typescript
// src/app/employeeAvailability/employeeAvailabilitySlice.ts
type EmployeeAvailabilityState = {
  docs: EmployeeAvailability[];
};
// Standard createStandardThunk pattern for getAll, upsert, deleteOne
// extraReducers:
//   getAll.fulfilled → replace docs
//   upsert.fulfilled → upsert by employeeId
//   deleteOne.fulfilled → filter out by employeeId
```

### Selectors

```typescript
// src/app/employeeAvailability/employeeAvailabilitySelect.ts

const selectDocs = (state: AppState) => state.employeeAvailability.docs;

const selectAll = createSelector([selectDocs], (docs): EmployeeAvailability[] => docs);

/** Map<employeeId, EmployeeAvailability> for O(1) lookups. */
const selectByEmployeeId = createSelector(
  [selectDocs],
  (docs): Map<string, EmployeeAvailability> =>
    new Grouper(docs).toUniqueMap((d) => d.employeeId),
);

export const employeeAvailabilitySelect = {
  all: selectAll,
  byEmployeeId: selectByEmployeeId,
};
```

### Hook

```typescript
// src/app/employeeAvailability/useEmployeeAvailability.ts
export function useEmployeeAvailability({ autoLoad }: { autoLoad?: boolean } = {}) {
  // dispatches getAll on mount when autoLoad is true
  // exposes: upsert(doc), deleteOne(employeeId)
}
```

### Root Reducer

```typescript
// src/store/reducers/index.ts — add:
import { employeeAvailabilityReducer } from "@/app/employeeAvailability/employeeAvailabilitySlice";
// In combineReducers:
employeeAvailability: employeeAvailabilityReducer,
```

### Employee Hydration

**`src/app/realGreen/employee/types/EmployeeTypes.ts`**:
```typescript
import { EmployeeAvailability } from "@/app/employeeAvailability/EmployeeAvailabilityTypes";

export type EmployeeProps = {
  servCodeIds: string[];
  plannedTimeOff: PlannedTimeOff[];
  availability: EmployeeAvailability;  // NEW — always present, may be empty { employeeId }
};
```

**`src/app/realGreen/employee/employeeSelect.ts`**:
```typescript
const selectEmployees = createSelector(
  [
    selectEmployeeDocs,
    assignmentPlanSelect.assignmentsByServCodeId,
    plannedTimeOffSelect.byEmployeeId,
    employeeAvailabilitySelect.byEmployeeId,  // NEW
  ],
  (employeeDocs, assignmentsByServCodeId, ptoByEmployeeId, availabilityByEmployeeId): Employee[] => {
    // ...existing logic...
    return employeeDocs.map((doc): Employee => {
      const servCodeIds = servCodeIdsByEmployee.get(doc.employeeId) ?? [];
      const plannedTimeOff = ptoByEmployeeId.get(doc.employeeId) ?? [];
      const availability = availabilityByEmployeeId.get(doc.employeeId) ?? { employeeId: doc.employeeId };  // NEW
      return { ...doc, servCodeIds, plannedTimeOff, availability };
    });
  },
);
```

### Crawler Integration

**`src/app/bizPlan/paceCrawler/paceCrawlerSelect.ts`** — in `selectCrawlerResult`, when building `timeOffDates` per employee:

```typescript
// After building timeOffDates from PTO and holidays:
const { startDate, endDate } = employee.availability;

// Days before startDate are not workable
if (startDate) {
  let day = crawlStart;
  while (day < startDate) {
    if (dateStrings.isWeekDay(day)) timeOffDates.add(day);
    day = dateStrings.addDays(day, 1);
  }
}

// Days after endDate are not workable
if (endDate) {
  let day = dateStrings.addDays(endDate, 1);
  const maxDay = dateStrings.addWeekdays(crawlStart, 365);
  while (day <= maxDay) {
    if (dateStrings.isWeekDay(day)) timeOffDates.add(day);
    day = dateStrings.addDays(day, 1);
  }
}
```

> **Implementation note**: Rather than pre-populating `timeOffDates` with every blocked day (which could be thousands of dates for a future hire), the simulation's `employee.timeOffDates.has(day)` check is already O(1). Pre-populating is fine for PTO ranges (typically days to weeks), but for availability ranges that could span months, a more efficient approach is to add a guard directly in `dayCrawlSimulation.ts`:
>
> ```typescript
> // In the per-employee loop, before the priority entry loop:
> const { startDate, endDate } = employee.availability ?? {};
> if (startDate && day < startDate) continue;
> if (endDate && day > endDate) continue;
> ```
>
> This avoids pre-populating `timeOffDates` with potentially hundreds of dates. The `DayCrawlEmployeeEntry` type gains `availability: EmployeeAvailability` instead of encoding it into `timeOffDates`.

**`src/app/bizPlan/paceCrawler/PaceCrawlerTypes.ts`** — update `DayCrawlEmployeeEntry`:
```typescript
export type DayCrawlEmployeeEntry = {
  employeeId: string;
  priorityEntries: DayCrawlPriorityEntry[];
  dailyRates: Map<string, number>;
  totalAvgDailyPrice: number;
  nextAvailableDate: string;
  timeOffDates: Set<string>;
  /** Employee availability constraints — startDate/endDate block the crawler from working those days. */
  availability: EmployeeAvailability;  // NEW
};
```

**`src/app/bizPlan/paceCrawler/_lib/dayCrawlSimulation.ts`** — add guard in the per-employee loop:
```typescript
for (const employee of employeeEntries) {
  // Skip if employee is on leave or holiday
  if (employee.timeOffDates.has(day)) { ... continue; }

  // NEW: Skip if outside employee's availability window
  if (employee.availability.startDate && day < employee.availability.startDate) continue;
  if (employee.availability.endDate && day > employee.availability.endDate) continue;

  // ... rest of existing logic
}
```

### `usePaceCrawlerDeps` Update

```typescript
// src/app/bizPlan/paceCrawler/usePaceCrawlerDeps.ts — add:
import { useEmployeeAvailability } from "@/app/employeeAvailability/useEmployeeAvailability";
useEmployeeAvailability({ autoLoad: true });
```

### UI — `EmployeeAvailabilitySheet`

A sheet component for editing an employee's availability constraints. Triggered from:
1. The employee card header in the **Assignments tab** (`AssignmentEditorPanel.tsx`)
2. The employee row in the **EmpTimeline tab** (`EmployeeTimelinePanel.tsx`)

```typescript
// src/app/employeeAvailability/_components/EmployeeAvailabilitySheet.tsx
type EmployeeAvailabilitySheetProps = {
  employee: Employee;
  onClose: () => void;
};
```

**Sheet contents:**
- Header: employee name, subtitle "Availability Constraints"
- `startDate` field: `DatePicker` with label "Start Date" and helper text "Days before this date will not be counted as workable. Leave blank for no restriction."
- `endDate` field: `DatePicker` with label "End Date" and helper text "Days after this date will not be counted as workable. Leave blank for no restriction."
- Save / Cancel buttons
- Delete button (removes the record entirely, restoring full availability)

**Trigger in `AssignmentEditorPanel.tsx`**: Add a small calendar/settings icon button to each employee card header that opens `EmployeeAvailabilitySheet` for that employee.

**Trigger in `EmployeeTimelinePanel.tsx`**: Add the same icon button to each employee row header.

### Employee Card Badge (Assignments Tab)

When `mainDate` is outside an employee's availability window, show a badge:
- Before `startDate`: `"🚫 Not Started"` in `text-destructive`
- After `endDate`: `"🚫 Ended"` in `text-destructive`

This requires `employeeCardSelect` to check `employee.availability` against `mainDate`.

### Files Created / Modified

| File | Action |
|---|---|
| `src/app/employeeAvailability/EmployeeAvailabilityTypes.ts` | **New** |
| `src/app/employeeAvailability/EmployeeAvailabilityModel.ts` | **New** |
| `src/app/employeeAvailability/api/EmployeeAvailabilityContract.ts` | **New** |
| `src/app/employeeAvailability/api/route.ts` | **New** |
| `src/app/employeeAvailability/employeeAvailabilitySlice.ts` | **New** |
| `src/app/employeeAvailability/employeeAvailabilitySelect.ts` | **New** |
| `src/app/employeeAvailability/useEmployeeAvailability.ts` | **New** |
| `src/app/employeeAvailability/_components/EmployeeAvailabilitySheet.tsx` | **New** |
| `src/store/reducers/index.ts` | Modified — add `employeeAvailability` reducer |
| `src/app/realGreen/employee/types/EmployeeTypes.ts` | Modified — add `availability` to `EmployeeProps` |
| `src/app/realGreen/employee/employeeSelect.ts` | Modified — hydrate `availability` |
| `src/app/bizPlan/paceCrawler/PaceCrawlerTypes.ts` | Modified — add `availability` to `DayCrawlEmployeeEntry` |
| `src/app/bizPlan/paceCrawler/_lib/dayCrawlSimulation.ts` | Modified — add availability guard |
| `src/app/bizPlan/paceCrawler/paceCrawlerSelect.ts` | Modified — pass `availability` to employee entries |
| `src/app/bizPlan/paceCrawler/usePaceCrawlerDeps.ts` | Modified — add `useEmployeeAvailability` |
| `src/app/bizPlan/paceCrawler/devComponents/AssignmentEditorPanel.tsx` | Modified — add availability sheet trigger |
| `src/app/bizPlan/paceCrawler/empTimeline/page.tsx` | Modified — add availability sheet trigger |

---

## Phase 4 — Badge Semantic Correction

### Problem

The employee card badges use inconsistent colors:
- `⚠ Routed` → `text-destructive` ✓
- `🏖 On Leave` → `text-accent` (green) ✗ — should be destructive
- `🎉 Holiday` → `text-secondary` (orange) ✗ — should be destructive, and should show the description

All three badges communicate the same operational signal: **"Do not schedule this employee today."** Color should be uniform (`text-destructive`). The distinction between *why* they're unavailable is communicated by the label text and icon.

Additionally, the holiday badge currently shows a static "Holiday" label. It should show the actual holiday description (e.g., "🎉 Thanksgiving", "🌧 Rain Day").

### Type Change

**`src/app/bizPlan/paceCrawler/_lib/diffChecker/DiffCheckerTypes.ts`**:
```typescript
export type EmployeeCardData = {
  employee: Employee;
  isAlreadyRouted: boolean;
  isOnLeave: boolean;
  /** The description of the holiday covering mainDate, or null if no holiday. */
  holidayDescription: string | null;  // CHANGED from isHoliday: boolean
  openEntries: OpenGroupRow[];
  assignedServCodeIds: string[];
};
```

### Selector Change

**`src/app/bizPlan/paceCrawler/employeeCardSelect.ts`** — in `selectEmployeeCardData`:

```typescript
// Replace:
const isHoliday = holidayDates.has(mainDate);

// With:
const matchingHoliday = holidays.find(
  (h) => mainDate >= h.dateRange.min && mainDate <= h.dateRange.max,
);
const holidayDescription = matchingHoliday?.description ?? null;
```

This requires `holidaySelect.all` (already an input) instead of `holidaySelect.holidayDates`. Remove `holidaySelect.holidayDates` from the input list and use `holidaySelect.all` directly.

### Component Change

**`src/app/bizPlan/paceCrawler/devComponents/EmployeeCardPanel.tsx`** — `EmployeeCard`:

```tsx
// Replace all badge spans with unified destructive styling:
{isAlreadyRouted && (
  <span className="text-destructive text-xs font-medium shrink-0">⚠ Routed</span>
)}
{isOnLeave && (
  <span className="text-destructive text-xs font-medium shrink-0">🏖 On Leave</span>
)}
{holidayDescription && (
  <span className="text-destructive text-xs font-medium shrink-0">
    {holidayDescription.toLowerCase().includes("rain") ||
     holidayDescription.toLowerCase().includes("wind") ||
     holidayDescription.toLowerCase().includes("weather")
       ? "🌧"
       : "🎉"} {holidayDescription}
  </span>
)}
```

> **Better approach**: Rather than guessing from the description string, use `matchingHoliday.isWeatherDay` (from Phase 2) to pick the icon. `EmployeeCardData` should carry `isWeatherDay: boolean` alongside `holidayDescription`.

**Updated `EmployeeCardData`**:
```typescript
export type EmployeeCardData = {
  employee: Employee;
  isAlreadyRouted: boolean;
  isOnLeave: boolean;
  /** The description of the holiday covering mainDate, or null if no holiday. */
  holidayDescription: string | null;
  /** True when the holiday covering mainDate is a weather day. */
  isWeatherDay: boolean;
  openEntries: OpenGroupRow[];
  assignedServCodeIds: string[];
};
```

**Badge rendering**:
```tsx
{holidayDescription && (
  <span className="text-destructive text-xs font-medium shrink-0">
    {isWeatherDay ? "🌧" : "🎉"} {holidayDescription}
  </span>
)}
```

**Same changes apply to `DiffD5EmployeeCardPanel.tsx`** — it currently doesn't show `isOnLeave` or `isHoliday` badges. Add them with the same destructive styling.

### Files Changed

| File | Change |
|---|---|
| `src/app/bizPlan/paceCrawler/_lib/diffChecker/DiffCheckerTypes.ts` | `isHoliday: boolean` → `holidayDescription: string \| null`, add `isWeatherDay: boolean` |
| `src/app/bizPlan/paceCrawler/employeeCardSelect.ts` | Compute `holidayDescription` and `isWeatherDay` from `holidaySelect.all` |
| `src/app/bizPlan/paceCrawler/devComponents/EmployeeCardPanel.tsx` | All badges → `text-destructive`; holiday shows description |
| `src/app/bizPlan/paceCrawler/devComponents/diffChecker/DiffD5EmployeeCardPanel.tsx` | Add `isOnLeave`, `holidayDescription`, `isWeatherDay` badges with destructive styling |

---

## Implementation Order

The phases are designed to be independent and can be implemented in any order. The recommended sequence minimizes risk:

### Phase 1 — Unplanned Absence Calendar UI
- [ ] Create `UnplannedAbsenceSheet.tsx`
- [ ] Update `calendar/page.tsx` — add trigger button and update cell rendering

### Phase 2 — Weather Days
- [ ] Update `holidayTypes.ts` — add `isWeatherDay`
- [ ] Update `HolidayModel.ts` — add schema field
- [ ] Update `holidaySelect.ts` — add `selectWeatherDayDates`
- [ ] Update `holiday/page.tsx` — add checkbox to form
- [ ] Update `calendar/page.tsx` — weather day styling
- [ ] Update `reliabilitySelect.ts` — exclude weather days
- [ ] Update `productivitySelect.ts` — exclude weather days from denominator
- [ ] Update `useProductivity.ts` — add `useHoliday`

### Phase 3 — Employee Availability
- [ ] Create `EmployeeAvailabilityTypes.ts`
- [ ] Create `EmployeeAvailabilityModel.ts`
- [ ] Create `api/EmployeeAvailabilityContract.ts` + `api/route.ts`
- [ ] Create `employeeAvailabilitySlice.ts`
- [ ] Create `employeeAvailabilitySelect.ts`
- [ ] Create `useEmployeeAvailability.ts`
- [ ] Register reducer in `src/store/reducers/index.ts`
- [ ] Update `EmployeeTypes.ts` — add `availability` to `EmployeeProps`
- [ ] Update `employeeSelect.ts` — hydrate `availability`
- [ ] Update `PaceCrawlerTypes.ts` — add `availability` to `DayCrawlEmployeeEntry`
- [ ] Update `dayCrawlSimulation.ts` — add availability guard
- [ ] Update `paceCrawlerSelect.ts` — pass `availability` to employee entries
- [ ] Update `usePaceCrawlerDeps.ts` — add `useEmployeeAvailability`
- [ ] Create `EmployeeAvailabilitySheet.tsx`
- [ ] Update `AssignmentEditorPanel.tsx` — add sheet trigger
- [ ] Update `empTimeline/page.tsx` — add sheet trigger

### Phase 4 — Badge Semantic Correction
- [ ] Update `DiffCheckerTypes.ts` — `isHoliday` → `holidayDescription` + `isWeatherDay`
- [ ] Update `employeeCardSelect.ts` — compute `holidayDescription` and `isWeatherDay`
- [ ] Update `EmployeeCardPanel.tsx` — all badges to `text-destructive`, holiday shows description
- [ ] Update `DiffD5EmployeeCardPanel.tsx` — add all badges with destructive styling

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Weather days extend `Holiday`, not a new module | Semantically identical to holidays (company-wide closure). The only difference is the productivity "excuse" effect, which is a single boolean flag. |
| `EmployeeAvailability` is a separate module | Employee data is loaded in many contexts that don't need availability. Keeping it separate avoids bloating a hot path and allows independent loading. |
| `EmployeeAvailability` uses optional fields, not `NullableTRange` | `startDate` and `endDate` are semantically independent. `NullableTRange` implies they're always paired. Future fields (e.g., `daysOff`) are a third independent dimension. |
| Availability guard in `dayCrawlSimulation.ts`, not pre-populated in `timeOffDates` | Pre-populating `timeOffDates` with months of blocked dates is wasteful. A direct guard in the simulation loop is O(1) per day and avoids allocating large Sets. |
| All unavailability badges use `text-destructive` | All badges communicate the same operational signal: "Do not schedule this employee today." Color should be uniform. The label text distinguishes the reason. |
| Holiday badge shows description, not "Holiday" | "🎉 Thanksgiving" is more useful than "🎉 Holiday". The `isWeatherDay` flag drives the icon choice (🌧 vs 🎉). |
| `EmployeeCardData.isHoliday: boolean` → `holidayDescription: string \| null` | Carries both the presence signal and the display text in one field. `null` = no holiday. Non-null = holiday with that description. |

---

## Files Created / Modified Summary

| File | Phase | Action |
|---|---|---|
| `src/app/plannedTimeOff/calendar/UnplannedAbsenceSheet.tsx` | 1 | **New** |
| `src/app/plannedTimeOff/calendar/page.tsx` | 1, 2 | Modified |
| `src/app/holiday/holidayTypes.ts` | 2 | Modified |
| `src/app/holiday/HolidayModel.ts` | 2 | Modified |
| `src/app/holiday/holidaySelect.ts` | 2 | Modified |
| `src/app/holiday/page.tsx` | 2 | Modified |
| `src/app/productivity/reliabilitySelect.ts` | 2 | Modified |
| `src/app/productivity/productivitySelect.ts` | 2 | Modified |
| `src/app/productivity/useProductivity.ts` | 2 | Modified |
| `src/app/employeeAvailability/EmployeeAvailabilityTypes.ts` | 3 | **New** |
| `src/app/employeeAvailability/EmployeeAvailabilityModel.ts` | 3 | **New** |
| `src/app/employeeAvailability/api/EmployeeAvailabilityContract.ts` | 3 | **New** |
| `src/app/employeeAvailability/api/route.ts` | 3 | **New** |
| `src/app/employeeAvailability/employeeAvailabilitySlice.ts` | 3 | **New** |
| `src/app/employeeAvailability/employeeAvailabilitySelect.ts` | 3 | **New** |
| `src/app/employeeAvailability/useEmployeeAvailability.ts` | 3 | **New** |
| `src/app/employeeAvailability/_components/EmployeeAvailabilitySheet.tsx` | 3 | **New** |
| `src/store/reducers/index.ts` | 3 | Modified |
| `src/app/realGreen/employee/types/EmployeeTypes.ts` | 3 | Modified |
| `src/app/realGreen/employee/employeeSelect.ts` | 3 | Modified |
| `src/app/bizPlan/paceCrawler/PaceCrawlerTypes.ts` | 3 | Modified |
| `src/app/bizPlan/paceCrawler/_lib/dayCrawlSimulation.ts` | 3 | Modified |
| `src/app/bizPlan/paceCrawler/paceCrawlerSelect.ts` | 3 | Modified |
| `src/app/bizPlan/paceCrawler/usePaceCrawlerDeps.ts` | 3 | Modified |
| `src/app/bizPlan/paceCrawler/devComponents/AssignmentEditorPanel.tsx` | 3 | Modified |
| `src/app/bizPlan/paceCrawler/empTimeline/page.tsx` | 3 | Modified |
| `src/app/bizPlan/paceCrawler/_lib/diffChecker/DiffCheckerTypes.ts` | 4 | Modified |
| `src/app/bizPlan/paceCrawler/employeeCardSelect.ts` | 4 | Modified |
| `src/app/bizPlan/paceCrawler/devComponents/EmployeeCardPanel.tsx` | 4 | Modified |
| `src/app/bizPlan/paceCrawler/devComponents/diffChecker/DiffD5EmployeeCardPanel.tsx` | 4 | Modified |
