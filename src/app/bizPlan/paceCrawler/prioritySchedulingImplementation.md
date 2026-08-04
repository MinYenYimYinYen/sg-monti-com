# Priority Scheduling — Implementation Plan

## Overview

Adds a `PriorityService` feature that lets the customer service department flag specific
customer services for priority scheduling. The production manager sees these on the
PaceCrawler dashboard alongside the existing Urgent card.

---

## Part 1: Data Module — `src/app/priorityService/`

All data-layer files live in a self-contained module so they can be reused elsewhere.

### 1. `PriorityServiceTypes.ts`

```typescript
// Doc — stored in MongoDB
type PriorityServiceDoc = CreatedUpdated & {
  servId: number;
  date?: string;            // ISO date — mutually exclusive with dateRange
  dateRange?: TRange<string>;
  note: string;
};

// Props — hydrated in selectors
type PriorityServiceProps = {
  service: Service;
};

// Final consumable type
type PriorityService = PriorityServiceDoc & PriorityServiceProps;
```

**Constraint**: exactly one of `date` or `dateRange` must be present. Enforced at the
form level; the API stores whichever field is provided.

---

### 2. `PriorityServiceModel.ts`

Mongoose schema for `PriorityServiceDoc`.
- Unique index on `servId` (one priority entry per service).
- Uses `createModel("PriorityService", schema)` to prevent hot-reload errors.

---

### 3. `api/PriorityServiceContract.ts`

```typescript
interface PriorityServiceContract extends ApiContract {
  getAll:    { params: {};                      result: DataResponse<PriorityServiceDoc[]> };
  upsert:    { params: { doc: PriorityServiceDoc }; result: DataResponse<PriorityServiceDoc> };
  deleteOne: { params: { servId: number };      result: DataResponse<PriorityServiceDoc> };
}
```

---

### 4. `api/route.ts`

Roles: `["admin", "office"]` for all operations.

| Operation   | Mongoose call |
|-------------|---------------|
| `getAll`    | `find({}).lean()` — returns all docs; selector filters completed services |
| `upsert`    | `findOneAndUpdate({ servId }, { $set: doc }, { upsert: true, new: true })` |
| `deleteOne` | `findOneAndDelete({ servId })` |

All results sanitized with `cleanMongoObject` / `cleanMongoArray`.

---

### 5. `priorityServiceSlice.ts`

Standard Redux slice using `createStandardThunk`.

```typescript
type PriorityServiceState = {
  docs: PriorityServiceDoc[];
};
```

`extraReducers` handles:
- `getAll.fulfilled` → replace `docs`
- `upsert.fulfilled` → upsert by `servId` (replace if exists, push if new)
- `deleteOne.fulfilled` → remove by `servId`

---

### 6. `priorityServiceSelect.ts`

| Selector | Description |
|----------|-------------|
| `selectDocs` | Raw `PriorityServiceDoc[]` from state |
| `selectPriorityServices` | Joins each doc's `servId` to `centralSelect.services`; filters out `service.status === "S"` (completed); sorts ascending by date (`date` or `dateRange.min`) |
| `selectPriorityServiceMap` | `Map<number, PriorityService>` keyed by `servId` |

---

### 7. `usePriorityService.ts`

```typescript
export function usePriorityService({ autoLoad }: { autoLoad?: boolean } = {}) {
  // dispatches getAll on mount when autoLoad is true
  // exposes: upsert(doc), deleteOne(servId)
}
```

---

### 8. Register Reducer

**`src/store/reducers/index.ts`** — add:
```typescript
import { priorityServiceReducer } from "@/app/priorityService/priorityServiceSlice";
// ...
priorityService: priorityServiceReducer,
```

---

## Part 2: Checked State Logic

The existing `urgentSlice.checkedServIds: number[]` is reused as-is.

- `service.status === "$"` (printed/scheduled) → treated as **visually checked** directly
  in the component via the selector. No Redux mutation needed — the component derives
  `isChecked = checkedServIds.includes(servId) || service.status === "$"`.
- `service.status === "S"` (completed) → excluded by the selector; never shown.

No changes to `urgentSlice.ts`.

---

## Part 3: Display Card — `PriorityServiceCard.tsx`

**Location**: `src/app/bizPlan/paceCrawler/devComponents/urgentServCodes/PriorityServiceCard.tsx`

### Card Structure

```
┌─────────────────────────────────────┐
│ 🗓 Priority                [Checklist▾] │  ← bg-primary/10 header
├─────────────────────────────────────┤
│  Smith, John · 1/1/2026             │  ← summary rows (count)
│  Doe, Jane · 1/3/2026–1/7/2026      │
└─────────────────────────────────────┘
```

