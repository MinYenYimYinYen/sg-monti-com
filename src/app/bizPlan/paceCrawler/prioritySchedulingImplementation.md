# Priority Scheduling — Implementation

## Overview

Lets the customer service department flag specific customer services for priority scheduling.
The production manager sees these in the PaceCrawler dashboard on a dedicated **Priorities**
tab alongside the existing Urgent checklist.

---

## Part 1: Data Module — `src/app/priorityService/`

### 1. `PriorityServiceTypes.ts`

```typescript
// Doc — stored in MongoDB
type PriorityServiceDoc = CreatedUpdated & {
  servId: number;
  date?: string;              // ISO date — mutually exclusive with dateRange
  dateRange?: TRange<string>;
  note: string;
  custDisplayName: string;    // Denormalized for CRUD list display
  servCodeId: string;         // Denormalized for CRUD list display
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

**Note on denormalized fields**: `custDisplayName` and `servCodeId` are stored on the doc
so the CRUD list can render without requiring a customer context load. The `service` prop
is hydrated at the selector level from whatever customer context is active.

---

### 2. `PriorityServiceModel.ts`

Mongoose schema for `PriorityServiceDoc`.
- Unique index on `servId` (one priority entry per service).
- Uses `createModel("PriorityService", schema)` to prevent hot-reload errors.

---

### 3. `api/PriorityServiceContract.ts` + `api/route.ts`

Roles: `["admin", "office"]` for all operations.

| Operation   | Mongoose call |
|-------------|---------------|
| `getAll`    | `find({}).lean()` — returns all docs; selector filters by status |
| `upsert`    | `findOneAndUpdate({ servId }, { $set: doc }, { upsert: true, new: true })` |
| `deleteOne` | `findOneAndDelete({ servId })` |

All results sanitized with `cleanMongoObject` / `cleanMongoArray`.

---

### 4. `priorityServiceSlice.ts`

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

### 5. `priorityServiceSelect.ts`

**Architecture**: Derives from `centralSelect.services` (not a separate join). Priority
data is hydrated onto each `Service` object by `centralSelectors.ts` (see Part 1b), so
the selector simply filters services where `service.priorityService !== null`.

| Selector | Description |
|----------|-------------|
| `selectDocs` | Raw `PriorityServiceDoc[]` from state — used by CRUD page list |
| `selectPriorityServices` | Filters `centralSelect.services` for services with `priorityService !== null` and eligible status; sorts ascending by date |
| `selectPriorityServiceMap` | `Map<number, PriorityService>` keyed by `servId` |

**Eligible statuses**: `getServiceStatuses(["active", "asap", "printed"])` → `["Y", "*", "$"]`.
Services with status `"N"` (never), `"S"` (completed), or skip codes are excluded.

---

### 1b. `centralSelectors.ts` — Priority hydration

`selectCustomers` takes `selectPriorityServiceDocMap` as an input selector. During service
hydration (Phase 3), each service gets:

```typescript
priorityService: priorityServiceDocMap.get(servDoc.servId) ?? null,
```

This means `Service.priorityService` is always populated from whatever `PriorityServiceDoc[]`
are in Redux state — no separate customer context load needed. When `state.priorityService.docs`
changes, `selectCustomers` recomputes automatically, propagating through `centralSelect.services`
to `selectPriorityServices`.

**`ServiceTypes.ts`** — `ServiceProps` includes:
```typescript
priorityService: PriorityServiceDoc | null;
```

---

### 6. `usePriorityService.ts`

```typescript
export function usePriorityService({ autoLoad }: { autoLoad?: boolean } = {}) {
  // dispatches getAll on mount when autoLoad is true (with staleTime)
  // exposes: upsert(doc), deleteOne(servId)
}
```

**No customer context load** — the hook only fetches `PriorityServiceDoc[]` from MongoDB.
Hydration happens automatically via `centralSelectors`. The CRUD page owns its own customer
context load separately.

---

### 7. Reducer Registration

`src/store/reducers/index.ts` — `priorityService: priorityServiceReducer`

---

## Part 2: Checked State Logic

Reuses `urgentSlice.checkedServIds: number[]`.

- `service.status === "$"` (printed) → visually checked, `disabled` checkbox, no Redux mutation
- Eligible statuses (`"Y"`, `"*"`, `"$"`) → checkbox toggles `urgentActions.toggleChecked(servId)`
- Ineligible statuses → excluded by selector; never shown

No changes to `urgentSlice.ts`.

---

## Part 3: PaceCrawler Integration — Priorities Tab

### New route: `/bizPlan/paceCrawler/priorities`

**`priorities/page.tsx`** → renders `<PrioritiesPanel />`

### `PrioritiesPanel.tsx`

Two-column full-height layout:

```
┌──────────────────────────────────────────────────────────────┐
│  ⚠ Urgent (bg-destructive/10)  │  🗓 Priority (bg-primary/10) │
│  Accordion by servCode          │  Accordion by date           │
│  All expanded by default        │  Collapsed by default        │
│  (no Redux state needed)        │  (no Redux state needed)     │
└──────────────────────────────────────────────────────────────┘
```

Each column has a `ScrollArea` body and an empty state message.

### `UrgentServCodeCard.tsx` — exports `UrgentChecklistContent`

The accordion content is extracted as an exported component for use in `PrioritiesPanel`.
Uses `defaultValue={allServCodeIds}` (all expanded, no Redux state for the full-page version).
The card's popover still uses Redux-tracked expand state for the popover context.

### `PriorityServiceCard.tsx` — exports `PriorityChecklistContent`

The checklist content is extracted as an exported component. Groups `PriorityService[]` by
date key (using `ps.date ?? ps.dateRange?.min`), renders one `AccordionItem` per date group,
collapsed by default.

### `EmployeeCardPanel.tsx`

`<UrgentServCodeCard />` and `<PriorityServiceCard />` removed. The Employee Plan tab shows
only employee cards — the Priorities tab is the dedicated home for checklist information.

### `PaceCrawlerNav.tsx`

Added `{ label: "Priorities", href: "/bizPlan/paceCrawler/priorities", icon: ClipboardList }`
between Employee Plan and Assignments.

### `usePaceCrawlerDeps.ts`

`usePriorityService({ autoLoad: true })` — fetches docs; hydration is automatic via
`centralSelectors` since the `"active"` customer context is already loaded.

---

## Part 4: CRUD Page — `src/app/priorityService/`

### Route: `/priorityService`

NavMenu entry: `{ title: "Priority Scheduling", href: "/priorityService", roles: ["admin", "office"] }`

### `page.tsx`

Left panel: list of `PriorityServiceDoc[]` (raw docs). Right panel: create/edit form.

**Customer context**: The page loads `useCustomerContext({ contexts: ["priorityService"] })`
and dispatches `priorityServiceCustomerActions.getDocs` (byServIds scheme) to populate the
`"priorityService"` context. This is needed for `PriorityServiceListItem` which uses
`priorityServiceSelect.priorityServiceMap` — the map requires the service to be in the
active context to hydrate.

### `PriorityServiceForm.tsx`

**Service eligibility**: `getServiceStatuses(["active", "asap", "printed"])` — only `"Y"`,
`"*"`, `"$"` statuses are selectable. This prevents flagging services that cannot be
scheduled (e.g., `"N"` — never scheduled).

Customer lookup flow:
1. Customer ID input → blur → loads via `priorityServiceCustomerActions` (singleCustomer scheme)
2. Program dropdown (disabled until customer loaded)
3. Service dropdown — eligible statuses only; auto-selects if one option
4. If selected `servId` already has a `PriorityServiceDoc`, pre-populates form (edit-in-create)

---

## File Map

```
src/app/priorityService/
  PriorityServiceTypes.ts              ← types (Doc, Props, final)
  PriorityServiceModel.ts              ← Mongoose model
  priorityServiceSlice.ts              ← Redux slice + thunks
  priorityServiceSelect.ts             ← Reselect selectors (derives from centralSelect)
  usePriorityService.ts                ← React hook (fetch only, no context load)
  api/
    PriorityServiceContract.ts         ← API contract
    route.ts                           ← Next.js API route
  page.tsx                             ← CRUD page
  _components/
    PriorityServiceForm.tsx            ← Form (eligible statuses: active/asap/printed)
    PriorityServiceListItem.tsx        ← List item (requires priorityService context)

