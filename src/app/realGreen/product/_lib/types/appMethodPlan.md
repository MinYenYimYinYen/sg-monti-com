# AppMethod Data Module Implementation Plan

## Overview
AppMethod is a new data module that enables machine-specific application rate calculations for liquid carriers in product mixes. It follows the standard Data Module Pattern with 5 components: Contract, Route, Slice, Selectors, and Hook.

## Core Concept
- **Purpose**: Calculate carrier (water) application rates based on machine settings (speed, width, overlap, flow rate)
- **Scope**: Applies ONLY to carriers (liquid delivery systems). Solid products use manual rate entry.
- **Rate Calculation**: Uses physical formula based on flow rate, speed, width, and overlap pattern
- **Dynamic UI**: Mix charts support real-time recalculation when user adjusts machine settings

## Architecture

### 1. Type Definitions (`AppMethodTypes.ts`)

```typescript
export type AppMethod = {
  appMethodId: string;
  description: string;
  speed: number; // seconds to travel 90 feet (standard: 17.5)
  doubleOverlap: boolean;
  width: number; // feet
  flowRate: number; // amount per minute
  flowRateUnitId: number; // References Unit.unitId for gal/min, L/min, etc.
};

export type AppMethodStorage = AppMethod & {
  createdAt: Date;
  updatedAt: Date;
};

export const baseAppMethod: AppMethod = {
  appMethodId: "",
  description: "",
  speed: 17.5,
  doubleOverlap: false,
  width: 11,
  flowRate: 3,
  flowRateUnitId: 20, // Mixed Gallons
};
```

### 2. Rate Calculation Utility (`appMethodUtils.ts`)

**Location**: `src/app/realGreen/product/_lib/utils/appMethodUtils.ts`

```typescript
/**
 * Calculates carrier application rate from AppMethod parameters.
 * Based on physical formula: rate = (flowRate × time) / (area covered)
 *
 * Formula derivation:
 * - gs = flowRate / 60 (gal/sec from gal/min)
 * - v = 90 / speed (ft/sec, distance/time)
 * - As = v × width (ft²/sec, area coverage rate)
 * - Aeff = As / overlap (effective area accounting for overlap)
 * - gft2 = gs / Aeff (gal/ft²)
 * - Result = gft2 × 1000 (gal/1000 ft²)
 */
export function calculateCarrierRate({
  speed,
  doubleOverlap,
  width,
  flowRate,
}: {
  speed: number;
  doubleOverlap: boolean;
  width: number;
  flowRate: number;
}): number {
  const gs = flowRate / 60; // gal/sec
  const v = 90 / speed; // ft/sec
  const As = v * width; // ft²/sec
  const overlap = doubleOverlap ? 2 : 1;
  const Aeff = As / overlap; // effective ft²/sec
  const gft2 = gs / Aeff; // gal/ft²
  return gft2 * 1000; // gal/1000 ft²
}
```

### 3. ProductMaster Type Changes

**File**: `src/app/realGreen/product/_lib/types/ProductMasterTypes.ts`

```typescript
// Storage type (MongoDB)
export type ProductMasterDocProps = CreatedUpdated &
  ProductCommonDocProps & {
    productId: number;
    appMethodId?: string | null; // Default AppMethod for this master
    subProductConfigDocs: SubProductConfigDoc[];
  };

// Runtime type (hydrated)
export type ProductMasterProps = ProductCommonProps & {
  appMethod?: AppMethod | null; // Hydrated from appMethodId
  subProductConfigs: SubProductConfig[];
};

export type SubProductConfigDoc = {
  subId: number;
  rate: number; // Manual fallback or per-1000-ft² rate
  appMethodId?: string | null; // Optional override of master's AppMethod
};

export type SubProductConfig = {
  subId: number;
  subProduct: ProductSub;
  rate: number; // ALWAYS per 1000 ft² (calculated or manual)
  appMethod?: AppMethod | null; // Hydrated from appMethodId (if override)
};
```

**Semantic meaning of `rate` field**:
- **Source of truth**: Always represents application rate per 1000 ft²
- **Calculation priority**:
  1. If `appMethodId` exists and valid AppMethod found ’ calculate from AppMethod
  2. Else ’ use stored `rate` value (manual entry)

### 4. MongoDB Model (`AppMethodModel.ts`)

**Location**: `src/app/realGreen/product/_lib/models/AppMethodModel.ts`

