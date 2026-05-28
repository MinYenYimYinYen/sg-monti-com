# Inventory Feature — Phase 2 Implementation

## Human Tasks

- [x] Y0: Modify `useRecentProduction` — null-safe signature
- [x] Y1: `InventoryTypes.ts` — all new types
- [x] Y2: `InventoryCheckModel.ts` — Mongoose model
- [x] Y3: `inventoryContract.ts` — API contract
- [x] Y4: `api/route.ts` — API route handler
- [x] Y5: `inventorySlice.ts` — Redux slice (state + actions + thunks)
- [x] Y6: `inventorySelect.ts` — selectors (including prediction computation)
- [x] Y7: Register `inventoryReducer` in `src/store/reducers/index.ts`

## AI Tasks

- [ ] A1: `InventoryPage` + `ProductListRow` + `DateRangeSearchControl` — depends on Y1, Y5, Y6
- [ ] A2: `AddFromPrevInventorySheet` + `AddManualSheet` — depends on Y1, Y5, Y6
- [ ] A3: `CountEntryPage` + `CountForm` + `CountList` + `UnitSelector` — depends on Y1, Y5
- [ ] A4: `SaveInventoryButton` — depends on Y5
- [ ] A5: `useInventory.ts` + `useInventoryDeps.ts` — depends on Y0, Y5, Y6

---

## Human Task Details

### Y0: Modify `useRecentProduction` — null-safe signature

**File**: `src/app/realGreen/customer/hooks/useRecentProduction.ts`

Change the signature from `TRange<string>` to `TRange<string> | null` and add a null guard
inside the `useEffect`. The `refresh` function should also guard on null.

```typescript
export function useRecentProduction(dateRange: TRange<string> | null) {
  // ...
  useEffect(() => {
    if (!season || !dateRange) return;  // add !dateRange guard
    dispatch(recentProductionGetDocs({ ... }));
  }, [dateRange, dispatch, season]);

  const refresh = () => {
    if (!season || !dateRange) return;  // add !dateRange guard
    // ...
  };
}
```

Backwards-compatible — existing callers that always pass a non-null range are unaffected.

---

### Y1: `InventoryTypes.ts`

**File**: `src/app/inventory/InventoryTypes.ts`

```typescript
import { UnitLabel } from "@/app/realGreen/product/unitConfig/UnitTypes";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { ProductCommon } from "@/app/realGreen/product/_lib/types/ProductTypes";

export type ProductCount = {
  qty: number;
  unit: UnitLabel;
  unitQty?: number;   // container size — e.g. 2.5 for "2.5 gal container"
  location?: string;  // free text, optional
};

export type InventoryCheckEntry = {
  productId: number;
  totalCount: number;  // sum of all ProductCounts converted to app units
  unit: UnitLabel;     // the app unit for this product
  counts: ProductCount[];
};

export type InventoryCheckDoc = {
  checkDate: string;   // ISO date — "as of" date (today at time of save)
  entries: InventoryCheckEntry[];
  createdBy: string;   // user.userName
};

// Hydrated version — productId resolved to ProductCommon
export type InventoryCheckEntryHydrated = InventoryCheckEntry & {
  product: ProductCommon;
};

export type InventoryCheck = Omit<InventoryCheckDoc, "entries"> & {
  entries: InventoryCheckEntryHydrated[];
};

export type InventorySession = {
  dateRange: TRange<string> | null;
  activeProductIds: number[];
  counts: Record<number, ProductCount[]>;  // retained even when product removed from activeProductIds
};

export type InventoryPrediction = {
  productId: number;
  product: ProductCommon;
  plannedUsed: number;     // app units — from loadoutInventory, summed across services in range
  recordedUsed: number;    // app units — from production.usedAppProducts, summed in range
  onHandPrev: number;      // app units — from last InventoryCheckDoc entry for this product
  onHandPredicted: number; // onHandPrev - recordedUsed
};
```