src/app/bizPlan/paceCrawler/
  priorities/page.tsx                  ← Priorities tab route
  devComponents/
    PrioritiesPanel.tsx                ← Two-column checklist layout
    urgentServCodes/
      UrgentServCodeCard.tsx           ← exports UrgentChecklistContent
      PriorityServiceCard.tsx          ← exports PriorityChecklistContent
      urgentSlice.ts                   ← checkedServIds reused (no changes)
  PaceCrawlerNav.tsx                   ← Priorities nav item added
  usePaceCrawlerDeps.ts                ← usePriorityService({ autoLoad: true })

src/app/realGreen/customer/
  _lib/entities/types/ServiceTypes.ts  ← ServiceProps.priorityService added
  selectors/centralSelectors.ts        ← priorityServiceDocMap input + hydration

src/store/reducers/index.ts            ← priorityService: priorityServiceReducer
src/components/navBar/NavMenu.tsx      ← Priority Scheduling nav entry
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| `priorityService` hydrated onto `Service` in `centralSelectors` | One-way data flow: all data flows toward `centralSelect`. Avoids inverted dependency where `priorityServiceSelect` would need to trigger its own customer context load. |
| `usePriorityService` does NOT load customer context | The hook only fetches docs. Hydration is automatic via `centralSelectors`. The CRUD page owns its own context load because it needs the `"priorityService"` context for list item display. |
| Selector filters by eligible statuses (not just `!== "S"`) | Prevents services with status `"N"` (never) from appearing even if a bad doc exists in the DB. Consistent with form validation. |
| Priorities tab replaces cards on Employee Plan | Cleaner separation: Employee Plan focuses on workload, Priorities tab is the dedicated checklist view. |
| Urgent checklist: all expanded by default (no Redux) | Full-page view doesn't need persistent expand state — `defaultValue` with all IDs is simpler and correct. |
| Priority checklist: accordion by date, collapsed by default | Groups related services; collapsed default reduces visual noise when many dates are present. |
| Denormalized `custDisplayName` + `servCodeId` on doc | CRUD list renders without requiring a customer context load on mount. |
| `date` and `dateRange` are optional fields (not a discriminated union) | Simpler Mongoose schema; form enforces exactly one is present. |