```typescript
import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { AppMethodStorage } from "../types/AppMethodTypes";

interface AppMethodDoc extends AppMethodStorage, mongoose.Document {}

const AppMethodSchema = new mongoose.Schema<AppMethodDoc>(
  {
    appMethodId: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    speed: { type: Number, required: true },
    doubleOverlap: { type: Boolean, required: true },
    width: { type: Number, required: true },
    flowRate: { type: Number, required: true },
    flowRateUnitId: { type: Number, required: true },
  },
  { timestamps: true }
);

export const AppMethodModel = createModel<AppMethodDoc>("AppMethod", AppMethodSchema);
```

### 5. API Contract (`ProductContract.ts`)

**File**: `src/app/realGreen/product/api/ProductContract.ts`

```typescript
// Add to existing ProductContract
export interface ProductContract extends ApiContract {
  // ... existing methods ...

  getAllAppMethods: {
    params: {};
    result: DataResponse<AppMethod[]>;
  };

  upsertAppMethod: {
    params: { appMethod: AppMethod };
    result: SuccessResponse;
  };

  deleteAppMethod: {
    params: { appMethodId: string };
    result: SuccessResponse;
  };
}
```

### 6. API Route Handlers (`api/route.ts`)

**File**: `src/app/realGreen/product/api/route.ts`

```typescript
// Add to existing handlers
const handlers: ProductContract = {
  // ... existing handlers ...

  getAllAppMethods: {
    roles: ["user"],
    handler: async () => {
      await connectToMongoDB();
      const docs = await AppMethodModel.find({}).lean();
      const appMethods = cleanMongoArray(docs);
      return { success: true, payload: appMethods };
    },
  },

  upsertAppMethod: {
    roles: ["admin"],
    handler: async (params) => {
      const { appMethod } = params;
      await connectToMongoDB();

      await AppMethodModel.findOneAndUpdate(
        { appMethodId: appMethod.appMethodId },
        appMethod,
        { upsert: true, new: true }
      );

      return { success: true };
    },
  },

  deleteAppMethod: {
    roles: ["admin"],
    handler: async (params) => {
      const { appMethodId } = params;
      await connectToMongoDB();

      const result = await AppMethodModel.deleteOne({ appMethodId });

      if (result.deletedCount === 0) {
        throw new AppError({
          message: `AppMethod ${appMethodId} not found`,
          type: "NOT_FOUND",
          isOperational: true,
        });
      }

      return { success: true };
    },
  },
};
```

### 7. Redux Slice (`productSlice.ts`)

**File**: `src/app/realGreen/product/_lib/slices/productSlice.ts`

```typescript
// Add to ProductState
type ProductState = {
  // ... existing state ...
  appMethods: AppMethod[];
};

// Add to initialState
const initialState: ProductState = {
  // ... existing state ...
  appMethods: [],
};

// Add thunks
export const { getAllAppMethods, upsertAppMethod, deleteAppMethod } =
  createStandardThunk<ProductContract>({
    contractName: "product",
  });

// Add to slice reducers
const productSlice = createSlice({
  name: "product",
  initialState,
  reducers: {
    // ... existing reducers ...
  },
  extraReducers: (builder) => {
    // ... existing reducers ...

    builder.addCase(getAllAppMethods.fulfilled, (state, action) => {
      state.appMethods = action.payload;
    });

    builder.addCase(upsertAppMethod.fulfilled, (state, action) => {
      const { appMethod } = action.meta.arg.params;
      const index = state.appMethods.findIndex(
        (am) => am.appMethodId === appMethod.appMethodId
      );
      if (index >= 0) {
        state.appMethods[index] = appMethod;
      } else {
        state.appMethods.push(appMethod);
      }
    });

    builder.addCase(deleteAppMethod.fulfilled, (state, action) => {
      const { appMethodId } = action.meta.arg.params;
      state.appMethods = state.appMethods.filter(
        (am) => am.appMethodId !== appMethodId
      );
    });
  },
});
```

### 8. Selectors (`productSelectors.ts`)

**File**: `src/app/realGreen/product/_lib/selectors/productSelectors.ts`