### Checklist Popover (flat list, no accordion)

Each row:
| Element | Detail |
|---------|--------|
| `Checkbox` | checked if `checkedServIds.includes(servId)` OR `service.status === "$"` |
| `CustomerLink` | `customer.displayName` |
| `servCodeId` | font-mono, small |
| Date | Single: `"1/1/2026"` · Range: `"1/1/2026–1/3/2026"` (formatted `M/d/yyyy`) |
| `Info` icon | Tooltip showing `note` (and `allTechNotes` if present) |

Items are pre-sorted ascending by date from the selector.

### Wiring

- **`EmployeeCardPanel.tsx`**: add `<PriorityServiceCard />` immediately after `<UrgentServCodeCard />`
- **`usePaceCrawlerDeps.ts`**: add `usePriorityService({ autoLoad: true })`

---

## Part 4: CRUD Page — `src/app/priorityService/`

### Route

Standalone page at `/priorityService` (not under paceCrawler nav).

**`NavMenu.tsx`** — add to `bizPlanSection`:
```typescript
{ title: "Priority Scheduling", href: "/priorityService", roles: ["admin", "office"] }
```

### Page Structure (`page.tsx`)

Uses `CardStack` pattern (same as `AppMethodCRUD`):
- "Create" card (dashed border)
- One card per existing `PriorityService`, header showing `customer.displayName` + date

### `PriorityServiceForm.tsx`

Located at `src/app/priorityService/_components/PriorityServiceForm.tsx`.

#### Service Lookup (create mode only)

```
[  Customer ID  ] ← number input, no spinners
[  Program      ▾] ← disabled until customer loaded; shows progCodeId options
[  Service      ▾] ← disabled until program selected; shows servCodeId options
```

- On blur of Customer ID input: calls `useSingleCustomer().lookup(custId)`
  - Sets `useCustomerContext({ contexts: ["single"] })` on the CRUD page
  - `centralSelect.customers[0]` → the loaded customer
- Program dropdown: `customer.programs` filtered to current season
- Service dropdown: `program.services.filter(s => s.status !== "S")`
  - Auto-selects if only one eligible service
- If selected `servId` already has a `PriorityServiceDoc`, pre-populate the form
  fields (editing mode)

#### Date Section

Radio toggle: **Single Date** / **Date Range**
- Single: `<DatePicker />`
- Range: `<DateRangePicker />`

#### Note

`<textarea>` styled consistently with the project's input classes.

#### Actions

- `<SaveButton>` — calls `usePriorityService().upsert(doc)`
- Delete button (edit mode only) — calls `usePriorityService().deleteOne(servId)` with
  a confirmation step (inline confirmation or Sheet)

---

## File Checklist

```
src/app/priorityService/
  PriorityServiceTypes.ts              ← types
  PriorityServiceModel.ts              ← Mongoose model
  priorityServiceSlice.ts              ← Redux slice + thunks
  priorityServiceSelect.ts             ← Reselect selectors
  usePriorityService.ts                ← React hook
  api/
    PriorityServiceContract.ts         ← API contract
    route.ts                           ← Next.js API route

  page.tsx                             ← CRUD page (CardStack)
  _components/
    PriorityServiceForm.tsx            ← Form component

src/app/bizPlan/paceCrawler/devComponents/urgentServCodes/
  PriorityServiceCard.tsx              ← Display card for production manager

src/store/reducers/index.ts            ← register priorityServiceReducer
src/app/bizPlan/paceCrawler/usePaceCrawlerDeps.ts  ← add usePriorityService
src/app/bizPlan/paceCrawler/devComponents/EmployeeCardPanel.tsx  ← add <PriorityServiceCard />
src/components/navBar/NavMenu.tsx      ← add nav entry
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Separate `PriorityServiceCard` (not merged into `UrgentServCodeCard`) | Data shape is fundamentally different: per-service note + date vs. per-servCode grouping. Merging would require awkward conditional rendering. |
| Selector filters `status === "S"` (not the API) | API returns all docs; selector joins to live service data which has current status. Avoids stale data issues if a service completes after being flagged. |
| Reuse `urgentSlice.checkedServIds` | Avoids new state; `"$"` status is derived display logic, not stored state. |
| CRUD page uses `"single"` customer context | Isolated from paceCrawler's `"active"` context — separate pages, no interference. |
| `date` and `dateRange` are optional fields (not a discriminated union) | Simpler Mongoose schema; form enforces exactly one is present. |
