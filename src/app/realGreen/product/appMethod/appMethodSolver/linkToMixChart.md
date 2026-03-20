# Dependency Path: MixChart PDF Values to Rate Property

## Overview
This document traces the complete dependency path from the values displayed in each row of the MixChart PDF back to the `rate` property that drives the calculations. This analysis connects the MixChart feature to the AppMethod system.

---

## Data Flow: PDF Rendering → Rate Property

### 1. **PDF Rendering Layer**
**Files:**
- `src/app/realGreen/product/mixChart/chartLayouts/mixChartBySize.tsx`
- `src/app/realGreen/product/mixChart/chartLayouts/mixChartByProductAmount.tsx`

#### Chart by Size (mixChartBySize.tsx)
- **Displayed Data:** Each row shows `row.amounts` for each sub-product
- **Header Display:** Shows rate in format `({config.rate}{unitLabel}/1000)` (line 46)
- **Row Display:** Shows formatted compound unit amounts (lines 74-86)

#### Chart by Product Amount (mixChartByProductAmount.tsx)
- **Displayed Data:** Shows selected product amount, size covered, and other product amounts
- **Header Display:** Shows rate in format `({config.rate}{unitLabel}/1000)` (line 66)
- **Row Display:** Shows calculated amounts based on size covered (lines 125-147)

---

### 2. **Data Generation Layer**
**File:** `src/app/realGreen/product/mixChart/_lib/mixChartUtils.ts`

#### Core Calculation Functions

**`calculateAmountNeeded({size, rate})`** (lines 16-20)
```typescript
return size * rate;
```
This is the fundamental calculation that converts size to product amount using the rate.

**`calculateSizeCovered({appAmount, rate})`** (lines 25-29)
```typescript
return appAmount / rate;
```
Inverse calculation: given product amount and rate, calculates the size covered.

#### generateMixChartData (Chart by Size)
**Lines 31-55**
- For each size increment, iterates through all `master.subProductConfigs`
- Calls `calculateAmountNeeded({size, rate: config.rate})` (lines 44-47)
- **Key:** Uses `config.rate` directly from SubProductConfig
- Formats result using `config.subProduct.unitConfigDisplay.format()`

#### generateMixChartByProductAmount (Chart by Product Amount)
**Lines 64-115**
- Selected product's amount is converted to app units (line 86)
- Calculates `sizeCovered` using `calculateSizeCovered({appAmount, rate: selectedConfig.rate})` (lines 89-92)
- For other products, calculates amounts using `calculateAmountNeeded({size: sizeCovered, rate: config.rate})` (lines 98-101)
- **Key:** Uses `selectedConfig.rate` and `config.rate` for all calculations

---

### 3. **Data Structure Layer**
**File:** `src/app/realGreen/product/_lib/types/ProductMasterTypes.ts`

#### SubProductConfig Type (lines 28-32)
```typescript
export type SubProductConfig = {
  subId: number;
  subProduct: ProductSub;
  rate: number;  // ← THE RATE PROPERTY
};
```

#### SubProductConfigDoc Type (lines 23-26)
```typescript
export type SubProductConfigDoc = {
  subId: number;
  rate: number;  // ← Persisted to MongoDB
};
```

#### ProductMaster Type (lines 49)
```typescript
export type ProductMaster = ProductMasterDoc & ProductMasterProps;
```
- Contains `subProductConfigs: SubProductConfig[]` (line 44)
- Each config includes the `rate` property

---

### 4. **UI Layer (Page Component)**
**File:** `src/app/realGreen/product/mixChart/page.tsx`

#### Data Flow
1. Loads product masters from Redux: `useSelector(productSelect.productMasters)` (line 31)
2. User selects a master product → `selectedMaster`
3. Passes master to generation functions:
   - `generateMixChartData(selectedMaster, ...)` (line 54)
   - `generateMixChartByProductAmount(selectedMaster, selectedSubId, ...)` (line 59)