```typescript
// Add to existing selectors
const selectAppMethods = (state: AppState) => state.product.appMethods;

const selectAppMethodMap = createSelector(
  [selectAppMethods],
  (appMethods) => new Grouper(appMethods).toUniqueMap((am) => am.appMethodId)
);

// Modify selectProductMasters to hydrate appMethod
const selectProductMasters = createSelector(
  [
    selectProductMasterDocs,
    selectProductSubsMap,
    unitConfigSelect.unitConfigMap,
    selectAppMethodMap, // Add appMethodMap dependency
  ],
  (masterDocs, subsMap, unitConfigMap, appMethodMap) => {
    const masters: ProductMaster[] = masterDocs.map((doc) => {
      const { unitConfig, unitConfigDisplay } = hydrateUnitConfig(doc, unitConfigMap);

      // Hydrate master-level appMethod
      const masterAppMethod = doc.appMethodId
        ? appMethodMap.get(doc.appMethodId) || null
        : null;

      return {
        ...doc,
        productType: "master",
        unitConfig,
        unitConfigDisplay,
        appMethod: masterAppMethod,
        subProductConfigs: doc.subProductConfigDocs.map((configDoc) => {
          const subProduct = subsMap.get(configDoc.subId);

          // Determine which AppMethod to use (override or master default)
          const effectiveAppMethod = configDoc.appMethodId
            ? appMethodMap.get(configDoc.appMethodId) || null
            : masterAppMethod;

          // Calculate rate if AppMethod exists, otherwise use stored rate
          let calculatedRate = configDoc.rate;
          if (effectiveAppMethod && configDoc.subId === WATER_IDS.productId) {
            calculatedRate = calculateCarrierRate({
              speed: effectiveAppMethod.speed,
              doubleOverlap: effectiveAppMethod.doubleOverlap,
              width: effectiveAppMethod.width,
              flowRate: effectiveAppMethod.flowRate,
            });
          }

          const config: SubProductConfig = {
            subId: configDoc.subId,
            rate: calculatedRate, // Always per 1000 ft²
            appMethod: effectiveAppMethod,
            subProduct: subProduct || {
              ...baseProductSub,
              productId: configDoc.subId,
            },
          };
          return config;
        }),
      };
    });
    return masters;
  }
);

// Export updated selectors
export const productSelect = {
  // ... existing selectors ...
  appMethods: selectAppMethods,
  appMethodMap: selectAppMethodMap,
};
```

### 9. Hook (`useProduct.ts`)

**File**: `src/app/realGreen/product/_lib/hooks/useProduct.ts`

```typescript
export function useProduct({ autoLoad = false }: { autoLoad?: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        getAll({
          params: {},
          config: { loadingMsg: "Loading Products" },
        })
      );

      // Load AppMethods alongside products
      dispatch(
        getAllAppMethods({
          params: {},
          config: { silent: true }, // No spinner for secondary data
        })
      );
    }
  }, [autoLoad, dispatch]);

  return {
    // ... existing return values ...
    upsertAppMethod: (params: { appMethod: AppMethod }) =>
      dispatch(
        upsertAppMethod({
          params,
          config: { successMsg: "AppMethod saved" },
        })
      ),
    deleteAppMethod: (params: { appMethodId: string }) =>
      dispatch(
        deleteAppMethod({
          params,
          config: { successMsg: "AppMethod deleted" },
        })
      ),
  };
}
```

### 10. Update ProductDocPropsModel Schema

**File**: `src/app/realGreen/product/_lib/models/ProductDocPropsModel.ts`

```typescript
const ProductDocPropsSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true, unique: true },

    // Add appMethodId field
    appMethodId: { type: String, required: false },

    subProductConfigDocs: {
      type: [
        {
          subId: { type: Number, required: true },
          rate: { type: Number, required: true },
          appMethodId: { type: String, required: false }, // Add override
        },
      ],
      required: false,
      default: [],
    },
  },
  { timestamps: true }
);
```

### 11. Update baseProduct

**File**: `src/app/realGreen/product/_lib/baseProduct.ts`

```typescript
export const baseProductMasterDocProps: ProductMasterDocProps = {
  productId: baseNumId,
  category: baseStrId,
  unit: baseUnit,
  subProductConfigDocs: [],
  appMethodId: null, // Add default
  createdAt: baseStrId,
  updatedAt: baseStrId,
};
```

## UI Components

### 12. AppMethod Management Page

**Location**: `src/app/realGreen/product/appMethod/page.tsx`

Features:
- List all AppMethods in a table
- Create/Edit AppMethod via modal or sheet
- Delete AppMethod with confirmation
- Show which masters use each AppMethod (future enhancement)

