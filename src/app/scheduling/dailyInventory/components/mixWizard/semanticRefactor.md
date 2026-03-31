# MixWizard Semantic Refactor

## Status: ✅ COMPLETE

All steps have been implemented and TypeScript compiles clean.

---

## The Problem (Resolved)

The MixWizard was working around a semantic mismatch in the data model rather than fixing it at the source. The mismatch was:

| Field | Named | Actually Represents |
|---|---|---|
| `plannedEquipment.mixProduct` | "Water" | Total mixed solution (water + chemicals) |
| `plannedEquipment.plannedAmount` | Water volume | Total mix volume (overlap-adjusted) |
| `sub.plannedAmount` | Chemical volume | Total chemical applied (overlap-adjusted) |

For a 1:1 mix ratio, both `plannedEquipment.plannedAmount` and `sub.plannedAmount` equaled the same value. The chemical appeared to be 100% of the mix, leaving 0 for water.

---

## Background: How the "Water" Product Works

When an `AppMethod` has `needsWater: true`, `hydratePlannedLoadout` synthesizes a "water" carrier row using the `waterProduct` sentinel (`WATER_PRODUCT_ID = -2`). Its `plannedAmount` is computed from the AppMethod's coverage rate:

```
plannedAmount = (coverage.volume / coverage.area) × size
```

The AppMethod solver bakes the `overlap` factor into `coverage.volume`. So for overlap=2 and a single-pass rate of 1.5 Fl Oz/ksf, the solver produces `coverage.volume = 3 Fl Oz / 1 ksf`. For 99 ksf:

```
plannedAmount = 3 Fl Oz/ksf × 99 ksf = 297 Fl Oz
```

**This 297 Fl Oz is the total mixed solution dispensed by the nozzle — water AND chemicals combined.**

---

## Background: How Sub-Product Amounts Work

Each liquid sub-product has a `storedRate` (`config.rate`) — the **label rate** per ksf for a single pass. In `hydratePlannedLoadout`:

```typescript
plannedAmount = size * config.rate * equipment.appMethod.overlap
```

For Three-Way at 1.5 Fl Oz/ksf, overlap=2, 99 ksf:

```
plannedAmount = 99 × 1.5 × 2 = 297 Fl Oz
```

This is the **total chemical applied over the whole job across all passes** — correct for the loadout form (how much to load on the truck).

---

## Terminology

- **Mixture**: The total solution dispensed by the equipment (water + all solutes).
- **Carrier**: The water constituent — the solvent that carries the solutes.
- **Solute**: A non-water constituent mixed into the carrier (e.g., Three-Way herbicide).
- **Constituent**: Any product that makes up part of the mixture.

---

## What Was Done

### Step 1 — `LoadoutTypes.ts` ✅
- Added `ratePerKsf: number` to the equipment sub-product inline type in `LoadoutBase`.
- Added `appMethodId: string` to the equipment entry in `LoadoutDoc`.
- Renamed `mixProduct` / `mixProductId` / `mixProductUnitId` / `mixProductUnit` → `carrierProduct` / `carrierProductId` / `carrierProductUnitId` / `carrierProductUnit` in both `LoadoutBase` and `LoadoutDoc`.

### Step 2 — `hydratePlannedLoadout.ts` ✅
- Populated `ratePerKsf: config.rate` (no overlap) on each equipment sub-product entry.
- Renamed local variable `mixProduct` → `carrierProduct` in the equipment entry construction.
- Updated all references to use `carrierProduct.*` instead of `mixProduct.*`.

### Step 3 — `aggregateLoadoutInventory.ts` ✅
- Passed `ratePerKsf` through the aggregation (constant per product — taken from `first.ratePerKsf`).
- Renamed `mixProduct` → `carrierProduct` references.

### Step 4 — `rehydrateLoadout.ts` ✅
- Resolves `appMethod` from the stored `appMethodId` (using the appMethod map) rather than always defaulting to `equipment.defaultAppMethodId`.

### Step 5 — `Mixture.ts` ✅
- Implemented the `Mixture` class and `MixtureConstituent` type.
- Located at `src/app/scheduling/dailyInventory/_lib/Mixture.ts`.
- Provides: `totalRatePerKsf`, `carrierRatePerKsf`, `soluteTotalRatePerKsf`, `totalVolumeForKsf(ksf)`, `carrierForVolume(vol)`, `solutesForVolume(vol)`.

### Step 6 — `MixWizard.tsx` ✅
- Replaced the `/ overlap` workaround with proper `Mixture`-based calculations.
- Uses `mixture.totalVolumeForKsf` for `totalPlannedGallons`.
- Uses `mixture.carrierForVolume` for the water display.
- Uses `mixture.solutesForVolume` for the solute display rows.
- Renamed all `mixProduct` → `carrierProduct` references.

### Step 7 — All `mixProduct` consumers ✅
- `loadoutStart/components/EquipmentSection.tsx` — renamed `mixProductAmountDisplay` → `carrierProductAmountDisplay`, updated all `mixProduct` → `carrierProduct` references.
- `loadoutStart/loadoutStartSlice.ts` — `LoadoutDoc` construction already uses `carrierProductId` (no `mixProduct` references existed).
- `realGreen/customer/selectors/loadoutBaseToAppProductCore.ts` — renamed `equipment.mixProductId` → `equipment.carrierProductId`.
- TypeScript compiles clean (exit code 0).

---

## Result

Values shown on the loadout form and in the Mix Wizard are now correct. The data model accurately reflects reality:

- `equipment.carrierProduct` — the water carrier (unit config, display formatting)
- `equipment.plannedAmount` — total mix volume for the job (carrier + solutes, overlap-adjusted)
- `equipment.subProducts[].plannedAmount` — total chemical for the job (overlap-adjusted, for loadout form display)
- `equipment.subProducts[].ratePerKsf` — label rate (single-pass, no overlap, for `Mixture` construction)
- `equipment.appMethod` — the calibration used, with overlap baked into coverage

---

## Future Considerations

### `AppMethod` → `Calibration`
The name `AppMethod` (Application Method) was chosen with equipment in mind, but the entity is really a calibration record. `Calibration` is a more precise name. This is a large rename with no semantic impact and should be deferred to a dedicated refactor pass.

### `Mixture` in Other Workflows
The `Mixture` class is designed to be reusable. Potential future consumers:
- **Loadout Finish form**: Back-calculate how much of each solute was used based on finish amounts.
- **Forecasting / BizPlan**: Estimate product consumption for a season.
- **Cover sheets**: Display mix instructions for the tech.

### Granular Products as Mixtures
A granular product with no water and no solutes can be modeled as a `Mixture` with an empty `solutes` array and `needsWater: false`. The `Mixture` class handles this gracefully — `carrierForVolume` returns the full volume, `solutesForVolume` returns an empty array. This unifies the data model across all product types.
