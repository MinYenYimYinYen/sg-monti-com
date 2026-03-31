# MixWizard Semantic Refactor

## The Problem

The MixWizard currently works around a semantic mismatch in the data model rather than fixing it at the source. This document describes the mismatch, the workaround, and the proper fix.

---

## Background: How the "Water" Product Works

When an `AppMethod` has `needsWater: true`, `hydratePlannedLoadout` synthesizes a "water" carrier row using the `waterProduct` sentinel (`WATER_PRODUCT_ID = -2`). This row is stored as `plannedEquipment.mixProduct` and its `plannedAmount` is computed from the AppMethod's coverage rate:

```
plannedAmount = (coverage.volume / coverage.area) × size
```

The AppMethod solver bakes the `overlap` factor into `coverage.volume` when it solves for coverage. For example, with overlap=2 and a single-pass rate of 1.5 Fl Oz/ksf, the solver produces `coverage.volume = 3 Fl Oz / 1 ksf`. So for 99 ksf:

```
plannedAmount = 3 Fl Oz/ksf × 99 ksf = 297 Fl Oz
```

**This 297 Fl Oz is the total mixed solution dispensed by the nozzle — water AND chemicals combined.** It is not pure water.

---

## Background: How Sub-Product Amounts Work

Each liquid sub-product (e.g., Three-Way herbicide) has a `storedRate` (`config.rate`) in `SubProductConfigDoc`. This is the **label rate** — the amount of chemical per ksf for a single pass. In `hydratePlannedLoadout`:

```typescript
plannedAmount = size * config.rate * equipment.appMethod.overlap
```

For Three-Way at 1.5 Fl Oz/ksf, overlap=2, 99 ksf:

```
plannedAmount = 99 × 1.5 × 2 = 297 Fl Oz
```

This is the **total chemical applied over the whole job across all passes**. It is correct for the loadout form (how much Three-Way to load on the truck).

---

## The Semantic Mismatch

| Field | Named | Actually Represents |
|---|---|---|
| `plannedEquipment.mixProduct` | "Water" | Total mixed solution (water + chemicals) |
| `plannedEquipment.plannedAmount` | Water volume | Total mix volume (overlap-adjusted) |
| `sub.plannedAmount` | Chemical volume | Total chemical applied (overlap-adjusted) |

For a 1:1 mix ratio (equal parts water and chemical), both `plannedEquipment.plannedAmount` and `sub.plannedAmount` equal 297 Fl Oz. The chemical appears to be 100% of the mix, leaving 0 Fl Oz for water.

The MixWizard needs to know the chemical's **fraction of the total mix per tank fill**, not the total chemical applied over the whole job.

---

## The Workaround (Current State)

`MixWizard.tsx` divides `sub.plannedAmount` by `overlap` before using it in the mix ratio calculation:

```typescript
// plannedLiquidSubGallons
sub.plannedAmount / plannedEquipment.appMethod.overlap

// neededAmount display
ratio * sub.plannedAmount / plannedEquipment.appMethod.overlap
```

This cancels the overlap factor out of the sub-product amount, giving the chemical's actual per-ksf contribution to the mix. For Three-Way: `297 / 2 = 148.5 Fl Oz` for 99 ksf, which is the correct chemical volume in the tank.

This workaround is **correct but fragile** — it relies on knowing that `sub.plannedAmount` was multiplied by overlap, which is an implementation detail of `hydratePlannedLoadout`.

---

## The Proper Fix

The semantic problem should be resolved at the data model level. The `mixProduct` / "water" row should be renamed and its meaning clarified, and the sub-product planned amounts should be split into two distinct values:

### Option A: Add a `plannedAmountPerKsf` field to sub-products

Add a `plannedAmountPerKsf` (or `effectiveRate`) field to the sub-product entry in `LoadoutBase`:

```typescript
type LoadoutSubProduct = {
  productId: number;
  product: ProductSub;
  plannedAmount: number;        // Total for the job (overlap-adjusted) — for loadout form
  plannedAmountPerKsf: number;  // Per-ksf rate (config.rate, no overlap) — for mix ratio
};
```

The MixWizard would use `plannedAmountPerKsf × totalKsfForMaster` instead of `plannedAmount / overlap`.

### Option B: Rename `mixProduct` to `carrierProduct` and clarify semantics

Rename `plannedEquipment.mixProduct` to `plannedEquipment.carrierProduct` and document that `plannedAmount` is the **total solution volume** (not pure water). This makes the semantic clear at the type level and prevents future confusion.

### Option C: Separate water volume from total mix volume

Compute and store the pure water volume separately:

```typescript
type LoadoutEquipment = {
  // ...
  plannedAmount: number;       // Total mix volume (water + chemicals)
  plannedWaterAmount: number;  // Pure water volume = plannedAmount - sum(sub.plannedAmount / overlap)
};
```

---

## Recommendation

**Option A** is the most surgical fix. It adds a single field to the sub-product entry that makes the per-ksf rate explicit, eliminating the need for the MixWizard to know about the overlap factor. It also makes the data more useful for any future feature that needs the per-ksf rate (e.g., a "how much product do I need for X ksf?" calculator).

**Option B** should be done regardless — renaming `mixProduct` to `carrierProduct` is a low-risk rename that eliminates the misleading "water" identity and makes the code self-documenting.

---

## Files Affected by a Proper Refactor

| File | Change |
|---|---|
| `_lib/LoadoutTypes.ts` | Add `plannedAmountPerKsf` to sub-product type; rename `mixProduct` → `carrierProduct` |
| `_lib/hydratePlannedLoadout.ts` | Populate `plannedAmountPerKsf = size * config.rate` (no overlap) |
| `components/mixWizard/MixWizard.tsx` | Use `sub.plannedAmountPerKsf` instead of `sub.plannedAmount / overlap` |
| `loadoutStart/components/EquipmentSection.tsx` | Update `mixProduct` → `carrierProduct` references |
| Any other consumers of `LoadoutBase` | Update `mixProduct` → `carrierProduct` references |