**Note on `ProductCount` → app units conversion**:
`totalAppUnits = qty × (unitQty ?? 1)`, then convert from `unit` to the product's app unit via
`UnitUtils`. The product's app unit is `product.unitConfig.conversions.app.unitLabel` (a
`UnitLabel`). Use the appropriate `UnitUtils` converter based on `product.unit.metric`.

---

### Y2: `InventoryCheckModel.ts`

**File**: `src/app/inventory/InventoryCheckModel.ts`

Use `createModel()` from `@/lib/mongoose/createModel`. Schema mirrors `InventoryCheckDoc`.
`counts` is an array of subdocuments with `{ qty, unit, unitQty?, location? }`.

```typescript
import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { InventoryCheckDoc } from "./InventoryTypes";

const ProductCountSchema = new mongoose.Schema(
  {
    qty: { type: Number, required: true },
    unit: { type: String, required: true },
    unitQty: { type: Number },
    location: { type: String },
  },
  { _id: false },
);

const InventoryCheckEntrySchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true },
    totalCount: { type: Number, required: true },
    unit: { type: String, required: true },
    counts: { type: [ProductCountSchema], required: true },
  },
  { _id: false },
);

const InventoryCheckSchema = new mongoose.Schema<InventoryCheckDoc>(
  {
    checkDate: { type: String, required: true },
    entries: { type: [InventoryCheckEntrySchema], required: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
);

// Index for fast "latest check" queries
InventoryCheckSchema.index({ checkDate: -1 });

export const InventoryCheckModel = createModel("InventoryCheck", InventoryCheckSchema);
```

---

### Y3: `inventoryContract.ts`

**File**: `src/app/inventory/inventoryContract.ts`

```typescript
import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { InventoryCheckDoc } from "./InventoryTypes";

export interface InventoryContract extends ApiContract {
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

---

### Y4: `api/route.ts`

**File**: `src/app/inventory/api/route.ts`

```typescript
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { InventoryContract } from "../inventoryContract";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { InventoryCheckModel } from "../InventoryCheckModel";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { InventoryCheckDoc } from "../InventoryTypes";

const handlers: HandlerMap<InventoryContract> = {
  getInventoryChecks: {
    roles: ["admin"],
    handler: async () => {
      await connectToMongoDB();
      const docs = await InventoryCheckModel.find({}).sort({ checkDate: -1 }).lean();
      return { success: true, payload: cleanMongoArray<InventoryCheckDoc>(docs) };
    },
  },
  saveInventoryCheck: {
    roles: ["admin"],
    handler: async ({ check }) => {
      await connectToMongoDB();
      // Always insert — each check is an immutable snapshot
      const doc = await InventoryCheckModel.create(check);
      return { success: true, payload: cleanMongoObject<InventoryCheckDoc>(doc.toObject()) };
    },
  },
};

export const POST = createRpcHandler<InventoryContract>(handlers);
```

---

### Y5: `inventorySlice.ts`

**File**: `src/app/inventory/inventorySlice.ts`

State shape:
```typescript
type InventoryState = {
  checks: InventoryCheckDoc[];
  session: InventorySession;
};
```

Actions (all synchronous reducers):
- `setDateRange(range: TRange<string> | null)` — sets `session.dateRange`
- `addProductToSession(productId: number)` — appends to `activeProductIds` if not already present
- `removeProductFromSession(productId: number)` — removes from `activeProductIds` only; counts
  are retained in `session.counts`
- `addCount({ productId: number; count: ProductCount })` — appends to `session.counts[productId]`
- `removeCount({ productId: number; index: number })` — removes by index from
  `session.counts[productId]`
- `clearSession()` — resets `session` to `{ dateRange: null, activeProductIds: [], counts: {} }`

Thunks (use `createStandardThunk`):
```typescript
const getInventoryChecks = createStandardThunk<InventoryContract, "getInventoryChecks">({
  typePrefix: "inventory/getInventoryChecks",
  apiPath: "/inventory/api",
  opName: "getInventoryChecks",
});

