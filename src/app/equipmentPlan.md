# Equipment Plan — Multi-AppMethod Support

## Background

Currently a carrier sub-product (Water) on a `ProductMaster` can reference a single `AppMethod`
via `SubProductConfigDoc.appMethodId`. The AppMethod drives the water rate calculation.
The new requirement is to support multiple pieces of equipment running simultaneously on the same
job (e.g., Main Tank + Injection Unit), each with its own water rate and its own set of mixed
products. Workers choose a pre-defined **package** (complete truck configuration) at the start
of their day.

---

## Core Concepts

### `Equipment`
One piece of physical equipment (e.g., Main Tank, Injection Unit). A persisted entity with its
own MongoDB collection. Has its own AppMethod (water rate) and its own list of mixed products.
Water is auto-instantiated (client-side constant) when `AppMethod.needsWater === true`.
The water row's `productCode` and `description` are both set to `equipmentId`.

### `EquipmentPackage`
A complete, pre-defined truck configuration. A persisted entity with its own MongoDB collection.
Contains one or more `Equipment` items (stored as embedded `EquipmentDoc` copies).
Workers pick exactly one package per master product per day (radio select).

**Example — "Tank Mix" master:**
```
Package A: "Full Rig"
  - MAIN_TANK      → TANK_MIX_STD AppMethod, mixes [B, C]
  - INJECTION_UNIT → INJECTION_STD AppMethod, mixes [A]

Package B: "Main Tank Only"
  - MAIN_TANK → TANK_MIX_STD AppMethod, mixes [A, B, C]
```

---

## Type Changes

### 1. `AppMethod` — add `needsWater`
```
// AppMethodTypes.ts
AppMethod = AppMethodResult & {
  appMethodId: string
  description: string
  needsWater: boolean   // NEW — true for all existing records
}
```

### 2. New types in `src/app/equipment/`

Both `Equipment` and `EquipmentPackage` are full Data Modules (own MongoDB collection,
Contract, Route, Slice, Selectors, Hook, CRUD UI).

```
// EquipmentTypes.ts

EquipmentDoc = {
  equipmentId: string        // natural key (e.g. "MAIN_TANK")
  description: string        // display label
  appMethodId: string        // references AppMethod
  mixedProductIds: number[]  // sub-products mixed into this equipment's water
}

EquipmentProps = {
  appMethod: AppMethod
  waterRate: number          // coverage.volume / coverage.area → units/ksf
}

Equipment = EquipmentDoc & EquipmentProps
```

```
// EquipmentPackageTypes.ts

EquipmentPackageDoc = {
  packageId: string          // natural key (e.g. "FULL_RIG")
  description: string        // display label (e.g. "Full Rig")
  equipmentDocs: EquipmentDoc[]  // embedded copies of Equipment items in this package
}

EquipmentPackageProps = {
  equipmentDocs: Equipment[] // hydrated — EquipmentDoc & EquipmentProps
}

EquipmentPackage = EquipmentPackageDoc & EquipmentPackageProps
```

### 3. `SubProductConfigDoc` — REMOVE AppMethod fields
```
// BEFORE
SubProductConfigDoc = {
  subId: number
  storedRate: number
  appMethodId: string | null
  useAppMethod: boolean
  mixedProductIds: number[]
}

// AFTER
SubProductConfigDoc = {
  subId: number
  storedRate: number
  // appMethodId, useAppMethod, mixedProductIds REMOVED
}
```

### 4. `ProductMasterDocProps` — add `equipmentPackageDocs`
```
// BEFORE
ProductMasterDocProps = CreatedUpdated & ProductCommonDocProps & {
  productId: number
  subProductConfigDocs: SubProductConfigDoc[]
}

// AFTER
ProductMasterDocProps = CreatedUpdated & ProductCommonDocProps & {
  productId: number
  equipmentPackageDocs: EquipmentPackageDoc[]   // NEW — embedded packages for this master
  subProductConfigDocs: SubProductConfigDoc[]
}
```

### 5. `SubProductConfig` (hydrated) — remove AppMethod fields
```
// BEFORE
SubProductConfig = SubProductConfigDoc & {
  subProduct: ProductSub
  appMethod: AppMethod | null
  rate: number
}

// AFTER
SubProductConfig = SubProductConfigDoc & {
  subProduct: ProductSub
  rate: number
  // appMethod, appMethodId, useAppMethod, mixedProductIds REMOVED
}
```

### 6. `ProductMasterProps` — add hydrated packages
```
// BEFORE
ProductMasterProps = ProductCommonProps & {
  subProductConfigs: SubProductConfig[]
}

// AFTER
ProductMasterProps = ProductCommonProps & {
  subProductConfigs: SubProductConfig[]
  equipmentPackages: EquipmentPackage[]   // NEW
}
```

---

## Mongoose Schema Changes

### `AppMethodModel.ts`
```
+ needsWater: { type: Boolean, required: true, default: true }
```

### `EquipmentModel.ts` (new collection)
```
equipmentId:      String (required, unique)
description:      String (required)
appMethodId:      String (required)
mixedProductIds:  [Number] (default: [])
```

### `EquipmentPackageModel.ts` (new collection)
```
packageId:    String (required, unique)
description:  String (required)
equipmentDocs: [{
  equipmentId:      String (required)
  description:      String (required)
  appMethodId:      String (required)
  mixedProductIds:  [Number] (default: [])
}]
```

### `ProductDocPropsModel.ts`
```
// ADD top-level field:
equipmentPackageDocs: [{
  packageId:    String (required)
  description:  String (required)
  equipmentDocs: [{
    equipmentId:      String (required)
    description:      String (required)
    appMethodId:      String (required)
    mixedProductIds:  [Number] (default: [])
  }]
}]

// REMOVE from subProductConfigDocs subdocument:
- appMethodId
- useAppMethod
- mixedProductIds
```

