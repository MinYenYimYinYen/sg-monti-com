# Equipment Plan — Multi-AppMethod Support

## Background

Currently a carrier sub-product (Water) on a `ProductMaster` can reference a single `AppMethod`
via `SubProductConfigDoc.appMethodId`. The AppMethod drives the water rate calculation.
The new requirement is to support multiple pieces of equipment running simultaneously on the same
job (e.g., Main Tank + Injection Unit), each with its own water rate and its own set of mixed
products. Workers choose a pre-defined **scenario** (complete truck configuration) at the start
of their day.

---

## Core Concepts

### `EquipmentEntry`
One piece of equipment. Has its own AppMethod (water rate) and its own list of mixed products.
Water is auto-instantiated (client-side constant) when `AppMethod.needsWater === true`.
The water row's `productCode` and `description` are both set to `equipmentId`.

### `EquipmentScenario`
A complete, pre-defined truck configuration. Contains one or more `EquipmentEntry` items.
Workers pick exactly one scenario per master product per day (radio select, not persisted).

**Example — "Tank Mix" master:**
```
Scenario A: "Full Rig"
  - MAIN_TANK      → TANK_MIX_STD AppMethod, mixes [B, C]
  - INJECTION_UNIT → INJECTION_STD AppMethod, mixes [A]

Scenario B: "Main Tank Only"
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

### 2. New types in `ProductMasterTypes.ts`
```
EquipmentEntry = {
  equipmentId: string        // user-defined, unique within master (e.g. "MAIN_TANK")
  description: string        // display label
  appMethodId: string        // references AppMethod
  mixedProductIds: number[]  // sub-products mixed into this equipment's water
}

EquipmentScenario = {
  scenarioId: string         // user-defined (e.g. "FULL_RIG")
  description: string        // display label (e.g. "Full Rig")
  equipmentEntries: EquipmentEntry[]
}

// Hydrated version (selector output)
EquipmentEntryHydrated = EquipmentEntry & {
  appMethod: AppMethod
  waterRate: number          // coverage.volume / coverage.area → units/ksf
}

EquipmentScenarioHydrated = EquipmentScenario & {
  equipmentEntries: EquipmentEntryHydrated[]
}
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

### 4. `ProductMasterDocProps` — add `equipmentScenarios`
```
// BEFORE
ProductMasterDocProps = CreatedUpdated & ProductCommonDocProps & {
  productId: number
  subProductConfigDocs: SubProductConfigDoc[]
}

// AFTER
ProductMasterDocProps = CreatedUpdated & ProductCommonDocProps & {
  productId: number
  equipmentScenarios: EquipmentScenario[]   // NEW
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

### 6. `ProductMasterProps` — add hydrated scenarios
```
// BEFORE
ProductMasterProps = ProductCommonProps & {
  subProductConfigs: SubProductConfig[]
}

