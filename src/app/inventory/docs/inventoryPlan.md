# Inventory Feature — Phase 1 Plan

## Overview

A mobile-first inventory tracking tool. The user walks around the warehouse/storage area with a
phone, counts physical product quantities across multiple locations, and compares what's on hand
against what was predicted to be consumed since the last inventory check.

---

## Desired Behaviors & UX

### Page: `/inventory` (Product List)

- Admin-only route.
- On first load, the page shows an empty product list with a date range control and a "Search"
  button. No auto-load — user must explicitly trigger the fetch.
- **Date range**: `{ min: lastInventoryCheck.checkDate | blank, max: today }`. If no prior check
  exists, both inputs are blank and the user fills them manually.
- **Search button**: dispatches the service data fetch for the given date range. Once loaded,
  products from `production.usedAppProducts` and `loadoutInventory` within the range are
  auto-populated into the session's `activeProductIds`.
- **Product list**: each row shows:
  - `product.description`
  - Below description (vertical):
    - `Planned: x [load unit]` — from `loadoutInventory` planned amounts summed across services
    - `Recorded: y [load unit]` — from `production.usedAppProducts` summed across services
  - Running on-hand total (sum of all `ProductCount` entries for this product, displayed in load
    units)
  - Tap → navigates to `/inventory/[productId]` (count entry route)
  - Remove button (with confirmation) — removes product from `activeProductIds`; counts are
    retained in Redux state in case the product is re-added, but are excluded from submission.
- **Add products — "Prev. Inv" trigger**: opens a popover/sheet with:
  - "Add all Qty > 0" convenience button (adds all products from the last `InventoryCheckDoc`
    that had `totalCount > 0`)
  - Multi-select list of all products from the last check; "Add Selected" button
- **Add products — "Manual" trigger**: opens a popover/sheet with:
  - Multi-select list of `ProductSingle` and `ProductSub` products (from Redux product state)
  - "Add Selected" button
- **Save Inventory** button (sticky footer): saves the current session as an `InventoryCheckDoc`.
  Only products in `activeProductIds` that have at least one `ProductCount` entry are persisted.
  Clears the session on success.

### Route: `/inventory/[productId]` (Count Entry)

- Full-screen mobile form for entering counts for a single product.
- Header: product description + running total in load units.
- **Count form**:
  - `Qty` number input
  - `Unit` dropdown — `UnitLabel` values filtered to the product's metric (e.g., only volume
    units for a liquid product). Default: the product's `load` context unit label; fallback to
    `app` unit if no `load` context is configured.
  - **Container toggle**: when enabled, a `Unit Qty` number input appears between `Qty` and
    `Unit`. UX reads: `[qty] [unitQty] [unit] container(s)`.
    - Example: `0.5  250  Gal  container(s)` → 125 gal
    - Example without toggle: `30  Gal` → 30 gal
  - `Location` text input (optional, free text — e.g., "Shed A", "Truck 3")
  - "Add" button — appends a `ProductCount` to the session
- **Count list**: shows all `ProductCount` entries for this product. Each entry shows the raw
  values as entered (qty, unit, unitQty if present, location). Remove button per entry (with
  confirmation).
- Back button → returns to `/inventory` product list.

---

## Data Sources

### Consumption Prediction

Services are filtered from `centralSelect.services` where `service.production?.doneDate` falls
within the session `dateRange`. Two columns per product:

- **Planned** (`loadoutInventory`): sum of planned amounts across all matching services, for each
  productId. Sourced from `service.loadoutInventory` (the `LoadoutBase` tree).
- **Recorded** (`production`): sum of `AppProductCore.amount` across all matching services'
  `production.usedAppProducts`, grouped by `productId`. Amounts are already in app units.

Both are displayed in load units via `UnitConfigDisplay`.

### Product List Population

Three sources (non-exclusive, additive):

1. **Auto from services** (after Search): unique productIds from `production.usedAppProducts` and
   `loadoutInventory` within the date range.
2. **Prev. Inv**: products from the most recent `InventoryCheckDoc` with `totalCount > 0`.
3. **Manual**: user selects from `ProductSingle` and `ProductSub` lists already in Redux.

---

## Types

### `ProductCount` (new — `InventoryTypes.ts`)

```typescript
type ProductCount = {
  qty: number;
  unit: UnitLabel;      // the unit the user selected
  unitQty?: number;     // container size — e.g. 2.5 for "2.5 gal container"
  location?: string;    // free text, optional
};
```

Total app units for one count entry: `qty × (unitQty ?? 1)`, then converted from `unit` to the
product's app unit via `UnitUtils`.

### `InventoryCheckDoc` (stored — `InventoryTypes.ts`)

```typescript
type InventoryCheckDoc = {
  checkDate: string;   // ISO date — the "as of" date (today at time of save)
  entries: {
    productId: number;
    totalCount: number;  // sum of all ProductCounts converted to app units
    unit: UnitLabel;     // the app unit for this product
    counts: ProductCount[];  // raw entries for audit trail
  }[];
  createdBy: string;   // userId
};
```