---

## Water as a Client-Side Constant

Water moves out of the API/DB and becomes a client-side constant.

```
// New file: src/app/realGreen/product/_lib/waterProduct.ts
export const WATER_PRODUCT_ID = -2   // existing hard-coded value

export const waterProductSub: ProductSub = {
  productId: WATER_PRODUCT_ID,
  description: "Water",
  productCode: "WATER",
  // ... sensible defaults for all required ProductSub fields
}
```

When instantiating water for a specific `Equipment` entry, override `productCode` and `description`
with `equipmentId`:
```
const waterForEquipment: ProductSub = {
  ...waterProductSub,
  productCode: entry.equipmentId,
  description: entry.equipmentId,
}
```
`productId` stays as `WATER_PRODUCT_ID`. Only `productCode` and `description` are overridden.

---

## Selector Changes (`productSelectors.ts`)

- `hydrateRate` simplifies: no more AppMethod lookup per sub-config, just returns `storedRate`
- New `hydrateEquipmentPackages(doc, appMethodMap)` helper:
  - Maps each `EquipmentPackageDoc` → `EquipmentPackage`
  - For each `EquipmentDoc`: looks up `AppMethod` from `appMethodMap`, calculates `waterRate`
    from `appMethod.coverage.volume / coverage.area` (normalized to ksf)
- `selectProductMasters` adds `equipmentPackages: hydrateEquipmentPackages(doc, appMethodMap)`

---

## `hydrateLoadoutInventory` Changes

Currently groups sub-products by `appMethodId` on each sub-config.

**After this change:**
- Reads `master.equipmentPackages` (already hydrated)
- Filters to the worker's selected package (from Redux `packageSelections`)
- For each `Equipment` in the selected package:
  - Creates one `equipmentEntries[]` entry in the loadout:
    - `equipmentId` = `entry.equipmentId` (bucket key)
    - `mixProduct` = `{ ...waterProductSub, productCode: entry.equipmentId, description: entry.equipmentId }`
    - `plannedAmount` = `size × entry.waterRate`
    - `subProducts` = sub-products from `entry.mixedProductIds`
- Non-mixed sub-products go to `master.subProducts` as before

---

## Equipment Selection Redux (not persisted)

New state in `loadoutFormSlice`:
```
// Added to LoadoutFormState:
packageSelections: {
  masterProductId: number
  selectedPackageId: string
}[]
```

New actions:
```
setPackageSelection(masterProductId, packageId)
clearPackageSelections()
```

**Loadout form behavior:**
- For each master with `equipmentPackages.length > 0`, a package selection prompt appears
  before the loadout rows are shown
- If only one package exists → auto-selected, no prompt
- Worker picks one package (radio button) → loadout populates with correct water rows
- Changing package resets that master's `startAmount`/`finishAmount` values

---

## Product Setup UI Changes (`MasterEditPanel` / `MasterSubConfig`)

- Remove per-sub `useAppMethod` checkbox, `appMethodId` dropdown, `mixedProductIds` multi-select
  from `SubProductConfigDoc` editing