4. Generated data passed to PDF components (lines 172-181)

---

## Complete Dependency Chain

```
PDF Display (row.amounts[i].parts[j].amount)
    ↓
MixChartRow.amounts (CompoundUnitDisplay[])
    ↓
generateMixChartData() / generateMixChartByProductAmount()
    ↓
calculateAmountNeeded({size, rate: config.rate})
    ↓
SubProductConfig.rate
    ↓
ProductMaster.subProductConfigs[i].rate
    ↓
MongoDB: subProductConfigDocs[i].rate
```

---

## Connection to AppMethod

### Current State
**File:** `src/app/realGreen/product/_lib/types/ProductMasterTypes.ts`

```typescript
export type ProductMasterProps = ProductCommonProps & {
  subProductConfigs: SubProductConfig[];
  appMethod: AppMethod | null;  // ← Connection exists but unused
};
```

### AppMethod Structure
**File:** `src/app/realGreen/product/appMethod/AppMethodTypes.ts`

```typescript
export type AppMethod = AppMethodResult & {
  appMethodId: string;
  description: string;
};
```

`AppMethodResult` contains:
- `coverage: { volume: number, volumeUnit: string, area: number, areaUnit: string }`
- The coverage defines the rate relationship: `volume/area` ratio

### Key Insight: Rate Calculation from AppMethod

**The `rate` property in SubProductConfig should be derivable from AppMethod.coverage:**

```typescript
// Conceptual calculation:
rate = appMethod.coverage.volume / appMethod.coverage.area

// For standard format (X units per 1000 sq ft):
ratePerThousand = (appMethod.coverage.volume / appMethod.coverage.area) * 1000
```

Where:
- `appMethod.coverage.volume` = amount of product needed
- `appMethod.coverage.area` = area covered by that amount
- Result expresses product units per unit area

### Future Integration Path

**Potential enhancement:** When an AppMethod is assigned to a ProductMaster, the system could:

1. Calculate the base rate from `AppMethod.coverage`
2. Store or compute `SubProductConfig.rate` values
3. Update MixChart calculations automatically when AppMethod changes
4. Validate that manually-entered rates match AppMethod-derived rates

This would create a single source of truth for application rates, linking the AppMethodSolver calculations directly to the MixChart display values.

---

## Unit Context and Conversions

**File:** `src/app/realGreen/product/unitConfig/ProductUnitConfigTypes.ts`

### UnitContext Types
- `"app"` - Application context (base units for calculation)
- `"load"` - Loading context (e.g., "50lb Bag")
- `"purchase"` - Purchasing context (e.g., "Pallet")

### Rate Calculation Context
The `rate` in `SubProductConfig` is expressed in **application units** (app context).

When displaying in MixChart:
- Rate is shown as `{rate}{unitLabel}/1000`
- The unitLabel comes from `subProduct.unitConfig.conversions.app.unitLabel`
- Display values can be converted to load/purchase contexts using `conversionFactor`

Example from mixChartUtils.ts (line 86-92):
```typescript
const appAmount = amount * conversion.conversionFactor;
const sizeCovered = calculateSizeCovered({
  appAmount,
  rate: selectedConfig.rate,
});
```

---

## Summary

**The Rate Property Flow:**
1. **Storage:** `rate` is persisted in `SubProductConfigDoc` (MongoDB)
2. **Structure:** Hydrated into `SubProductConfig.rate` in ProductMaster
3. **Calculation:** Used by `calculateAmountNeeded(size, rate)` and `calculateSizeCovered(appAmount, rate)`
4. **Display:** Shown in PDF headers and used to compute all row values

**Critical Formula:**
```
amount = size × rate
```

This simple multiplication, driven by the `rate` property from each SubProductConfig, is the foundation of all MixChart calculations. The rate represents "product units per unit area" and is currently stored independently but could be derived from AppMethod coverage data in future enhancements.