`checkDate` is sufficient to anchor the next check's date range (`dateRange.min` defaults to the
last `checkDate`). No need to store the prediction date range in the doc.

### `InventoryCheck` (hydrated — `InventoryTypes.ts`)

```typescript
type InventoryCheckEntry = InventoryCheckDoc["entries"][number] & {
  product: ProductCommon;
};

type InventoryCheck = Omit<InventoryCheckDoc, "entries"> & {
  entries: InventoryCheckEntry[];
};
```

### `InventorySession` (Redux local state — `InventoryTypes.ts`)

```typescript
type InventorySession = {
  dateRange: TRange<string> | null;
  activeProductIds: number[];                  // ordered; controls what appears in the list
  counts: Record<number, ProductCount[]>;      // productId → counts; retained even if removed
};
```

### `InventoryPrediction` (computed in selector — `InventoryTypes.ts`)

```typescript
type InventoryPrediction = {
  productId: number;
  product: ProductCommon;
  plannedUsed: number;    // app units — from loadoutInventory, summed across services in range
  recordedUsed: number;   // app units — from production.usedAppProducts, summed in range
  onHandPrev: number;     // app units — from last InventoryCheckDoc entry for this product
  onHandPredicted: number; // onHandPrev - recordedUsed (actual takes priority over planned)
};
```

---

## Data Module (5 Components)

### 1. Contract — `inventoryContract.ts`

```typescript
interface InventoryContract extends ApiContract {
  getInventoryChecks: {
    params: {};
    result: DataResponse<InventoryCheckDoc[]>;
  };
  saveInventoryCheck: {
    params: { check: InventoryCheckDoc };
    result: DataResponse<InventoryCheckDoc>;
  };
}
```

### 2. Route — `src/app/inventory/api/route.ts`

- `getInventoryChecks`: queries `InventoryCheckModel.find({}).sort({ checkDate: -1 }).lean()`
- `saveInventoryCheck`: upserts by `checkDate` + `createdBy`, or always inserts (TBD — likely
  always insert since each check is a snapshot)
- Returns `cleanMongoArray(docs)` / `cleanMongoObject(doc)`

### 3. Slice — `inventorySlice.ts`

State shape:
```typescript
type InventoryState = {
  checks: InventoryCheckDoc[];
  session: InventorySession;
};
```

Actions:
- `setDateRange(range: TRange<string> | null)`
- `addProductToSession(productId: number)`
- `removeProductFromSession(productId: number)` — removes from `activeProductIds` only
- `addCount({ productId: number; count: ProductCount })`
- `removeCount({ productId: number; index: number })`
- `clearSession()`

Thunks:
- `getInventoryChecks` — populates `checks`
- `saveInventoryCheck` — saves and prepends to `checks`, then dispatches `clearSession`

### 4. Selectors — `inventorySelect.ts`

- `inventorySelect.checks` — raw `InventoryCheckDoc[]`
- `inventorySelect.lastCheck` — most recent check (or null)
- `inventorySelect.hydratedChecks` — `InventoryCheck[]` (joins productId → ProductCommon)
- `inventorySelect.session` — raw session
- `inventorySelect.activeProducts` — `ProductCommon[]` ordered by `activeProductIds`
- `inventorySelect.predictions` — `InventoryPrediction[]` — joins session date range against
  `centralSelect.services`; computes `plannedUsed`, `recordedUsed`, `onHandPrev`,
  `onHandPredicted` per active product. Returns empty array if services not loaded.
- `inventorySelect.countsForProduct(productId)` — `ProductCount[]` for a given product
- `inventorySelect.totalAppUnitsForProduct(productId)` — sum of all counts converted to app units

### 5. Hook — `useInventory.ts`

- Auto-fetches `getInventoryChecks` on mount when `autoLoad: true` (checks are lightweight —
  no date range needed; API returns all checks sorted by `checkDate` descending)
- Exposes action dispatchers: `addProduct`, `removeProduct`, `addCount`, `removeCount`,
  `setDateRange`, `save`
- Does NOT auto-fetch service data — that's triggered by the Search button

---

## Dependency Hook — `useInventoryDeps.ts`

Called once at the top of `InventoryPage`. Orchestrates all data loading for the feature.

```typescript
const INVENTORY_CONTEXTS: CustomerContextMode[] = ["recentProduction"];

export function useInventoryDeps() {
  // Tells centralCustomerSlice to merge from the recentProduction source slice
  useCustomerContext({ contexts: INVENTORY_CONTEXTS });

  // Loads progCodes + servCodes — required for loadoutInventory hydration in centralSelectors
  useProgServ({ autoLoad: true });

  // Loads products + unitConfigs + appMethods — required for production hydration
  // and for the Manual add sheet (productSelect.allProductsMap)
  useProduct({ autoLoad: true });

  // Fetches all InventoryCheckDocs on mount; exposes action dispatchers
  useInventory({ autoLoad: true });

  // Reads the committed dateRange from Redux (set when user clicks Search).
  // Re-fetches recentProduction whenever dateRange changes — null-safe, no-ops when null.
  const dateRange = useSelector(inventorySelect.sessionDateRange);
  useRecentProduction(dateRange);
}
```

