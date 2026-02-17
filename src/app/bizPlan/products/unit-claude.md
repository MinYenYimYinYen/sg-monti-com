# Multi-Context Unit Type System - Implementation Notes

## Overview
Enhanced the product inventory system to support multiple unit contexts beyond just application rates. Field technicians, shop managers, and office staff now see products in units relevant to their workflows.

## Problem Statement
Previously, products only displayed in `AppUnit` (application rate: lbs, fl oz, etc.). This wasn't practical for:
- **Field Technicians**: Load trucks in bags/bottles, not lbs/fl oz
- **Shop Managers**: Purchase in pallets/cases, not individual units
- **Office Staff**: Need application rates for planning

## Solution Architecture

### 1. Type Structure
**Location**: `src/app/realGreen/product/_lib/types/ProductUnitConfigTypes.ts`

Key types:
- `UnitContext`: `'app' | 'load' | 'purchase'`
- `UnitConversion`: Defines conversion factor and label for each context
- `ProductUnitConfig`: Stores all conversions for a product

Example configuration:
```typescript
{
  productId: 123,
  conversions: [
    { context: 'app', unitLabel: 'Lbs', conversionFactor: 1, baseMetric: 'weight' },
    { context: 'load', unitLabel: '50lb Bag', conversionFactor: 50, baseMetric: 'weight' },
    { context: 'purchase', unitLabel: 'Pallet (40 bags)', conversionFactor: 2000, baseMetric: 'weight' }
  ]
}
```

Helper functions:
- `getConversionForContext()`: Gets conversion config for a context
- `convertQuantity()`: Converts between contexts
- `createDefaultAppConversion()`: Creates default app context conversion

### 2. Storage Layer
**Location**: `src/app/realGreen/product/_lib/models/UnitConfigModel.ts`

MongoDB model with schema:
- `productId`: Number, unique, indexed
- `conversions[]`: Array of UnitConversion objects
- Timestamps: Auto-managed createdAt/updatedAt

**Design Decision**: Separate collection from Unit model
- Keeps Unit model focused on metric definitions from realGreen API
- Product-specific conversions are business logic, not API data
- Allows flexible configuration per product

### 3. API Layer
**Contract**: `src/app/realGreen/product/unitConfig/api/UnitConfigContract.ts`
**Handlers**: `src/app/realGreen/product/unitConfig/api/route.ts`

Operations:
- `getAll`: Fetch all unit configs
- `getByProductId`: Fetch config for specific product
- `saveConfig`: Upsert product unit config
- `deleteConfig`: Remove config

All routes require 'office' or 'admin' role.

### 4. Redux State Management
**Location**: `src/app/realGreen/product/_lib/slices/unitConfigSlice.ts`

State shape:
```typescript
{
  configs: ProductUnitConfig[],
  configsByProductId: Record<number, ProductUnitConfig>
}
```

Thunks:
- `getAllUnitConfigs`
- `getUnitConfigByProductId`
- `saveUnitConfig`
- `deleteUnitConfig`

Registered in root reducer at `state.unitConfig`.

### 5. UI Implementation

#### Page Level (`src/app/bizPlan/products/page.tsx`)
Added RadioGroup for unit context switching:
- Options: Application | Loading | Purchasing
- State: `unitContext` passed to ProductsTable
- Positioned alongside existing Unfinished/All toggle

#### Table Component (`src/app/bizPlan/products/components/ProductsTable.tsx`)
Enhanced to:
- Accept `unitContext` prop
- Read configs from Redux: `state.unitConfig.configsByProductId`
- Convert quantities using helper functions
- Display converted quantities with appropriate unit labels
- Show context-appropriate units in expanded details

Key function: `getDisplayQuantityAndUnit(productId, baseQuantity)`
- Looks up unit config for product
- Converts from 'app' context to selected context
- Returns { quantity, unit } for display

## Usage Flow