const saveInventoryCheck = createStandardThunk<InventoryContract, "saveInventoryCheck">({
  typePrefix: "inventory/saveInventoryCheck",
  apiPath: "/inventory/api",
  opName: "saveInventoryCheck",
});
```

`extraReducers`:
- `getInventoryChecks.fulfilled` → `state.checks = action.payload`
- `saveInventoryCheck.fulfilled` → `state.checks.unshift(action.payload)` then
  dispatch `clearSession()` (use `builder.addCase` + `dispatch` via thunk middleware, or call
  `clearSession` as a separate action in the `useInventory` hook after `save` resolves)

**Note on `clearSession` after save**: The cleanest approach is to call `clearSession` in the
`useInventory` hook after `save().unwrap()` resolves, rather than inside `extraReducers`. This
keeps the slice pure and lets the UI handle the success flow.

Export:
```typescript
export const inventoryActions = {
  ...inventorySlice.actions,
  getInventoryChecks,
  saveInventoryCheck,
};
export const inventoryReducer = inventorySlice.reducer;
```

---

### Y6: `inventorySelect.ts`

**File**: `src/app/inventory/inventorySelect.ts`

Key selectors:

```typescript
// Raw state
const selectChecks = (state: AppState) => state.inventory.checks;
const selectSession = (state: AppState) => state.inventory.session;
const selectSessionDateRange = (state: AppState) => state.inventory.session.dateRange;

// Last check (most recent — API returns sorted desc)
const selectLastCheck = createSelector([selectChecks], (checks) => checks[0] ?? null);

// Hydrated checks — joins productId → ProductCommon
const selectHydratedChecks = createSelector(
  [selectChecks, productSelect.allProductsMap],
  (checks, allProductsMap): InventoryCheck[] =>
    checks.map((check) => ({
      ...check,
      entries: check.entries.flatMap((entry) => {
        const product = allProductsMap.get(entry.productId);
        if (!product) return [];
        return [{ ...entry, product }];
      }),
    })),
);

// Active products — ordered by activeProductIds
const selectActiveProducts = createSelector(
  [selectSession, productSelect.allProductsMap],
  (session, allProductsMap): ProductCommon[] =>
    session.activeProductIds.flatMap((id) => {
      const product = allProductsMap.get(id);
      return product ? [product] : [];
    }),
);

// Predictions — joins services in dateRange against active products
// Returns [] when dateRange is null or services not loaded
const selectPredictions = createSelector(
  [selectSession, selectLastCheck, centralSelect.services, productSelect.allProductsMap],
  (session, lastCheck, services, allProductsMap): InventoryPrediction[] => {
    const { dateRange, activeProductIds } = session;
    if (!dateRange || activeProductIds.length === 0) return [];

    // Filter services to those completed within the dateRange
    const inRange = services.filter((service) => {
      const doneDate = service.production?.doneDate;
      return doneDate && doneDate >= dateRange.min && doneDate <= dateRange.max;
    });

    return activeProductIds.flatMap((productId) => {
      const product = allProductsMap.get(productId);
      if (!product) return [];

      // Recorded: sum AppProductCore.amount for this productId across in-range services
      let recordedUsed = 0;
      for (const service of inRange) {
        const usedProducts = service.production?.usedAppProducts ?? [];
        for (const ap of usedProducts) {
          if (ap.productId === productId) recordedUsed += ap.amount;
        }
      }

      // Planned: sum planned amounts from loadoutInventory across in-range services
      // Walk the LoadoutBase tree: masters → subProducts, masters → equipments → constituents
      let plannedUsed = 0;
      for (const service of inRange) {
        const loadout = service.loadoutInventory;
        for (const master of loadout.masters) {
          // Master-level (area products — productId matches master)
          if (master.productId === productId) plannedUsed += master.plannedAmount;
          // Sub-products under master
          for (const sub of master.subProducts) {
            if (sub.productId === productId) plannedUsed += sub.plannedAmount;
          }
          // Constituents in equipment entries (skip water carrier — ratePerKsf === 0)
          for (const equipment of master.equipments) {
            for (const constituent of equipment.constituents) {
              if (constituent.product.productId === productId && constituent.ratePerKsf > 0) {
                plannedUsed += constituent.plannedAmount;
              }
            }
          }
        }
        // Top-level singles and subProducts
        for (const single of loadout.singles) {
          if (single.productId === productId) plannedUsed += single.startAmount ?? 0;
        }
        for (const sub of loadout.subProducts) {
          if (sub.productId === productId) plannedUsed += sub.plannedAmount;
        }
      }

      // On-hand from last check
      const lastEntry = lastCheck?.entries.find((e) => e.productId === productId);
      const onHandPrev = lastEntry?.totalCount ?? 0;
      const onHandPredicted = onHandPrev - recordedUsed;

      return [{ productId, product, plannedUsed, recordedUsed, onHandPrev, onHandPredicted }];
    });
  },
);