**Date range two-layer pattern**:
- The `DateRangeSearchControl` component holds local input state (what the user is typing).
- On Search click, it dispatches `inventoryActions.setDateRange(localRange)` to Redux.
- `useInventoryDeps` reads `inventorySelect.sessionDateRange` and passes it to
  `useRecentProduction`, which re-fetches exactly when the committed value changes.
- This prevents re-fetching on every keystroke.

**`useRecentProduction` signature change required**:
- Current signature: `useRecentProduction(dateRange: TRange<string>)`
- New signature: `useRecentProduction(dateRange: TRange<string> | null)`
- Change: add `if (!dateRange) return;` guard inside the `useEffect`, alongside the existing
  `if (!season) return;` guard. Backwards-compatible — existing callers that always pass a
  non-null range are unaffected.

---

## Component Tree

```
src/app/inventory/
├── page.tsx                          ← InventoryPage (product list)
├── [productId]/
│   └── page.tsx                      ← CountEntryPage (full-screen count form)
├── docs/
│   └── inventoryPlan.md
├── _components/
│   ├── ProductListRow.tsx             ← product row: description, planned/recorded, on-hand total
│   ├── AddFromPrevInventorySheet.tsx  ← "Prev. Inv" trigger + popover/sheet
│   ├── AddManualSheet.tsx             ← "Manual" trigger + popover/sheet
│   ├── DateRangeSearchControl.tsx     ← date range inputs + Search button
│   ├── SaveInventoryButton.tsx        ← sticky footer save button
│   └── countEntry/
│       ├── CountForm.tsx              ← qty + unit + container toggle + location inputs
│       ├── CountList.tsx              ← list of existing ProductCount entries with remove
│       └── UnitSelector.tsx           ← UnitLabel dropdown filtered by product metric
├── inventoryContract.ts
├── inventorySlice.ts
├── inventorySelect.ts
├── InventoryTypes.ts
├── useInventory.ts
├── useInventoryDeps.ts
└── api/
    └── route.ts
```

---

## State Management

- **`inventorySlice`** owns both `checks` (persisted history) and `session` (active count).
- **`session.counts`** is a `Record<number, ProductCount[]>` — counts are retained for removed
  products so re-adding a product restores its counts.
- **`session.activeProductIds`** is the source of truth for what appears in the UI and what gets
  submitted.
- On save: only `activeProductIds` entries with `counts.length > 0` are included in the
  `InventoryCheckDoc`. `clearSession` resets `activeProductIds` and `counts` to empty.
- **No manual memoization** — React Compiler handles optimization.

---

## Navigation

- `/inventory` → product list (admin-gated)
- `/inventory/[productId]` → count entry for a specific product
- Back from count entry → returns to product list (Redux state preserved)

---

## Open Questions / Deferred Decisions

- **Mongoose model**: `InventoryCheckModel` — straightforward schema from `InventoryCheckDoc`.
  Needs `createModel()` pattern.
- **Role gating**: confirm the exact role check mechanism used elsewhere in the app (e.g.,
  `authSlice` role === "admin").
- **`ProductCommon` availability**: the `Manual` add sheet assumes `productSelect.allProductsMap`
  is already loaded. If not loaded, the sheet should show a loading state or trigger a fetch.
- **Prediction when services not loaded**: `inventorySelect.predictions` returns `[]` gracefully.
  The UI should show a "Load service data to see predictions" hint rather than an error.
- **Unit display in product list**: planned/recorded/on-hand totals displayed in load units via
  `product.unitConfigDisplay.format({ amount, targetContexts: ["load", "app"] })`.

---

## Phase 2 Task Ownership Preview

### Human Tasks (Y)
- `Y1`: `InventoryTypes.ts` — all new types
- `Y2`: `InventoryCheckModel.ts` — Mongoose model
- `Y3`: `inventoryContract.ts`
- `Y4`: `api/route.ts`
- `Y5`: `inventorySlice.ts` — state + actions + thunks
- `Y6`: `inventorySelect.ts` — all selectors including prediction computation

### AI Tasks (A)
- `A1`: `InventoryPage` + `ProductListRow` + `DateRangeSearchControl` — depends on Y1, Y5, Y6
- `A2`: `AddFromPrevInventorySheet` + `AddManualSheet` — depends on Y1, Y5, Y6
- `A3`: `CountEntryPage` + `CountForm` + `CountList` + `UnitSelector` — depends on Y1, Y5
- `A4`: `SaveInventoryButton` — depends on Y5