- Add new **Equipment Packages** accordion section to `MasterEditPanel`:
  - List of packages (each showing: `packageId`, `description`, list of equipment items)
  - Add / Edit / Remove packages
  - Each package editor: package ID + description fields, list of equipment items
  - Each equipment item editor: `equipmentId`, `description`, AppMethod selector,
    mixed products multi-select (from master's sub-products)
  - `needsWater` is shown on the AppMethod (read-only in this context)

---

## Mix Chart Changes

- Mix chart page gets an **Equipment Package** selector per master (radio group)
- Selecting a package filters the chart to show only that package's equipment items
- Each `Equipment` item can generate its own chart (separate PDF per item)
- The pivot column selector (size vs. water vs. any sub-product) remains per chart
- **Bonus:** When a package has multiple equipment items, offer "Generate All Charts"
  to produce one PDF per item

---

## Migration Strategy

One-time migration (API handler or script) for existing data:

**For each `ProductMasterDoc` with any `subProductConfigDoc` where `useAppMethod === true`:**
1. Find the carrier sub-config (the one with `useAppMethod: true`)
2. Create one `EquipmentPackage` with one `Equipment` item:
   ```
   packageId:    existingAppMethodId
   description:  existingAppMethod.description
   equipmentDocs: [{
     equipmentId:     existingAppMethodId
     description:     existingAppMethod.description
     appMethodId:     existingAppMethodId
     mixedProductIds: existingMixedProductIds
   }]
   ```
3. Remove `appMethodId`, `useAppMethod`, `mixedProductIds` from all `subProductConfigDocs`
4. Remove the water sub-product entry from `subProductConfigDocs` (auto-injected going forward)
5. Write `equipmentPackageDocs` to the document

For all `AppMethod` documents: add `needsWater: true`.

**Also seed `Equipment` collection:** For each unique `equipmentId` created above, insert a
corresponding `Equipment` document so the standalone collection is populated.

---

## Implementation Order

1. `AppMethod` — add `needsWater` (type + model + API + CRUD UI checkbox)
2. New types: `EquipmentDoc`, `EquipmentProps`, `Equipment`, `EquipmentPackageDoc`, `EquipmentPackageProps`, `EquipmentPackage`
3. `EquipmentModel.ts` + `EquipmentPackageModel.ts` schema (new collections)
4. `ProductDocPropsModel` schema update (add `equipmentPackageDocs`, remove old sub-config fields)
5. Migration script / handler
6. `waterProduct.ts` — client-side water constant
7. `productSelectors.ts` — `hydrateEquipmentPackages`, simplify `hydrateRate`
8. `hydrateLoadoutInventory` — read from `equipmentPackages`
9. `loadoutFormSlice` — add `packageSelections` state + actions
10. `LoadoutForm` / `MasterProductCard` — package selection prompt UI
11. `MasterEditPanel` / `MasterSubConfig` — Equipment Packages section
12. Equipment Data Module — Contract, Route, Slice, Selectors, Hook, CRUD UI
13. EquipmentPackage Data Module — Contract, Route, Slice, Selectors, Hook, CRUD UI
14. Mix chart — package selector, per-equipment chart generation

---

## `LoadoutBase` Type Change — `appMethods` → `equipmentEntries`

The `appMethods[]` array on each master in `LoadoutBase` is renamed to `equipmentEntries[]`
and the inner `appMethodId` field is replaced with `equipmentId`. This makes `LoadoutBase`
a faithful representation of the business reality — equipment is a first-class concept, not
an implementation detail of AppMethod.

### Current `LoadoutBase` (relevant excerpt)
```
masters[]:
  appMethods[]:
    appMethodId: string      ← was used as bucket key
    appMethod: AppMethod
    mixProductId, mixProduct, mixProductUnitId, mixProductUnit
    plannedAmount, startAmount, finishAmount
    subProducts[]
  subProducts[]
```

### Updated `LoadoutBase`
```
masters[]:
  equipmentEntries[]:        ← RENAMED from appMethods
    equipmentId: string      ← RENAMED from appMethodId (bucket key = Equipment.equipmentId)
    appMethod: AppMethod      ← unchanged
    mixProductId, mixProduct, mixProductUnitId, mixProductUnit  ← unchanged
    plannedAmount, startAmount, finishAmount  ← unchanged
    subProducts[]             ← unchanged
  subProducts[]               ← unchanged
```

`LoadoutDoc` (the persisted MongoDB shape) also renames `appMethods` → `equipmentEntries`
and `appMethodId` → `equipmentId` in its sub-documents.

### `aggregateLoadoutInventory` — one-line change
Groups by `equipmentId` instead of `appMethod.appMethodId`:
```
// BEFORE
const appMethodId = appMethod.appMethod.appMethodId;

// AFTER
const equipmentId = equipmentEntry.equipmentId;
```
Return shape also renames `appMethods` → `equipmentEntries`. No other logic changes.

### Why this matters
- `LoadoutBase` becomes a faithful tree: `masters → equipmentEntries → subProducts`
- Equipment is a real business entity (machines have hours, maintenance costs, capital value)
- Consumers that don't care about equipment can flatten at their layer (e.g., `flattenLoadoutPlanned`)
- We cannot unflatten a flattened structure without re-deriving — same lesson as `AppProduct`

---

## Equipment and EquipmentPackage as Data Modules

Both `Equipment` and `EquipmentPackage` are implemented as full Data Modules following the
project's Data Module Pattern (Contract, Route, Slice, Selectors, Hook, CRUD UI). Both have
their own MongoDB collections and their own Redux slices.

### `Equipment` Data Module

```
// Persisted entity — own MongoDB collection
EquipmentDoc = {
  equipmentId: string        // natural key (e.g., "MAIN_TANK")
  description: string
  appMethodId: string        // default AppMethod for this machine
  mixedProductIds: number[]  // default mixed products
}

EquipmentProps = {
  appMethod: AppMethod
  waterRate: number
}

Equipment = EquipmentDoc & EquipmentProps
```

- **Reuse across packages** — the same "Main Tank" machine can be referenced by multiple
  packages without duplicating its description and AppMethod
- **Machine-level reporting** — total planned hours/volume across all products that use
  this machine, aggregated at the equipment level
- **Capital budgeting** — track machine age, planned replacement cycles
- **CRUD UI** — simple form: ID + description + AppMethod selector + mixed products

### `EquipmentPackage` Data Module

```
// Persisted entity — own MongoDB collection
EquipmentPackageDoc = {
  packageId: string          // natural key (e.g., "FULL_RIG")
  description: string
  equipmentDocs: EquipmentDoc[]  // embedded copies (snapshot at time of package creation)
}

EquipmentPackageProps = {
  equipmentDocs: Equipment[] // hydrated
}

EquipmentPackage = EquipmentPackageDoc & EquipmentPackageProps
```

- **Embedded copies** — `EquipmentDoc` items are embedded in the package (not FK references)
  so a package is a self-contained snapshot. Editing an `Equipment` entity does not
  automatically update existing packages — admin must update the package explicitly.
- **CRUD UI** — package editor: ID + description + list of equipment items (each with
  AppMethod selector and mixed products multi-select)

### Relationship to `ProductMaster`

`ProductMasterDoc` embeds `equipmentPackageDocs: EquipmentPackageDoc[]` — the packages
available for workers to choose from when filling out a loadout for that master product.
This is an embedded list (not FK references), consistent with how `subProductConfigDocs`
are embedded on the master.

---

## What Will Break (Impact Analysis)

### Immediate compile errors after type changes:

| File | What breaks |
|---|---|
| `ProductDocPropsModel.ts` | Schema fields `appMethodId`, `useAppMethod`, `mixedProductIds` removed from sub-docs |
| `productSelectors.ts` | `hydrateRate` reads `subProductConfigDoc.appMethodId` / `useAppMethod` — must simplify |
| `hydrateLoadoutInventory.ts` | Reads `subConfig.appMethodId`, `subConfig.mixedProductIds`, `subConfig.useAppMethod` — full rewrite |
| `hydrateProductsPlanned.ts` | Reads `subConfig.rate` — still valid, but water sub-product is no longer in `subProductConfigDocs` so water will disappear from `productsPlanned` / `AppProduct[]` |
| `MasterSubConfig.tsx` | Props `onUpdateUseAppMethod`, `onUpdateAppMethodId`, `onUpdateMixedProductIds` removed |
| `MasterEditPanel.tsx` | Handlers `updateUseAppMethod`, `updateAppMethodId`, `updateMixedProductIds` removed |
| `AppMethodDeleteSheet.tsx` | `getAffectedProducts` scans `config.appMethodId` on sub-configs — must scan `equipmentPackageDocs` instead |
| `getAffectedProducts.ts` | Same — reads `config.appMethodId` |
| `SubProductConfig` consumers | Any code reading `.appMethod`, `.useAppMethod`, `.appMethodId`, `.mixedProductIds` on a hydrated `SubProductConfig` |
| `LoadoutTypes.ts` | `appMethods[]` renamed to `equipmentEntries[]`, `appMethodId` → `equipmentId` |
| `aggregateLoadoutInventory.ts` | Groups by `appMethod.appMethodId` → groups by `equipmentId`; rename `appMethods` → `equipmentEntries` |
| Loadout form UI components | Any component reading `master.appMethods` → reads `master.equipmentEntries` |

### Functional gaps after migration:

- `hydrateProductsPlanned` (→ `AppProduct[]` → `productsPlanned` on `Service`) currently
  includes water via `subProductConfigs`. After removing water from sub-configs, water will
  be absent from `productsPlanned`. This affects `bizPlan` inventory selectors and anywhere
  `productsPlanned` is consumed. **See AppProduct deprecation section below.**

---

## Truck & Ride-On Tracking

### `tracksTankLevel` on `AppMethod`

Add `tracksTankLevel: boolean` to `AppMethod` alongside `needsWater`:

```
AppMethod = AppMethodResult & {
  appMethodId: string
  description: string
  needsWater: boolean        // auto-instantiate water carrier
  tracksTankLevel: boolean   // NEW — true for tank-fed equipment, false for multi-fill
}
```

**Semantics:**
- `true` — equipment is filled once at the start of the day (Main Tank, Injection Unit, Toro).
  Worker enters `startAmount` and `finishAmount`. Accuracy inference uses the delta.
- `false` — equipment is filled multiple times throughout the day (Backpack Sprayer, Push
  Spreader). `startAmount`/`finishAmount` remain `null` and are hidden in the UI.
  Planned water usage is still calculated and displayed as an expected total for the day.
  Accuracy inference is one-directional: "you should have used ~X gallons today."

**Defaults for existing records:** All existing AppMethods are tank-fed → `tracksTankLevel: true`.

### `LoadoutValidator` Changes

`LoadoutValidator` currently requires `startAmount`/`finishAmount` on all `appMethods[]`
entries (now `equipmentEntries[]`). After this change, validation must skip entries where
`appMethod.tracksTankLevel === false`:

```
// BEFORE (in appMethods.startAmount validator):
if (value === null) {
  return `Start amount is required for ${parent.mixProduct.productCode}`;
}

// AFTER (in equipmentEntries.startAmount validator):
if (!parent.appMethod.tracksTankLevel) return null;  // skip non-tank equipment
if (value === null) {
  return `Start amount is required for ${parent.mixProduct.productCode}`;
}
```

Same guard applies to `equipmentEntries.finishAmount` and
`equipmentEntries.subProducts.startAmount`/`finishAmount` validators.

Note: `LoadoutValidator` also needs the `appMethods` → `equipmentEntries` rename throughout.

### Current Plan — Hardcoded IDs on `LoadoutDoc`

Add `truckId` and `rideOnId` as optional string fields to `LoadoutDoc`. Workers select from
a pre-defined list (managed in a config slice or `globalSettings`) rather than free-typing,
ensuring consistent IDs for reporting.

```
// Updated LoadoutDoc
LoadoutDoc = {
  employeeId: string
  routeDate: string
  truckId: string | null       // NEW — which truck they're driving today
  rideOnId: string | null      // NEW — which ride-on machine (Toro Spreader, etc.)
  packageSelections: [{        // NEW — persist the package choice
    masterProductId: number
    selectedPackageId: string
  }]
  masters: [...]
}
```

**Note:** `packageSelections` is persisted in `LoadoutDoc`. Since the loadout is persisted,
the package choice should be too — otherwise reopening a saved loadout loses which package
the worker selected.

**Config list (now):** `truckIds: string[]` and `rideOnIds: string[]` stored in `globalSettings`
or a new `equipmentConfig` slice. No MongoDB collection needed yet.

**UI:** Worker selects `truckId` and `rideOnId` at the top of `LoadoutForm` before filling
out product amounts. Optional fields — no blocking if not selected.

### `ProductRule` and Equipment Routing

`ProductRule` (`sizeOperator: "lte" | "gt" | "all"`) already determines which master products
apply to a given service size. This is the existing mechanism that routes small lawns to the
backpack sprayer and large lawns to the tank/toro. The `EquipmentPackage` system builds on
top of this — the package selected by the worker determines which equipment items are active
for the masters that `ProductRule` assigns to their services.

### Accuracy Inference (existing planned feature)

The loadout workflow already supports this:
- **Start of day:** Worker enters `startAmount` for each equipment entry (water in tank)
- **End of day:** Worker enters `finishAmount` (water remaining)
- **Actual water used:** `startAmount - finishAmount`
- **Expected water used:** `sum(service.size × waterRate)` for all services on the route

Comparing actual vs. expected water consumption per equipment entry gives:
- **Calibration check** — is the AppMethod's rate accurate for this machine?
- **Worker accuracy** — did the tech apply the right amount per service?
- **Cross-validation with RealGreen API** — `AppProduct.amount` (recorded by tech in field)
  vs. physical tank measurement provides a second data point

The `ProductRule` size-based routing means we already know which services used the tank vs.
the toro, so we can attribute water consumption to the correct equipment entry without
additional worker input.

**This feature requires no new data collection** — it's a reporting/analytics layer on top
of data already captured by `LoadoutDoc` + `AppProduct` from the RealGreen API.

### Future: `Truck` and `RideOn` as Persisted Entities

When the maintenance department is ready, promote `truckId`/`rideOnId` from config strings
to full MongoDB entities:

```
Truck = {
  truckId: string          // natural key (e.g., "TRUCK_3")
  description: string      // e.g., "2019 Ford F-250 #3"
  purchaseDate: string     // ISO 8601
  notes: string
  // future: lastServiceDate, estimatedHours, maintenanceLog[]
}

RideOn = {
  rideOnId: string         // natural key (e.g., "TORO_1")
  description: string      // e.g., "Toro Spreader/Sprayer SN-4821"
  purchaseDate: string
  notes: string
}
```

Migration: existing `truckId`/`rideOnId` strings in `LoadoutDoc` become foreign keys to
these collections. Historical loadout data is preserved — the string IDs match.

**Enables:**
- Maintenance issue tracking and service scheduling
- Per-truck/per-machine throughput reporting (gallons applied, area covered, hours estimated)
- Capital budgeting based on actual utilization data
- Accuracy inference aggregated by machine (detect calibration drift over time)

---

## AppProduct Deprecation

`AppProduct` (`src/app/realGreen/_lib/subTypes/AppProduct.ts`) is a flat type:
```
AppProduct = {
  productId, servId, amount, size,
  productCommon: ProductCommon
}
```

It is used in two contexts:
1. **`productsPlanned`** on `Service` — hydrated by `hydrateProductsPlanned` from `subProductConfigs`
2. **`usedAppProducts`** on `Production` — hydrated from raw RealGreen API data (`productsUsed`)

### The Case for Deprecation

`productsPlanned` is a flattened, denormalized version of what `LoadoutBase` already represents
more richly. `LoadoutBase` (via `hydrateLoadoutInventory`) already:
- Groups by master product
- Separates equipment (water) rows from mixed product rows
- Carries full `ProductSub` / `ProductMaster` references (not just `ProductCommon`)
- Calculates `plannedAmount` from `size × rate`

`AppProduct.amount` = `size × rate` — the same calculation, just without the structure.

### What Stays as `AppProduct`

Only `usedAppProducts` on `Production` — this comes from the raw RealGreen API and has no
`LoadoutBase` equivalent. It stays as-is.

### Deprecation Plan

**Phase 1 — Add `flattenLoadoutPlanned` helper**

New utility function that converts `LoadoutBase` → flat product list (the bridge):
```
function flattenLoadoutPlanned(loadout: LoadoutBase): FlatPlannedProduct[] {
  return loadout.masters.flatMap(master => [
    // Regular sub-products
    ...master.subProducts.map(sub => ({
      productId: sub.productId,
      amount: sub.plannedAmount,
      size: master.plannedAmount,
      productCommon: sub.product.productCommon,
    })),
    // Equipment sub-products (mixed products inside each equipment entry)
    ...master.equipmentEntries.flatMap(entry =>
      entry.subProducts.map(sub => ({
        productId: sub.productId,
        amount: sub.plannedAmount,
        size: master.plannedAmount,
        productCommon: sub.product.productCommon,
      }))
    ),
    // The water rows themselves (tracked for metered water usage reporting)
    ...master.equipmentEntries.map(entry => ({
      productId: entry.mixProductId,
      amount: entry.plannedAmount,
      size: master.plannedAmount,
      productCommon: entry.mixProduct.productCommon,
    })),
  ])
}
```

**Note on water in bizPlan:** Water is not currently purchased, but tracking planned water
usage is valuable for future scenarios (metered water at a new location). Including water rows
in `flattenLoadoutPlanned` ensures `bizPlan` inventory selectors capture water usage
automatically once equipment packages are configured.

**Phase 2 — Update `bizPlan` selectors**

Replace `service.productsPlanned` with `flattenLoadoutPlanned(service.loadoutInventory)` in
all affected selectors in `inventorySelectors.ts` and `createInventorySelectors.ts`:
- `selectProductUsagePlanned`
- `selectProductsMixedActualPlanned`
- `selectProductComparison` (LY vs TY)
- `selectProductsByServCode`

The grouping/summarizing logic is unchanged — only the data source changes.

**Phase 3 — Remove `productsPlanned` from `Service`**
- Remove `productsPlanned: AppProduct[]` from `ServiceTypes.ts`
- Delete `hydrateProductsPlanned` function
- Remove the `productsPlanned` assignment in `centralSelectors.ts`

**Phase 4 — Remove `useAppProducts` hook**

`useAppProducts.getPlannedAppProductTotal` just sums `productsPlanned`. Replace with a
selector or inline `flattenLoadoutPlanned`.

**Phase 5 — Slim down `AppProduct.ts`**

Keep only what's needed for `usedAppProducts`:
- Keep: `AppProductRaw`, `AppProductCore`, `AppProduct`, `remapAppProducts`
- Remove: `AppProductProps` if `productCommon` is no longer needed on the planned side

### `loadoutInventory` in Planning Context (bizPlan)

`hydrateLoadoutInventory` will use the worker's `packageSelections` from Redux to filter
equipment entries in the daily inventory workflow. For `bizPlan` (reporting context, no worker
selection), we want **all** planned products across all packages.

**Solution:** `hydrateLoadoutInventory` accepts an optional `packageId` parameter.
When `null`/`undefined`, it includes all equipment packages (union of all `mixedProductIds`
across all packages). This gives `bizPlan` the full planned picture including all water rows.

### What Gets Removed vs Kept

| Symbol | Action |
|---|---|
| `AppProductRaw` | Keep (raw API) |
| `AppProductCore` | Keep (raw API) |
| `AppProduct` | Keep (usedAppProducts) |
| `remapAppProducts` | Keep (raw API) |
| `productsPlanned: AppProduct[]` on Service | **Remove** → replaced by `loadoutInventory` |
| `hydrateProductsPlanned` | **Remove** |
| `useAppProducts` hook | **Remove** |

### Implementation Order (relative to Equipment Plan)

This refactor can happen **in parallel with or after** the equipment plan. The dependency is:
- `hydrateLoadoutInventory` must be updated to read from `equipmentPackages` (step 8 of
  the equipment plan) before `flattenLoadoutPlanned` can include water rows correctly.
- `bizPlan` selectors can be migrated to `flattenLoadoutPlanned` at any time, even before
  the equipment plan, as long as `loadoutInventory` is already on `Service` (it is).

---

---

## Implementation Status & Next Steps

### ✅ Completed (TypeScript clean — `tsc --noEmit` exits 0)

| Plan Step | File(s) | Status |
|---|---|---|
| `AppMethod` — add `needsWater` + `tracksTankLevel` | `AppMethodTypes.ts`, `AppMethodModel.ts` | ✅ Done |
| `EquipmentDoc` / `EquipmentProps` / `Equipment` types | `src/app/equipment/EquipmentTypes.ts` | ✅ Done |
| `EquipmentPackageDoc` / `EquipmentPackageProps` / `EquipmentPackage` types | `src/app/equipment/equipmentPackage/EquipmentPackageTypes.ts` | ✅ Done |
| `SubProductConfigDoc` — removed `appMethodId`, `useAppMethod`, `mixedProductIds` | `ProductMasterTypes.ts` | ✅ Done |
| `ProductMasterDocProps` — added `equipmentPackageDocs` | `ProductMasterTypes.ts` | ✅ Done |
| `ProductMasterProps` — added `equipmentPackages` (hydrated) | `ProductMasterTypes.ts` | ✅ Done |
| `ProductDocPropsModel` schema — added `equipmentPackageDocs`, removed old sub-config fields | `ProductDocPropsModel.ts` | ✅ Done |
| `AppMethodModel` schema — added `needsWater`, `tracksTankLevel` | `AppMethodModel.ts` | ✅ Done |
| `waterProduct` client-side constant | `src/app/equipment/waterProduct.ts` | ✅ Done |
| `hydrateRate` simplified (returns `storedRate` only) | `hydrateRate.ts` | ✅ Done |
| `hydrateEquipmentPackages` in `productSelectors.ts` | `productSelectors.ts` | ✅ Done |
| `hydrateLoadoutInventory` — reads `equipmentPackages`, uses `packageSelections` | `hydrateLoadoutInventory.ts` | ✅ Done |
| `LoadoutBase` — `appMethods[]` → `equipmentEntries[]`, `appMethodId` → `equipmentId` | `LoadoutTypes.ts` | ✅ Done |
| `LoadoutDoc` — same rename | `LoadoutTypes.ts` | ✅ Done |
| `aggregateLoadoutInventory` — groups by `equipmentId` | `aggregateLoadoutInventory.ts` | ✅ Done |
| `loadoutFormSlice` — `packageSelections` state + `setPackageSelection` / `clearPackageSelections` | `loadoutFormSlice.ts` | ✅ Done |
| `loadoutFormSelect` — `packageSelections` selector, `usedProductIds` iterates `equipmentEntries` | `loadoutFormSelect.ts` | ✅ Done |
| `LoadoutValidator` — `equipmentEntries` path + `tracksTankLevel` guard | `LoadoutValidator.ts` | ✅ Done |
| `loadoutFormHelpers.initializeLoadout` — maps `equipmentEntries` | `loadoutFormHelpers.ts` | ✅ Done |
| `MasterProductCard` — renders `AppMethodSection` per `entry.equipmentId` | `MasterProductCard.tsx` | ✅ Done |
| `AppMethodSection` — props `equipmentId` (was `appMethodId`) | `AppMethodSection.tsx` | ✅ Done |
| `MasterSubConfig` — removed `useAppMethod`, `appMethodId`, `mixedProductIds` props | `MasterSubConfig.tsx` | ✅ Done |
| `MasterEditPanel` — removed old AppMethod handlers from sub-product editing | `MasterEditPanel.tsx` | ✅ Done |
| `getAffectedProducts` — scans `equipmentPackageDocs[].equipmentDocs[].appMethodId` | `getAffectedProducts.ts` | ✅ Done |

---

### 🔲 Next Steps

#### A. Data Migration (Required before production use)

The MongoDB documents still have the old shape (`subProductConfigDocs` with `appMethodId` / `useAppMethod` / `mixedProductIds`, no `equipmentPackageDocs`). The app will silently produce empty `equipmentEntries` for all masters until migration runs.

**Migration script / API handler** (`src/app/realGreen/product/api/route.ts` or a one-off script):

For each `ProductMasterDoc` where any `subProductConfigDoc` has `useAppMethod === true`:
1. Find the carrier sub-config (the one with `useAppMethod: true`)
2. Create one `EquipmentPackage` with one `Equipment` item:
   ```
   packageId:    existingAppMethodId
   description:  existingAppMethod.description
   equipmentDocs: [{
     equipmentId:     existingAppMethodId
     description:     existingAppMethod.description
     appMethodId:     existingAppMethodId
     mixedProductIds: existingMixedProductIds
   }]
   ```
3. Remove `appMethodId`, `useAppMethod`, `mixedProductIds` from all `subProductConfigDocs`
4. Remove the water sub-product entry from `subProductConfigDocs` (auto-injected going forward)
5. Write `equipmentPackageDocs` to the document

For all `AppMethod` documents: add `needsWater: true`, `tracksTankLevel: true`.

Also seed the `Equipment` collection: for each unique `equipmentId` created above, insert a
corresponding `Equipment` document.

**Note:** Mongoose schema already accepts the new shape. Old fields (`appMethodId`, `useAppMethod`, `mixedProductIds`) on sub-docs are simply ignored by the new schema — no crash, just silent data loss on re-save. Run migration before any admin saves a master product.

---

#### B. Package Selection UI (Required for loadout to populate)

`hydrateLoadoutInventory` returns empty `equipmentEntries` until a package is selected. Workers need a way to pick a package.

**Component:** `PackageSelector` inside `MasterProductCard`

Behavior:
- If `master.equipmentPackages.length === 0` → show nothing (no packages configured yet)
- If `master.equipmentPackages.length === 1` → auto-select on mount (dispatch `setPackageSelection`), show no prompt
- If `master.equipmentPackages.length > 1` → show radio group before loadout rows appear

```tsx
// Rough sketch
function PackageSelector({ masterProductId }: { masterProductId: number }) {
  const dispatch = useDispatch();
  const master = useSelector(...); // from productSelect.productMasters
  const packageSelections = useSelector(loadoutFormSelect.packageSelections);
  const currentSelection = packageSelections.find(s => s.masterProductId === masterProductId);

  // Auto-select single package
  useEffect(() => {
    if (master.equipmentPackages.length === 1 && !currentSelection) {
      dispatch(loadoutFormActions.setPackageSelection({
        masterProductId,
        selectedPackageId: master.equipmentPackages[0].packageId,
      }));
    }
  }, [master.equipmentPackages, currentSelection, masterProductId, dispatch]);

  if (master.equipmentPackages.length <= 1) return null;

  return (
    <RadioGroup
      value={currentSelection?.selectedPackageId ?? ""}
      onValueChange={(packageId) =>
        dispatch(loadoutFormActions.setPackageSelection({ masterProductId, selectedPackageId: packageId }))
      }
    >
      {master.equipmentPackages.map(pkg => (
        <RadioGroupItem key={pkg.packageId} value={pkg.packageId}>
          {pkg.description}
        </RadioGroupItem>
      ))}
    </RadioGroup>
  );
}
```

**Placement:** At the top of `MasterProductCard`, before the `equipmentEntries` loop.

**Changing package:** Should reset `startAmount`/`finishAmount` for that master's entries. Add a `resetMasterLoadoutAmounts(masterProductId)` action to `loadoutFormSlice`.

---

#### C. Equipment Packages CRUD UI in `MasterEditPanel` (Required for setup)

`MasterEditPanel` currently has no UI for creating/editing `equipmentPackageDocs`. Without this, admins cannot configure equipment packages for any master product.

**New accordion section:** "Equipment Packages" (below Sub-Products)

Each package row shows:
- `packageId` (text input, natural key)
- `description` (text input)
- List of equipment items (each with `equipmentId`, `description`, AppMethod selector, mixed products multi-select)
- Add / Remove item buttons
- Add / Remove package buttons

**Save action:** New `updateMasterEquipmentPackages({ masterId, equipmentPackageDocs })` thunk in `useProduct` / `productSlice`.

**API handler:** New `updateEquipmentPackages` operation in `ProductContract` + `api/route.ts`.

---

#### D. `AppMethod` CRUD — Add `needsWater` + `tracksTankLevel` Checkboxes

The `AppMethodCreate` form needs two new boolean fields:
- `needsWater` checkbox (default: `true`) — "Auto-add water carrier row"
- `tracksTankLevel` checkbox (default: `true`) — "Track tank start/finish amounts"

These are already in `AppMethodTypes.ts` and `AppMethodModel.ts` but the CRUD UI (`AppMethodCreate.tsx`, `createAppMethodSlice.ts`) needs to expose them.

---

#### E. `LoadoutDoc` Persistence — `packageSelections` Field

`LoadoutDoc` in `LoadoutTypes.ts` does not yet include `packageSelections`. Per the plan, the package choice should be persisted so reopening a saved loadout restores the worker's selection.

```typescript
// Add to LoadoutDoc:
packageSelections: {
  masterProductId: number;
  selectedPackageId: string;
}[];
```

Also add `truckId: string | null` and `rideOnId: string | null` per the Truck & Ride-On Tracking section.

The Mongoose schema for `LoadoutDoc` (wherever it lives) needs these fields added.

---

#### F. `AppMethodSection` — `unitConfigDisplay` on `waterProduct`

`AppMethodSection.tsx` calls `plannedEntry.mixProduct.unitConfigDisplay.format(...)`. The `waterProduct` constant in `waterProduct.ts` uses `baseProductSub` which may not have a valid `unitConfigDisplay`. Verify that `waterProduct` gets a proper `unitConfig` / `unitConfigDisplay` attached (either in the constant itself or when it's spread into `mixProduct` in `hydrateLoadoutInventory`).

**Quick fix if needed:** Give `waterProduct` an explicit `unitConfig` with `conversions.load.unitLabel = "Gal"` and `conversionFactor = 1`.

---

#### G. `AppMethodDeleteSheet` — Update for Equipment Packages

`AppMethodDeleteSheet.tsx` currently calls `getAffectedProducts(method.appMethodId, productMasters)` which now correctly scans `equipmentPackageDocs`. However the delete handler calls `updateMasterSubProducts` to reassign `appMethodId` on sub-configs — this logic is now stale. The reassign path needs to update `equipmentPackageDocs[].equipmentDocs[].appMethodId` instead.

---

#### H. Mix Chart — Package Selector + Per-Equipment Charts

Per the plan:
- Mix chart page gets an **Equipment Package** selector per master (radio group)
- Each `Equipment` item generates its own chart
- "Generate All Charts" option for multi-equipment packages

This is a new feature layer on top of the existing mix chart — no existing code is broken, just not yet extended.

---

#### I. Equipment + EquipmentPackage Data Modules (Standalone CRUD)

Both `Equipment` and `EquipmentPackage` need standalone Data Module implementations:

**Equipment Data Module** (`src/app/equipment/`):
- `EquipmentContract.ts` — `getEquipment`, `createEquipment`, `updateEquipment`, `deleteEquipment`
- `api/route.ts` — CRUD handlers
- `equipmentSlice.ts` — Redux slice
- `equipmentSelect.ts` — selectors (map by `equipmentId`)
- `useEquipment.ts` — auto-fetch hook
- CRUD UI — list + create/edit form (ID, description, AppMethod selector, mixed products)

**EquipmentPackage Data Module** (`src/app/equipment/equipmentPackage/`):
- `EquipmentPackageContract.ts` — `getEquipmentPackages`, `createEquipmentPackage`, etc.
- `api/route.ts` — CRUD handlers
- `equipmentPackageSlice.ts` — Redux slice
- `equipmentPackageSelect.ts` — selectors (map by `packageId`)
- `useEquipmentPackage.ts` — auto-fetch hook
- CRUD UI — list + create/edit form (ID, description, equipment items list)

---

#### J. `bizPlan` / `AppProduct` Deprecation (Lower Priority)

`productsPlanned` on `Service` still comes from `hydrateProductsPlanned` (reading old `subProductConfigs`). After migration, water will no longer be in `subProductConfigs`, so water disappears from `bizPlan` inventory selectors.

Per the deprecation plan:
1. Add `flattenLoadoutPlanned(loadout: LoadoutBase)` utility
2. Replace `service.productsPlanned` with `flattenLoadoutPlanned(service.loadoutInventory)` in `bizPlan` selectors
3. Remove `productsPlanned` from `Service`, delete `hydrateProductsPlanned`

This can be done independently of the UI work above.

---

### Priority Order for Next Session

1. **B — Package Selection UI** (unblocks runtime testing immediately)
2. **F — `waterProduct` unitConfigDisplay** (needed for `AppMethodSection` to render without crash)
3. **A — Data Migration** (needed for real data; can test with manually-seeded `equipmentPackageDocs` first)
4. **C — Equipment Packages CRUD** (needed for admins to configure packages)
5. **D — AppMethod CRUD checkboxes** (small, needed for `needsWater`/`tracksTankLevel` to be settable)
6. **E — `LoadoutDoc` persistence fields** (needed before saving loadouts)
7. **G — `AppMethodDeleteSheet` reassign path** (correctness fix)
8. **H — Mix Chart** (new feature)
9. **I — Equipment + EquipmentPackage Data Modules** (standalone CRUD)
10. **J — `bizPlan` deprecation** (cleanup, lower priority)

---

## Unit System Reference

The `unitConfig` module (`src/app/realGreen/product/unitConfig/`) provides the unit
infrastructure used throughout the product and loadout systems. Implementors must understand
this system when working with amounts in `LoadoutBase`, `AppMethod`, and `AppMethodSolver`.

### Three Unit Contexts (`UNIT_CONTEXTS`)

```
app      → Application unit  — the internal standard unit (e.g., Lbs, Fl Oz, Gal)
load     → Loading unit      — what the tech physically handles (e.g., "50lb Bag", "2.5 Gal Jug")
purchase → Purchasing unit   — what the business buys (e.g., "Pallet (40 bags)")
```

**Convention:** All internal calculations and stored values use **app units**.
Display to techs uses **load units**. Purchasing reports use **purchase units**.

`UnitConversion.conversionFactor` is the multiplier from app unit to that context's unit:
- 1 app unit × conversionFactor = 1 load/purchase unit
- e.g., 50lb bag: `conversionFactor = 50` (50 lbs per bag)

### Two Conversion Tools

**`UnitUtils`** — static, single-step standard unit conversions (Gal ↔ Fl Oz, SF ↔ ksf, etc.)
- Use for: display formatting, simple rate normalization, selector calculations
- Example: `UnitUtils.area(1000, UnitLabel.sf).to(UnitLabel.ksf)` → `1`

**`UnitMath`** — dimensional analysis engine for multi-step physics calculations
- Use for: `AppMethodSolver` rate calculations, compound unit arithmetic
- Internally stores values in base units (gallons, feet, seconds)
- Tracks dimensional exponents (e.g., `{ volume: 1, length: -2 }` = volume per area)
- `UnitMath` delegates to `UnitUtils` for conversions — composition, not duplication
- Example: `flowRate.multiply(overlap).divide(groundSpeed).divide(width).toVolumePerArea(...)`

**Rule of thumb:** Use `UnitUtils` when dimensions are known and the calculation is one step.
Use `UnitMath` when the calculation involves multiple steps or dimensional validation matters.

### `UnitConfigDisplay`

`UnitConfigDisplay` formats app-unit quantities into compound human-readable strings using
a waterfall of contexts:
```
display.format({ amount: 162, targetContexts: ["load", "app"] })
// → "3 Bags 12 Lbs"  (3 × 50lb bags + 12 lbs remainder)
```

Used in loadout form and bizPlan to show techs quantities in load units.

### Relevance to Equipment Plan

- `AppMethod.coverage` stores volume/area in standard units (Gal, SF/ksf) — use `UnitUtils`
  to normalize to ksf for `waterRate` calculation in `hydrateEquipmentPackages`
- `LoadoutBase.equipmentEntries[].plannedAmount` is in **app units** (Gal for water)
- The loadout form displays `plannedAmount` to techs in **load units** via `UnitConfigDisplay`
- `startAmount`/`finishAmount` entered by techs are in **load units** and must be converted
  to app units before accuracy inference calculations
- Water's `ProductUnitConfig` (if it has one) defines what "load unit" means for water
  (e.g., "Gallon" with conversionFactor = 1, since water is already measured in gallons)
