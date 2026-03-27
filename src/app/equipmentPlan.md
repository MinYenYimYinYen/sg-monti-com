# Equipment Plan — Multi-AppMethod Support

## Background

The requirement is to support multiple pieces of equipment running simultaneously on the same
job (e.g., Main Tank + Injection Unit), each with its own water rate and its own set of mixed
products. Workers choose a pre-defined **package** (complete truck configuration) at the start
of their day.

---

## Core Concepts

### `Equipment`
One piece of physical equipment (e.g., Main Tank, Injection Unit). A persisted entity with its
own MongoDB collection. Holds machine-level metadata: its default AppMethod (water rate) and
machine-level default mixed products. Machine metadata is maintained here and referenced by FK.

### `EquipmentPackage`
A complete, pre-defined truck configuration. A persisted entity with its own MongoDB collection.
References `Equipment` items by FK (`equipmentIds: string[]`). Workers pick exactly one package
per master product per day (radio select).

### `SubProductConfigDoc.mixedByEquipmentId`
The field that answers "which equipment mixes this sub-product?" Lives on each sub-product
config on the master product. `null` = standalone (not mixed into any equipment's water).
`"MAIN_TANK"` = mixed into that machine's water for this master.

This is the key design decision: mixed product assignment is **per-master-product**, not
per-package or per-machine globally. The same machine can mix different products for
Round 1 vs. Round 2 because each master product has its own `subProductConfigDocs`.

**Example:**
```
ProductMaster "Round 1":
  subProductConfigDocs:
    { subId: 342, storedRate: 1.087, mixedByEquipmentId: "MAIN_TANK" }
    { subId: 468, storedRate: 0.35,  mixedByEquipmentId: "MAIN_TANK" }
    { subId: 51,  storedRate: 1.3,   mixedByEquipmentId: null }  // standalone

ProductMaster "Round 2":
  subProductConfigDocs:
    { subId: 76,  storedRate: 0.4,   mixedByEquipmentId: "MAIN_TANK" }
    { subId: 343, storedRate: 0.3,   mixedByEquipmentId: null }  // standalone
```

---

## Type Definitions (Current State)

### `AppMethod` ✅ Implemented
```typescript
AppMethod = AppMethodResult & {
  appMethodId: string
  description: string
  needsWater: boolean        // auto-instantiate water carrier row
  tracksTankLevel: boolean   // true = tank (start/finish); false = multi-fill (backpack)
}
```

### `EquipmentDoc` / `Equipment` ✅ Implemented
```typescript
EquipmentDoc = {
  equipmentId: string        // natural key (e.g. "MAIN_TANK")
  description: string
  defaultAppMethodId: string // default AppMethod for this machine
  appMethodIds: string[]     // whitelist of compatible AppMethods
  mixedProductIds: number[]  // machine-level default mixed products (used as UI default)
}

EquipmentProps = {
  appMethod: AppMethod       // hydrated from defaultAppMethodId
}

Equipment = EquipmentDoc & EquipmentProps
```

### `EquipmentPackageDoc` / `EquipmentPackage` ✅ Implemented
```typescript
EquipmentPackageDoc = {
  packageId: string          // natural key (e.g. "FULL_RIG")
  description: string
  equipmentIds: string[]     // FK references to Equipment entities
}

EquipmentPackageProps = {
  equipments: Equipment[]    // hydrated
}

EquipmentPackage = EquipmentPackageDoc & EquipmentPackageProps
```

### `SubProductConfigDoc` ✅ Implemented (schema) / 🔲 TODO (mixedByEquipmentId field)
```typescript
// Current (implemented):
SubProductConfigDoc = {
  subId: number
  storedRate: number
}

// Target (TODO — add mixedByEquipmentId):
SubProductConfigDoc = {
  subId: number
  storedRate: number
  mixedByEquipmentId: string | null   // null = standalone; equipmentId = mixed into that machine
}
```

### `ProductMasterDocProps` ✅ Implemented
```typescript
ProductMasterDocProps = CreatedUpdated & ProductCommonDocProps & {
  productId: number
  subProductConfigDocs: SubProductConfigDoc[]
  equipmentPackageIds: string[]   // FK references to EquipmentPackage entities
}
```

### `ProductMasterProps` ✅ Implemented
```typescript
ProductMasterProps = ProductCommonProps & {
  subProductConfigs: SubProductConfig[]
  equipmentPackages: EquipmentPackage[]   // hydrated
}
```

### `SubProductConfig` ✅ Implemented (schema) / 🔲 TODO (mixedByEquipmentId)
```typescript
// Current (implemented):
SubProductConfig = SubProductConfigDoc & {
  subProduct: ProductSub
  rate: number
}

// Target (TODO — after SubProductConfigDoc gets mixedByEquipmentId):
SubProductConfig = SubProductConfigDoc & {
  subProduct: ProductSub
  rate: number
  mixedByEquipmentId: string | null
}
```

---

## Mongoose Schema Changes

### `AppMethodModel.ts` ✅ Implemented
```
+ needsWater: { type: Boolean, required: true, default: true }
+ tracksTankLevel: { type: Boolean, required: true, default: true }
```

### `EquipmentModel.ts` ✅ Implemented
```
equipmentId:         String (required, unique)
description:         String (required)
defaultAppMethodId:  String (required)
appMethodIds:        [String] (default: [])
mixedProductIds:     [Number] (default: [])
```

### `EquipmentPackageModel.ts` ✅ Implemented
```
packageId:    String (required, unique)
description:  String (required)
equipmentIds: [String] (default: [])
```

### `ProductDocPropsModel.ts` ✅ Implemented (base) / 🔲 TODO (mixedByEquipmentId on sub-schema)
```
productId:            Number (required, unique)
subProductConfigDocs: [SubProductConfigDocSchema]
  subId:              Number (required)
  storedRate:         Number (required, default: 0)
  // TODO: add mixedByEquipmentId: { type: String, default: null }
equipmentPackageIds:  [String] (default: [])
appMethodId:          String (default: null)   // for ProductSubDocProps
```

---

## Water as a Client-Side Constant ✅ Implemented

Water is a client-side constant in `src/app/equipment/waterProduct.ts`.
When instantiating water for a specific `Equipment` entry, override `productCode` and
`description` with `equipmentId`. `productId` stays as `WATER_PRODUCT_ID` (-2).

---

## Selector / Hydration Logic

### `hydrateRate` ✅ Implemented
Simplified — returns `storedRate` only (no AppMethod lookup).

### `hydrateEquipmentPackages` in `productSelectors.ts` ✅ Implemented
Looks up each `equipmentId` FK → `Equipment` entity → hydrates `appMethod`.

### `hydrateLoadoutInventory` ✅ Implemented (current logic) / 🔲 TODO (mixedByEquipmentId)

**Current behavior:** Uses `Equipment.mixedProductIds` (machine-level default) to determine
which sub-products go into each equipment entry's water.

**Target behavior (after `mixedByEquipmentId` is added):** Uses
`subProductConfigDoc.mixedByEquipmentId` to determine which sub-products go into each
equipment entry's water. This allows Round 1 and Round 2 to assign different sub-products
to the same machine.

```typescript
// Current (uses Equipment.mixedProductIds):
const claimedProductIds = new Set<number>(
  selectedPackage.equipments.flatMap((e: Equipment) => e.mixedProductIds),
);

// Target (uses subProductConfigDoc.mixedByEquipmentId):
const entrySubProducts = master.subProductConfigs
  .filter((config) => config.mixedByEquipmentId === entry.equipmentId)
  .map((config) => ({ ... }));

const nonClaimedSubProducts = master.subProductConfigs
  .filter((config) => config.mixedByEquipmentId === null)
  .map((config) => ({ ... }));
```

---

## LoadoutBase / LoadoutDoc ✅ Implemented
- `appMethods[]` renamed to `equipmentEntries[]`
- `appMethodId` renamed to `equipmentId` (bucket key)
- `aggregateLoadoutInventory` groups by `equipmentId`
- `LoadoutDocModel` schema updated: `appMethods` → `equipmentEntries`, `appMethodId` → `equipmentId`, `truckId`/`rideOnId` added

---

## Redux State ✅ Implemented
- `loadoutFormSlice.packageSelections` — worker's package choice per master
- `setPackageSelection` / `clearPackageSelections` actions
- `loadoutFormSelect.packageSelections` selector

---

## LoadoutValidator ✅ Implemented
- `equipmentEntries` path (renamed from `appMethods`)
- `tracksTankLevel` guard on `startAmount`/`finishAmount` validators

---

## loadoutFormHelpers ✅ Implemented
- `initializeLoadout` maps `equipmentEntries`

---

## Loadout Form UI ✅ Implemented
- `MasterProductCard` renders `AppMethodSection` per `entry.equipmentId`
- `AppMethodSection` uses `equipmentId` prop (was `appMethodId`)

---

## Product Setup UI ✅ Implemented (removal) / 🔲 TODO (Equipment Packages section)
- `MasterSubConfig` — removed `useAppMethod`, `appMethodId`, `mixedProductIds` props ✅
- `MasterEditPanel` — removed old AppMethod handlers ✅
- Equipment Packages accordion section in `MasterEditPanel` — 🔲 TODO

---

## AppMethod CRUD ✅ Implemented (model/types) / 🔲 TODO (UI checkboxes)
- `needsWater` and `tracksTankLevel` in types and model ✅
- CRUD UI checkboxes in `AppMethodCreate.tsx` — 🔲 TODO

---

## getAffectedProducts ✅ Implemented
Scans `equipmentPackageDocs[].equipmentDocs[].appMethodId` (now via `equipmentPackageIds` FK path).

---

## Data Migration ✅ Completed
- Sub-product data restored from backup (water sub-configs stripped, rates preserved)
- `equipmentPackageIds: []` initialized on all docs
- `needsWater`/`tracksTankLevel` backfilled on AppMethod docs
- `equipmentScenarioDocs` stale field removed

---

## Equipment + EquipmentPackage Data Modules ✅ Implemented
Both have full Data Module implementations (Contract, Route, Slice, Selectors, Hook, CRUD UI).

---

## Implementation Status & Next Steps

### ✅ Completed

| Area | Status |
|---|---|
| `AppMethod` — `needsWater` + `tracksTankLevel` types + model | ✅ Done |
| `Equipment` types + model + full Data Module | ✅ Done |
| `EquipmentPackage` types + model + full Data Module | ✅ Done |
| `SubProductConfigDoc` — old fields removed | ✅ Done |
| `ProductMasterDocProps` — `equipmentPackageIds` added | ✅ Done |
| `ProductDocPropsModel` — corrected schema, stale fields removed | ✅ Done |
| `waterProduct` client-side constant | ✅ Done |
| `hydrateRate` simplified | ✅ Done |
| `hydrateEquipmentPackages` in `productSelectors.ts` | ✅ Done |
| `hydrateLoadoutInventory` — reads `equipmentPackages`, uses `packageSelections` | ✅ Done |
| `LoadoutBase` / `LoadoutDoc` — `equipmentEntries` rename | ✅ Done |
| `aggregateLoadoutInventory` — groups by `equipmentId` | ✅ Done |
| `loadoutFormSlice` — `packageSelections` state + actions | ✅ Done |
| `LoadoutValidator` — `equipmentEntries` + `tracksTankLevel` guard | ✅ Done |
| `loadoutFormHelpers.initializeLoadout` | ✅ Done |
| `MasterProductCard` / `AppMethodSection` — `equipmentId` prop | ✅ Done |
| `MasterSubConfig` / `MasterEditPanel` — old AppMethod props removed | ✅ Done |
| `getAffectedProducts` — scans equipment packages | ✅ Done |
| Data migration — sub-product restore, `equipmentPackageIds` init | ✅ Done |

---

### 🔲 Next Steps (Priority Order)

#### 1. `SubProductConfigDoc.mixedByEquipmentId` (Unblocks correct loadout behavior)

Add `mixedByEquipmentId: string | null` to `SubProductConfigDoc` type and
`ProductDocPropsModel` schema. Update `hydrateLoadoutInventory` to use this field instead
of `Equipment.mixedProductIds`.

**Files:**
- `ProductMasterTypes.ts` — add field to `SubProductConfigDoc`
- `ProductDocPropsModel.ts` — add to `SubProductConfigDocSchema`
- `hydrateLoadoutInventory.ts` — use `config.mixedByEquipmentId` instead of `entry.mixedProductIds`
- `MasterSubConfig.tsx` / `MasterEditPanel.tsx` — UI to set `mixedByEquipmentId` per sub-product

#### 2. Package Selection UI (Unblocks runtime testing)

`PackageSelector` component inside `MasterProductCard`:
- `equipmentPackages.length === 0` → show nothing
- `equipmentPackages.length === 1` → auto-select on mount
- `equipmentPackages.length > 1` → radio group

Add `resetMasterLoadoutAmounts(masterProductId)` action to `loadoutFormSlice` for when
worker changes package selection.

#### 3. Equipment Packages CRUD in `MasterEditPanel`

New accordion section "Equipment Packages" for admins to assign `equipmentPackageIds` to
a master product and set `mixedByEquipmentId` per sub-product.

#### 4. `AppMethod` CRUD — `needsWater` + `tracksTankLevel` Checkboxes

Add checkboxes to `AppMethodCreate.tsx` form.

#### 5. `waterProduct` — `unitConfigDisplay` verification

`AppMethodSection.tsx` calls `plannedEntry.mixProduct.unitConfigDisplay.format(...)`.
Verify `waterProduct` has a valid `unitConfigDisplay` (Gal, conversionFactor = 1).

#### 6. `LoadoutDoc` Persistence — `packageSelections`, `truckId`, `rideOnId`

```typescript
// Add to LoadoutDoc:
packageSelections: { masterProductId: number; selectedPackageId: string; }[];
truckId: string | null;
rideOnId: string | null;
```

#### 7. `AppMethodDeleteSheet` ✅ Done

Delete is blocked if any equipment uses this method as its default (admin must reassign
or delete that equipment first). Non-blocking: method is removed from `appMethodIds` on
equipment automatically via `clearReferences`. Affected products are shown for awareness
only — no reassignment UI needed since `appMethodId` on sub-configs is no longer used.

#### 8. Mix Chart — Package Selector + Per-Equipment Charts

- Package selector per master (radio group)
- Per-equipment chart generation
- "Generate All Charts" for multi-equipment packages

---

## Truck & Ride-On Tracking

### `tracksTankLevel` on `AppMethod` ✅ Implemented

- `true` — filled once/day (Main Tank, Injection Unit, Toro). Worker enters start/finish.
- `false` — filled multiple times (Backpack, Push Spreader). Start/finish hidden in UI.

### `LoadoutDoc` fields — 🔲 TODO

```typescript
LoadoutDoc = {
  employeeId: string
  routeDate: string
  truckId: string | null       // TODO
  rideOnId: string | null      // TODO
  packageSelections: [...]     // TODO
  masters: [...]
}
```

Config lists (`truckIds`, `rideOnIds`) stored in `globalSettings`. No MongoDB collection yet.

---

## Unit System Reference

### Three Unit Contexts
- `app` — internal standard unit (Lbs, Fl Oz, Gal)
- `load` — what the tech physically handles (50lb Bag, 2.5 Gal Jug)
- `purchase` — what the business buys (Pallet)

### Two Conversion Tools
- **`UnitUtils`** — static, single-step standard unit conversions. Use for display formatting,
  rate normalization, selector calculations.
- **`UnitMath`** — dimensional analysis engine for multi-step physics calculations. Use for
  `AppMethodSolver` rate calculations.

### `UnitConfigDisplay`
Formats app-unit quantities into compound human-readable strings using a waterfall of contexts.
Used in loadout form and bizPlan to show techs quantities in load units.

### Relevance to Equipment Plan
- `AppMethod.coverage` stores volume/area in standard units — use `UnitUtils` to normalize
  to ksf for `waterRate` calculation in `hydrateEquipmentPackages`
- `LoadoutBase.equipmentEntries[].plannedAmount` is in app units (Gal for water)
- `startAmount`/`finishAmount` entered by techs are in load units — convert to app units
  before accuracy inference calculations
- Water's `unitConfig` should have `conversions.load.unitLabel = "Gal"`, `conversionFactor = 1`