### 13. Update EditSubProductsSheet

**File**: `src/app/realGreen/product/list/tabs/EditSubProductsSheet.tsx`

Add at top of sheet:
```tsx
// AppMethod selector (shows at master level)
<div className="space-y-2">
  <Label>Application Method (Optional)</Label>
  <Select
    value={masterAppMethodId || "none"}
    onValueChange={(value) =>
      setMasterAppMethodId(value === "none" ? null : value)
    }
  >
    <SelectTrigger>
      <SelectValue placeholder="None - Manual Rates" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="none">None - Manual Rates</SelectItem>
      {appMethods.map((am) => (
        <SelectItem key={am.appMethodId} value={am.appMethodId}>
          {am.description}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

### 14. Update Mix Chart Page (Dynamic Adjustment)

**File**: `src/app/realGreen/product/mixChart/page.tsx`

Add UI controls for live AppMethod parameter adjustment:
```tsx
const [speed, setSpeed] = useState(selectedMaster?.appMethod?.speed || 17.5);
const [width, setWidth] = useState(selectedMaster?.appMethod?.width || 11);
const [doubleOverlap, setDoubleOverlap] = useState(
  selectedMaster?.appMethod?.doubleOverlap || false
);
const [flowRate, setFlowRate] = useState(
  selectedMaster?.appMethod?.flowRate || 3
);

// Use these local state values to recalculate rates in real-time
// Future: Add "Save as new AppMethod" button
```

## Implementation Order

1.  **Types** - `AppMethodTypes.ts` (define data structures)
2.  **Utils** - `appMethodUtils.ts` (rate calculation formula)
3.  **Model** - `AppMethodModel.ts` (MongoDB schema)
4.  **Contract** - Update `ProductContract.ts` (API interface)
5.  **Route** - Update `api/route.ts` (API handlers)
6.  **Slice** - Update `productSlice.ts` (Redux state)
7.  **Selectors** - Update `productSelectors.ts` (hydration logic)
8.  **ProductMasterTypes** - Add `appMethodId` fields
9.  **ProductDocPropsModel** - Add schema fields
10.  **baseProduct** - Add default values
11.  **Hook** - Update `useProduct.ts` (fetch AppMethods)
12. **UI: AppMethod Management** - Create CRUD page
13. **UI: EditSubProductsSheet** - Add AppMethod selector
14. **UI: Mix Chart** - Add dynamic adjustment controls

## Testing Considerations

### Unit Tests
- `calculateCarrierRate()` with various inputs
- Verify rate calculation matches LaTeX formula
- Edge cases: zero values, extreme speeds

### Integration Tests
- Create AppMethod via API
- Associate AppMethod with ProductMaster
- Verify selector calculates correct rates
- Verify water subProduct gets calculated rate
- Verify non-water products use manual rate

### Manual Testing Scenarios
1. Create AppMethod for standard walking speed (17.5s/90ft)
2. Associate with master that has water carrier
3. Generate mix chart - verify water rate ~1.74 gal/1000 ft²
4. Adjust speed in mix chart UI - verify rates recalculate
5. Add concentrate products - verify rates are per 1000 ft²
6. Remove AppMethod - verify fallback to manual rates

## Migration Considerations

### Backward Compatibility
- `appMethodId` fields are optional (nullable)
- Existing masters without AppMethod use manual rates
- No breaking changes to existing data

### Data Migration
None required - new fields default to null.

## Future Enhancements

1. **Save custom mix chart settings as new AppMethod**
   - "Save as new AppMethod" button in mix chart UI
   - Pre-populate form with current parameters

2. **AppMethod usage tracking**
   - Show which masters/configs use each AppMethod
   - Prevent deletion of in-use AppMethods (or cascade update)

3. **AppMethod templates**
   - Pre-defined templates for common machines
   - "Hose Application", "Toro Sprayer", "Legacy Spreader", etc.

4. **Unit conversion for flowRate**
   - Support gal/min, L/min, etc.
   - Use `flowRateUnitId` with unit conversion logic

5. **Solid product AppMethod support** (advanced)
   - Requires dispensing rate calibration
   - May fall outside typical use case

## Notes

- **Water identification**: Use `WATER_IDS.productId === -2` to identify carrier
- **Rate calculation priority**: AppMethod > manual entry
- **Mix chart flexibility**: Local state overrides allow per-session customization
- **Data module completeness**: Follows all 5 components of Data Module Pattern