// AFTER
ProductMasterProps = ProductCommonProps & {
  subProductConfigs: SubProductConfig[]
  equipmentScenarios: EquipmentScenarioHydrated[]   // NEW
}
```

---

## Mongoose Schema Changes

### `AppMethodModel.ts`
```
+ needsWater: { type: Boolean, required: true, default: true }
```

### `ProductDocPropsModel.ts`
```
// ADD top-level field:
equipmentScenarios: [{
  scenarioId:   String (required)
  description:  String (required)
  equipmentEntries: [{
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

When instantiating water for a specific `EquipmentEntry`, override `productCode` and `description`
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
- New `hydrateEquipmentScenarios(doc, appMethodMap)` helper:
  - Maps each `EquipmentScenario` → `EquipmentScenarioHydrated`
  - For each `EquipmentEntry`: looks up `AppMethod` from `appMethodMap`, calculates `waterRate`
    from `appMethod.coverage.volume / coverage.area` (normalized to ksf)
- `selectProductMasters` adds `equipmentScenarios: hydrateEquipmentScenarios(doc, appMethodMap)`

---

## `hydrateLoadoutInventory` Changes

Currently groups sub-products by `appMethodId` on each sub-config.

**After this change:**
- Reads `master.equipmentScenarios` (already hydrated)
- Filters to the worker's selected scenario (from Redux `scenarioSelections`)
- For each `EquipmentEntry` in the selected scenario:
  - Creates one `appMethods[]` entry in the loadout:
    - `appMethodId` = `entry.equipmentId` (bucket key)
    - `mixProduct` = `{ ...waterProductSub, productCode: entry.equipmentId, description: entry.equipmentId }`
    - `plannedAmount` = `size × entry.waterRate`
    - `subProducts` = sub-products from `entry.mixedProductIds`
- Non-mixed sub-products go to `master.subProducts` as before

---

## Equipment Selection Redux (not persisted)

New state in `loadoutFormSlice`:
```
// Added to LoadoutFormState:
scenarioSelections: {
  masterProductId: number
  selectedScenarioId: string
}[]
```

New actions:
```
setScenarioSelection(masterProductId, scenarioId)
clearScenarioSelections()
```

**Loadout form behavior:**
- For each master with `equipmentScenarios.length > 0`, a scenario selection prompt appears
  before the loadout rows are shown
- If only one scenario exists → auto-selected, no prompt
- Worker picks one scenario (radio button) → loadout populates with correct water rows
- Changing scenario resets that master's `startAmount`/`finishAmount` values

---

## Product Setup UI Changes (`MasterEditPanel` / `MasterSubConfig`)

- Remove per-sub `useAppMethod` checkbox, `appMethodId` dropdown, `mixedProductIds` multi-select
  from `SubProductConfigDoc` editing
- Add new **Equipment Scenarios** accordion section to `MasterEditPanel`:
  - List of scenarios (each showing: `scenarioId`, `description`, list of equipment entries)
  - Add / Edit / Remove scenarios
  - Each scenario editor: scenario ID + description fields, list of equipment entries
  - Each equipment entry editor: `equipmentId`, `description`, AppMethod selector,
    mixed products multi-select (from master's sub-products)
  - `needsWater` is shown on the AppMethod (read-only in this context)

---

## Mix Chart Changes

- Mix chart page gets an **Equipment Scenario** selector per master (radio group)
- Selecting a scenario filters the chart to show only that scenario's equipment entries
- Each `EquipmentEntry` can generate its own chart (separate PDF per entry)
- The pivot column selector (size vs. water vs. any sub-product) remains per chart
- **Bonus:** When a scenario has multiple equipment entries, offer "Generate All Charts"
  to produce one PDF per entry

---

## Migration Strategy

One-time migration (API handler or script) for existing data:

**For each `ProductMasterDoc` with any `subProductConfigDoc` where `useAppMethod === true`:**
1. Find the carrier sub-config (the one with `useAppMethod: true`)
2. Create one `EquipmentScenario`:
   ```
   scenarioId:   existingAppMethodId
   description:  existingAppMethod.description
   equipmentEntries: [{
     equipmentId:     existingAppMethodId
     description:     existingAppMethod.description
     appMethodId:     existingAppMethodId
     mixedProductIds: existingMixedProductIds
   }]
   ```
3. Remove `appMethodId`, `useAppMethod`, `mixedProductIds` from all `subProductConfigDocs`
4. Remove the water sub-product entry from `subProductConfigDocs` (auto-injected going forward)

**For all `AppMethod` documents:** add `needsWater: true`.

---

## Implementation Order

1. `AppMethod` — add `needsWater` (type + model + API + CRUD UI checkbox)
2. New types: `EquipmentEntry`, `EquipmentScenario`, hydrated variants (`ProductMasterTypes.ts`)
3. `ProductDocPropsModel` schema update
4. Migration script / handler
5. `waterProduct.ts` — client-side water constant
6. `productSelectors.ts` — `hydrateEquipmentScenarios`, simplify `hydrateRate`
7. `hydrateLoadoutInventory` — read from `equipmentScenarios`
8. `loadoutFormSlice` — add `scenarioSelections` state + actions
9. `LoadoutForm` / `MasterProductCard` — scenario selection prompt UI
10. `MasterEditPanel` / `MasterSubConfig` — Equipment Scenarios section
11. Mix chart — scenario selector, per-entry chart generation

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
    equipmentId: string      ← RENAMED from appMethodId (bucket key = EquipmentEntry.equipmentId)
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

## Equipment: Entity vs Type

### The Question
Should `Equipment` (the physical machine — Main Tank, Injection Unit) be a **persisted entity**
(its own MongoDB collection, its own Redux slice, its own CRUD UI) rather than just a type
embedded inside `EquipmentScenario`?

### Current Plan (Type Only)
`EquipmentEntry` is defined inline within `EquipmentScenario` on the master product:
```
ProductMasterDoc.equipmentScenarios[].equipmentEntries[]:
  equipmentId: string      ← user-defined string, not a foreign key
  description: string
  appMethodId: string      ← references AppMethod entity
  mixedProductIds: number[]
```
`equipmentId` is just a string label. There is no `Equipment` collection.

### The Case for an Entity

If `Equipment` were a persisted entity:
```
Equipment = {
  equipmentId: string       // natural key (e.g., "MAIN_TANK")
  description: string
  appMethodId: string       // default AppMethod for this machine
  notes: string             // e.g., serial number, purchase date
  // future: purchaseDate, lastServiceDate, estimatedHours, etc.
}
```

Benefits:
- **Reuse across masters** — the same "Main Tank" machine can be referenced by multiple
  master products without duplicating its description and AppMethod
- **Machine-level reporting** — total planned hours/volume across all products that use
  this machine, aggregated at the equipment level
- **Capital budgeting** — track machine age, planned replacement cycles
- **Single source of truth** — changing the AppMethod for "Main Tank" updates all masters
  that reference it, rather than requiring edits to each master's scenario

Tradeoffs:
- Adds a new data module (Contract, Route, Slice, Selectors, Hook, CRUD UI)
- `EquipmentEntry` becomes a foreign key reference (`equipmentId`) rather than an inline
  definition — similar to how `SubProductConfigDoc.appMethodId` references `AppMethod`
- `EquipmentScenario` becomes a list of `equipmentId` references + per-scenario overrides
  (e.g., which products are mixed in this scenario's use of that machine)

### Proposed Entity Model (if we go this route)

```
// Persisted entity
Equipment = {
  equipmentId: string        // natural key
  description: string
  defaultAppMethodId: string // default AppMethod for this machine
}

// EquipmentEntry becomes a scenario-specific override
EquipmentEntry = {
  equipmentId: string        // references Equipment entity
  appMethodId: string        // can override Equipment.defaultAppMethodId per scenario
  mixedProductIds: number[]  // which products are mixed in this scenario
}
```

The `LoadoutBase.equipmentEntries[]` shape is unchanged — it still carries the hydrated
`AppMethod` and `mixProduct`. The difference is that `equipmentId` is now a foreign key
to a real `Equipment` document rather than a free-form string.

### Recommendation

**Introduce `Equipment` as a persisted entity.** The reasoning mirrors why `AppMethod` is
an entity rather than an inline type:
- Multiple masters can share the same machine
- Machine-level metrics (hours, volume) are a natural future requirement
- The CRUD UI is simple (just ID + description + default AppMethod selector)
- The data module pattern makes this straightforward to add

**However**, the `EquipmentEntry` within a scenario still needs its own `appMethodId` override
field, because different scenarios may use the same machine with different AppMethods (e.g.,
Main Tank at full flow vs. reduced flow). The `Equipment.defaultAppMethodId` is just the
starting point.

**Migration:** Existing `EquipmentEntry` strings (created during the equipment plan migration)
become `Equipment` documents automatically — `equipmentId` stays the same, `description`
comes from the entry, `defaultAppMethodId` comes from the entry's `appMethodId`.

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
| `AppMethodDeleteSheet.tsx` | `getAffectedProducts` scans `config.appMethodId` on sub-configs — must scan `equipmentScenarios` instead |
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
  scenarioSelections: [{       // NEW — persist the scenario choice (not just Redux)
    masterProductId: number
    selectedScenarioId: string
  }]
  masters: [...]
}
```

**Note:** `scenarioSelections` is also added to `LoadoutDoc` (persisted). Currently the plan
has this as Redux-only. Since the loadout is persisted, the scenario choice should be too —
otherwise reopening a saved loadout loses which scenario the worker selected.

**Config list (now):** `truckIds: string[]` and `rideOnIds: string[]` stored in `globalSettings`
or a new `equipmentConfig` slice. No MongoDB collection needed yet.

**UI:** Worker selects `truckId` and `rideOnId` at the top of `LoadoutForm` before filling
out product amounts. Optional fields — no blocking if not selected.

### `ProductRule` and Equipment Routing

`ProductRule` (`sizeOperator: "lte" | "gt" | "all"`) already determines which master products
apply to a given service size. This is the existing mechanism that routes small lawns to the
backpack sprayer and large lawns to the tank/toro. The `EquipmentScenario` system builds on
top of this — the scenario selected by the worker determines which equipment entries are active
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
    // AppMethod (water) sub-products (mixed products inside each equipment entry)
    ...master.appMethods.flatMap(am =>
      am.subProducts.map(sub => ({
        productId: sub.productId,
        amount: sub.plannedAmount,
        size: master.plannedAmount,
        productCommon: sub.product.productCommon,
      }))
    ),
    // The water rows themselves (tracked for metered water usage reporting)
    ...master.appMethods.map(am => ({
      productId: am.mixProductId,
      amount: am.plannedAmount,
      size: master.plannedAmount,
      productCommon: am.mixProduct.productCommon,
    })),
  ])
}
```

**Note on water in bizPlan:** Water is not currently purchased, but tracking planned water
usage is valuable for future scenarios (metered water at a new location). Including water rows
in `flattenLoadoutPlanned` ensures `bizPlan` inventory selectors capture water usage
automatically once equipment scenarios are configured.

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

`hydrateLoadoutInventory` will use the worker's `scenarioSelections` from Redux to filter
equipment entries in the daily inventory workflow. For `bizPlan` (reporting context, no worker
selection), we want **all** planned products across all scenarios.

**Solution:** `hydrateLoadoutInventory` accepts an optional `scenarioId` parameter.
When `null`/`undefined`, it includes all equipment scenarios (union of all `mixedProductIds`
across all scenarios). This gives `bizPlan` the full planned picture including all water rows.

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
- `hydrateLoadoutInventory` must be updated to read from `equipmentScenarios` (step 7 of
  the equipment plan) before `flattenLoadoutPlanned` can include water rows correctly.
- `bizPlan` selectors can be migrated to `flattenLoadoutPlanned` at any time, even before
  the equipment plan, as long as `loadoutInventory` is already on `Service` (it is).

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
  to normalize to ksf for `waterRate` calculation in `hydrateEquipmentScenarios`
- `LoadoutBase.equipmentEntries[].plannedAmount` is in **app units** (Gal for water)
- The loadout form displays `plannedAmount` to techs in **load units** via `UnitConfigDisplay`
- `startAmount`/`finishAmount` entered by techs are in **load units** and must be converted
  to app units before accuracy inference calculations
- Water's `ProductUnitConfig` (if it has one) defines what "load unit" means for water
  (e.g., "Gallon" with conversionFactor = 1, since water is already measured in gallons)