// Per-product counts (for CountEntryPage)
// These are factory selectors — call with productId
const makeSelectCountsForProduct = (productId: number) =>
  createSelector([selectSession], (session): ProductCount[] =>
    session.counts[productId] ?? [],
  );

// Total app units for a product (for ProductListRow on-hand display)
// Conversion: qty × (unitQty ?? 1) → convert from unit to app unit via UnitUtils
// This is a helper function, not a selector, since it needs the product's metric
```

**`totalAppUnitsForProduct` helper** (pure function, not a selector — call from components or
other selectors):
```typescript
export function countToAppUnits(count: ProductCount, metric: Metric): number {
  const rawQty = count.qty * (count.unitQty ?? 1);
  // Use UnitUtils to convert from count.unit to the app unit for this metric
  // Volume: UnitUtils.volume(rawQty, count.unit as VolumeUnit["desc"]).to(appUnitLabel)
  // Weight: UnitUtils.weight(rawQty, count.unit as WeightUnit["desc"]).to(appUnitLabel)
  // etc.
  // For count/area/unknown metrics, return rawQty directly (no conversion needed)
}

export function sumCountsToAppUnits(counts: ProductCount[], metric: Metric): number {
  return counts.reduce((sum, count) => sum + countToAppUnits(count, metric), 0);
}
```

Export:
```typescript
export const inventorySelect = {
  checks: selectChecks,
  lastCheck: selectLastCheck,
  hydratedChecks: selectHydratedChecks,
  session: selectSession,
  sessionDateRange: selectSessionDateRange,
  activeProducts: selectActiveProducts,
  predictions: selectPredictions,
  makeCountsForProduct: makeSelectCountsForProduct,
};
```

---

### Y7: Register reducer in `src/store/reducers/index.ts`

Add to `combineReducers`:
```typescript
import { inventoryReducer } from "@/app/inventory/inventorySlice";
// ...
inventory: inventoryReducer,
```

---

## AI Task Details

### A1: `InventoryPage` + `ProductListRow` + `DateRangeSearchControl`

**Files**:
- `src/app/inventory/page.tsx`
- `src/app/inventory/_components/ProductListRow.tsx`
- `src/app/inventory/_components/DateRangeSearchControl.tsx`

**`InventoryPage`**:
- Calls `useInventoryDeps()` at top level
- Reads `inventorySelect.activeProducts`, `inventorySelect.predictions`,
  `inventorySelect.session`
- Layout: sticky header with `DateRangeSearchControl` + "Prev. Inv" + "Manual" triggers;
  scrollable product list; sticky footer with `SaveInventoryButton`
- Admin-gated: check `useSelector(authSelect.role) === "admin"` — redirect or show access denied

**`ProductListRow`**:
- Props: `product: ProductCommon`, `prediction: InventoryPrediction | undefined`
- Reads `inventorySelect.makeCountsForProduct(product.productId)` for on-hand total
- Dispatches `inventoryActions.removeProductFromSession(productId)` on remove (with confirmation)
- Navigates to `/inventory/[productId]` on tap
- Layout: product description (large, mobile-friendly tap target); below description:
  `Planned: x [load unit]` and `Recorded: y [load unit]` (vertical); on-hand total in load units;
  remove button (trash icon, right side)
- Display amounts via `product.unitConfigDisplay.format({ amount, targetContexts: ["load", "app"] })`

**`DateRangeSearchControl`**:
- Local state: `localMin: string`, `localMax: string` (controlled inputs)
- On mount: initialize from `inventorySelect.lastCheck?.checkDate` (for min) and
  `dateStrings.today()` (for max) — only if `session.dateRange` is null
- Search button: dispatches `inventoryActions.setDateRange({ min: localMin, max: localMax })`
  then dispatches `inventoryActions.addProductToSession` for each productId found in
  `inventorySelect.predictions` (auto-populate from services)
- Auto-populate logic: after `setDateRange`, the `useInventoryDeps` hook triggers
  `useRecentProduction` which re-fetches. The `predictions` selector then computes the product
  list. The page should watch `predictions` and auto-add new productIds to the session.
  Use a `useEffect` on `predictions` that dispatches `addProductToSession` for each productId
  not already in `activeProductIds`.

---

### A2: `AddFromPrevInventorySheet` + `AddManualSheet`

**Files**:
- `src/app/inventory/_components/AddFromPrevInventorySheet.tsx`
- `src/app/inventory/_components/AddManualSheet.tsx`

**`AddFromPrevInventorySheet`**:
- Trigger: "Prev. Inv" button
- Reads `inventorySelect.hydratedChecks[0]` (last check entries)
- "Add all Qty > 0" button: dispatches `addProductToSession` for all entries with
  `totalCount > 0`
- Multi-select list: each entry shows `product.description` + `totalCount` in load units;
  checkboxes; "Add Selected" button dispatches `addProductToSession` for each selected productId
- Uses a Sheet (bottom sheet on mobile) from shadcn

**`AddManualSheet`**:
- Trigger: "Manual" button
- Reads `productSelect.productSingles` + `productSelect.productSubs`
- Multi-select list grouped by category; search/filter input at top
- "Add Selected" button dispatches `addProductToSession` for each selected productId
- Uses a Sheet (bottom sheet on mobile)

---

### A3: `CountEntryPage` + `CountForm` + `CountList` + `UnitSelector`

**Files**:
- `src/app/inventory/[productId]/page.tsx`
- `src/app/inventory/_components/countEntry/CountForm.tsx`
- `src/app/inventory/_components/countEntry/CountList.tsx`
- `src/app/inventory/_components/countEntry/UnitSelector.tsx`

**`CountEntryPage`**:
- Reads `productId` from route params; looks up `productSelect.allProductsMap.get(productId)`
- Reads `inventorySelect.makeCountsForProduct(productId)` for the count list
- Header: product description + running total in load units (via `sumCountsToAppUnits` +
  `unitConfigDisplay.format`)
- Renders `CountForm` + `CountList`
- Back button → `router.back()`

**`CountForm`**:
- Local state: `qty: string`, `unit: UnitLabel`, `unitQty: string`, `isContainer: boolean`,
  `location: string`
- Default unit: `product.unitConfig.conversions.load.unitLabel` cast to `UnitLabel`; fallback to
  `product.unitConfig.conversions.app.unitLabel`
- Container toggle: when on, shows `unitQty` input between `qty` and `unit`
- UX layout: `[qty input] [unitQty input?] [UnitSelector] container(s)? [location input]`
- "Add" button: validates `qty > 0`; dispatches `inventoryActions.addCount({ productId, count })`
  then resets form (keep unit selection, clear qty/unitQty/location)

**`UnitSelector`**:
- Props: `metric: Metric`, `value: UnitLabel`, `onChange: (unit: UnitLabel) => void`
- Filters `UnitLabel` values by `UL_METRIC_MAP[label] === metric`
- Renders as a native `<select>` or shadcn `Select` — native select is better on mobile

**`CountList`**:
- Props: `counts: ProductCount[]`, `productId: number`
- Each entry: `qty × (unitQty ?? 1) [unit]` + location (if present); remove button
- Remove: confirmation dialog → dispatches `inventoryActions.removeCount({ productId, index })`

---

### A4: `SaveInventoryButton`

**File**: `src/app/inventory/_components/SaveInventoryButton.tsx`

- Reads `inventorySelect.session` to compute submittable entries:
  `activeProductIds` filtered to those with `counts.length > 0`
- Disabled when no submittable entries
- On click: builds `InventoryCheckDoc` from session + `authSelect.user.userName` +
  `dateStrings.today()` as `checkDate`; calls `useInventory().save(check)`
- `totalCount` per entry: `sumCountsToAppUnits(counts, product.unit.metric)` — needs
  `productSelect.allProductsMap` to get the product's metric
- Sticky footer positioning via `FooterPortal` (already exists at `src/components/FooterPortal.tsx`)

---

### A5: `useInventory.ts` + `useInventoryDeps.ts`

**Files**:
- `src/app/inventory/useInventory.ts`
- `src/app/inventory/useInventoryDeps.ts`

**`useInventory.ts`**:
```typescript
export function useInventory({ autoLoad }: { autoLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(inventoryActions.getInventoryChecks({
        params: {},
        config: { staleTime: realGreenConst.paramTypesCacheTime },
      }));
    }
  }, [autoLoad, dispatch]);

  const addProduct = (productId: number) =>
    dispatch(inventoryActions.addProductToSession(productId));

  const removeProduct = (productId: number) =>
    dispatch(inventoryActions.removeProductFromSession(productId));

  const addCount = (productId: number, count: ProductCount) =>
    dispatch(inventoryActions.addCount({ productId, count }));

  const removeCount = (productId: number, index: number) =>
    dispatch(inventoryActions.removeCount({ productId, index }));

  const setDateRange = (range: TRange<string> | null) =>
    dispatch(inventoryActions.setDateRange(range));

  const save = async (check: InventoryCheckDoc) => {
    await dispatch(inventoryActions.saveInventoryCheck({
      params: { check },
      config: { force: true },
    })).unwrap();
    dispatch(inventoryActions.clearSession());
  };

  return { addProduct, removeProduct, addCount, removeCount, setDateRange, save };
}
```

**`useInventoryDeps.ts`**:
```typescript
const INVENTORY_CONTEXTS: CustomerContextMode[] = ["recentProduction"];