1. **Initial State**: All products display in AppUnit (from realGreen API)
2. **Configuration**: Office staff configure unit conversions per product via API
3. **User Selection**: User selects context (Application/Loading/Purchasing)
4. **Conversion**: Table reads configs from Redux, converts quantities
5. **Display**: Shows converted quantities with context-appropriate labels

## Next Steps

### Immediate Priorities
1. **UI for Configuration**: Create admin interface to configure unit conversions
   - Location: Product management screen or separate settings page
   - Features: Add/edit/delete conversions per product
   - Validation: Ensure conversion factors make sense

2. **Data Loading**: Add hook to load unit configs on page mount
   - Hook: `useUnitConfig({ autoLoad: true })`
   - Location: Alongside other data hooks in page.tsx

3. **Default Configurations**: Seed common product configurations
   - Fertilizers: Bags ’ Pallets
   - Liquids: Jugs ’ Cases
   - Granular: Containers ’ Bulk

### Future Enhancements
1. **Bulk Configuration**: Configure multiple products at once by category
2. **Templates**: Pre-defined conversion templates for common product types
3. **Validation**: Warn if conversions seem incorrect (e.g., purchase unit smaller than load unit)
4. **History**: Track changes to unit configurations
5. **Export**: Include unit context in reports and exports
6. **Service Code View**: Apply unit conversions to ServiceCodeTable component

## Example Scenarios

### Scenario 1: Field Technician Loading Truck
- Selects "Loading" context
- Product "20-20-20 Fertilizer" shows: "24 × 50lb Bag" instead of "1200 Lbs"
- Knows exactly how many bags to load

### Scenario 2: Shop Manager Ordering
- Selects "Purchasing" context
- Product "Dimension 2EW" shows: "3 × Pallet (40 bags)" instead of "6000 Lbs"
- Places order by the pallet

### Scenario 3: Office Planning
- Selects "Application" context (default)
- Product shows in original AppUnit (Lbs, Fl Oz, etc.)
- Plans services by application rate

## Technical Notes

### Why Separate from Unit Model?
The existing Unit model stores definitions from realGreen API (unitId, metric, desc). These are system-level definitions. Product-specific conversions are business logic that vary by company workflow. Mixing them would:
1. Pollute Unit model with product-specific data
2. Complicate sync with realGreen API
3. Reduce flexibility for per-product customization

### Conversion Factor Logic
All conversions are relative to 'app' context (factor = 1):
- To convert between contexts: quantity * fromFactor / toFactor
- Example: 1200 lbs ’ bags: 1200 * 1 / 50 = 24 bags
- Example: 24 bags ’ lbs: 24 * 50 / 1 = 1200 lbs

### Redux Integration
Unit configs live in separate slice but complement product data:
- `state.product`: Core product data from realGreen API
- `state.unitConfig`: Business-specific unit configurations
- Join in components via productId

## Files Created/Modified

### Created
1. `src/app/realGreen/product/_lib/types/ProductUnitConfigTypes.ts` - Types and helpers
2. `src/app/realGreen/product/_lib/models/UnitConfigModel.ts` - MongoDB model
3. `src/app/realGreen/product/unitConfig/api/UnitConfigContract.ts` - API contract
4. `src/app/realGreen/product/unitConfig/api/route.ts` - API handlers
5. `src/app/realGreen/product/_lib/slices/unitConfigSlice.ts` - Redux slice

### Modified
1. `src/store/reducers/index.ts` - Registered unitConfig reducer
2. `src/app/bizPlan/products/page.tsx` - Added context RadioGroup
3. `src/app/bizPlan/products/components/ProductsTable.tsx` - Unit conversion display

## Testing Recommendations

1. **API Testing**:
   - Create, read, update, delete unit configs
   - Validate conversion factors
   - Test role permissions

2. **Conversion Testing**:
   - Verify math: app ” load ” purchase
   - Edge cases: zero, negative, very large numbers
   - Missing configs: fallback to app context

3. **UI Testing**:
   - Context switching updates all quantities
   - Expanded details show converted amounts
   - Unit labels update correctly

4. **Integration Testing**:
   - Load configs on page mount
   - Redux state updates properly
   - Multiple products with different configs