export function useInventoryDeps() {
  useCustomerContext({ contexts: INVENTORY_CONTEXTS });
  useProgServ({ autoLoad: true });
  useProduct({ autoLoad: true });
  useInventory({ autoLoad: true });

  const dateRange = useSelector(inventorySelect.sessionDateRange);
  useRecentProduction(dateRange);  // null-safe after Y0
}
```

---

## Status Table

| Task | Owner | Status | Depends On |
|------|-------|--------|------------|
| Y0: `useRecentProduction` null-safe | Human | ☐ | — |
| Y1: `InventoryTypes.ts` | Human | ☐ | — |
| Y2: `InventoryCheckModel.ts` | Human | ☐ | Y1 |
| Y3: `inventoryContract.ts` | Human | ☐ | Y1 |
| Y4: `api/route.ts` | Human | ☐ | Y2, Y3 |
| Y5: `inventorySlice.ts` | Human | ☐ | Y1, Y3 |
| Y6: `inventorySelect.ts` | Human | ☐ | Y1, Y5 |
| Y7: Register reducer | Human | ☐ | Y5 |
| A1: `InventoryPage` + `ProductListRow` + `DateRangeSearchControl` | AI | ☐ | Y1, Y5, Y6 |
| A2: `AddFromPrevInventorySheet` + `AddManualSheet` | AI | ☐ | Y1, Y5, Y6 |
| A3: `CountEntryPage` + `CountForm` + `CountList` + `UnitSelector` | AI | ☐ | Y1, Y5 |
| A4: `SaveInventoryButton` | AI | ☐ | Y1, Y5, Y6 |
| A5: `useInventory.ts` + `useInventoryDeps.ts` | AI | ☐ | Y0, Y5, Y6 |
