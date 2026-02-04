# Product Architecture Documentation

## Overview

The Product module implements a type-safe, discriminated union architecture to handle three distinct product types from the RealGreen CRM API: **Master Products**, **Sub-Products**, and **Single Products** (standalone). This architecture was designed to handle complex product relationships while maintaining data integrity and type safety throughout the application.

## Why This Architecture Was Created

### The Problem

The RealGreen API provides product data with boolean flags (`isMaster`, `isMobileDevice`, `isProduction`) that determine product capabilities, but:

1. **No relationship data**: The API doesn't expose master-sub product relationships
2. **Dynamic changes**: CRM users can change product types at any time
3. **Manual configuration needed**: We must store and manage product relationships locally
4. **Type safety required**: Different product types have different properties and behaviors

### The Solution

A discriminated union type system with:
- **API as source of truth** for product capabilities
- **MongoDB storage** for relationship configuration
- **Type-safe discriminators** to differentiate product types
- **Normalized Redux state** for efficient data management
- **Client-side hydration** for relationship resolution

## Product Type Definitions

### Detection Rules (from Legacy System)

Products are classified based on RealGreen API flags:

| Product Type | isProduction | isMobileDevice | isMasterProduct |
|-------------|--------------|----------------|-----------------|
| **Single**  | true         | true           | false           |
| **Master**  | true         | true           | true            |
| **Sub**     | true         | false          | false           |

### Type Hierarchy

```
ProductRaw (from API)
    ↓ remap
ProductCore (cleaned API data)
    ↓ extend with DocProps
ProductDoc (discriminated union)
    ├─ ProductMasterDoc (has subProductIds)
    ├─ ProductSingleDoc (standalone)
    └─ ProductSubDoc (belongs to master)
    ↓ hydrate relationships
Product (UI-ready with resolved relationships)
```

## Key Types

### Core Types

**`ProductRaw`**: Raw data from RealGreen API
- Contains all fields from API response
- Unprocessed, direct mapping

**`ProductCore`**: Remapped API data
- Cleaned field names (e.g., `availableOnHandheld` → `isMobile`)
- No MongoDB extensions yet
- Returned to client for UI configuration

**`ProductDocPropsStorage`**: What we persist in MongoDB
```typescript
{
  productId: number;
  productType: 'single' | 'master' | 'sub';
  subProductIds?: number[];  // Only for masters
  createdAt: string;  // ISO string
  updatedAt: string;  // ISO string
}
```

### Discriminated Union Types

**`ProductDocPropsMaster`**: Extended properties for master products
```typescript
{
  productType: 'master';
  subProductIds: number[];  // IDs of sub-products
  createdAt: string;
  updatedAt: string;
}
```

**`ProductDocPropsSub`**: Extended properties for sub-products
```typescript
{
  productType: 'sub';
  createdAt: string;
  updatedAt: string;
}
```

**`ProductDocPropsSingle`**: Extended properties for single products
```typescript
{
  productType: 'single';
  createdAt: string;
  updatedAt: string;
}
```

### Document Types

**`ProductMasterDoc`**: `ProductCore & ProductDocPropsMaster`
**`ProductSubDoc`**: `ProductCore & ProductDocPropsSub`
**`ProductSingleDoc`**: `ProductCore & ProductDocPropsSingle`
**`ProductDoc`**: Union of all three document types

### Response Structure

**`ProductsResponse`**: What the server API returns
```typescript
{
  productMasterDocs: ProductMasterDoc[];   // Masters with subProductIds
  productSingleDocs: ProductSingleDoc[];   // Singles (+ demoted masters)
  productCores: ProductCore[];             // All products for UI config
}
```

## Architecture Principles

### 1. API is Source of Truth for Capabilities

The `determineProductType()` function validates stored configuration against current API capabilities:

```typescript
// If API says isMaster=false, product cannot be a master
// Even if MongoDB says productType='master'
// → Auto-reconciles to API capability
```

**Edge Case Handling**: If a master is demoted to single in the CRM:
- Product appears in `productSingleDocs` array
- MongoDB preserves `subProductIds` configuration
- If CRM reverts the product back to master, relationships are restored

### 2. Single Relationship Storage

We store `subProductIds` on **master documents only** (not redundant `masterProductId` on subs):

**Benefits**:
- Single source of truth
- Atomic updates (add/remove subs = one DB update)
- No synchronization issues
- Matches UI workflow (configure master's subs)

**Trade-off**: Finding a sub's master requires scanning, but:
- Client already has all data in Redux
- Lookup via selector is trivial: `masters.find(m => m.subProductIds.includes(subId))`

### 3. Normalized Redux State

```typescript
interface ProductState {
  productMasterDocs: ProductMasterDoc[];
  productSingleDocs: ProductSingleDoc[];
  productCores: ProductCore[];
}
```

- No data duplication
- Single update point for each product
- Efficient memory usage
- Follows Redux best practices

### 4. Client-Side Hydration

Relationships are resolved via selectors, not embedded on server:

```typescript
// Selector derives subs from cores based on master relationships
const selectProductSubDocs = createSelector(
  [selectProductMasterDocs, selectProductCores],
  (masters, cores) => {
    const allSubIds = new Set(masters.flatMap(m => m.subProductIds));
    return cores.filter(c => allSubIds.has(c.productId));
  }
);
```

**Benefits**:
- No data duplication in state
- Automatic recomputation on changes
- Flexible querying
- Smaller network payload

## Server-Side Flow

### 1. Fetch & Remap
```typescript
const rawProducts = await fetchFromRealGreenAPI();
const productCores = remapProducts(rawProducts);
```

### 2. Extend with MongoDB Data
```typescript
const response = await extendProducts(productCores);
// Returns: { productMasterDocs, productSingleDocs, productCores }
```

**What `extendProducts()` does**:
1. Fetches all stored DocProps from MongoDB
2. For each product core:
   - Determines type based on API capabilities + stored config
   - Prepares bulk update operation
   - Builds appropriate Doc type (Master/Single/Sub)
3. Executes bulk write to MongoDB (single DB round-trip)
4. Returns structured response

### 3. Type Determination Logic

```typescript
function determineProductType(
  core: ProductCore,
  docProps: ProductDocPropsStorage | null
): 'master' | 'sub' | 'single' {
  // 1. Detect API capabilities
  const canBeMaster = core.isMaster && core.isProduction && core.isMobile;
  const canBeSingle = !core.isMaster && core.isProduction && core.isMobile;
  const canBeSub = !core.isMaster && core.isProduction && !core.isMobile;

  // 2. If no stored config, use API capability
  if (!docProps) return /* API-detected type */;

  // 3. Validate stored config against API capability
  if (docProps.productType === 'master' && canBeMaster) return 'master';
  // ... validate other types

  // 4. CONFLICT: API changed, fall back to API capability
  return /* API-detected type */;
}
```

## Client-Side Usage

### Redux State Access

```typescript
import { useSelector } from 'react-redux';
import { productSelect } from '@/app/realGreen/product/_lib/productSelectors';

// Get all masters
const masters = useSelector(productSelect.productMasterDocs);

// Get all singles
const singles = useSelector(productSelect.productSingleDocs);

// Get all cores (for configuration UI)
const cores = useSelector(productSelect.productCores);

// Get derived subs (computed from masters + cores)
const subs = useSelector(productSelect.productSubDocs);

// Get as maps for efficient lookup
const masterMap = useSelector(productSelect.masterMap);
const master = masterMap.get(productId);
```

### Type Guards

Use discriminated union type guards to narrow types:

```typescript
if (product.productType === 'master') {
  // TypeScript knows: product is ProductMasterDoc
  console.log(product.subProductIds); // ✅ Type-safe access
}

if (product.productType === 'single') {
  // TypeScript knows: product is ProductSingleDoc
  // product.subProductIds // ❌ Compile error - doesn't exist
}
```

### Hydrating Relationships

```typescript
// Get a master with its sub-products resolved
const masterWithSubs = {
  ...master,
  subProducts: master.subProductIds
    .map(id => coreMap.get(id))
    .filter(Boolean)
};
```

## Base Types

`baseProduct.ts` provides default/placeholder instances for all types:

```typescript
import {
  baseProductCore,
  baseProductMasterDoc,
  baseProductSubDoc,
  baseProductSingleDoc,
} from '@/app/realGreen/product/_lib/baseProduct';

// Use for form defaults, testing, placeholders
const newMaster = { ...baseProductMasterDoc, description: 'New Master' };
```

## Database Schema

MongoDB collection: `Product`

```javascript
{
  productId: Number (unique, required),
  productType: String (enum: ['single', 'master', 'sub'], required),
  subProductIds: [Number] (optional, only for masters),
  createdAt: String (ISO date string),
  updatedAt: String (ISO date string)
}
```

**Indexes**: `productId` (unique)

## API Contract

```typescript
interface ProductContract {
  getAll: {
    params: {};
    result: DataResponse<ProductsResponse>;
  };
}
```

**Response format**:
```json
{
  "productMasterDocs": [...],
  "productSingleDocs": [...],
  "productCores": [...]
}
```

## Future Enhancements

### Planned (not yet implemented):

1. **Product (UI-ready type)**:
   - Fully hydrated with resolved relationships
   - Additional computed properties
   - Ready for complex UI components

2. **Error tracking fields**:
   - `apiDataIncomplete: boolean`
   - `missingFields: string[]`
   - `lastApiSync: Date`

3. **UI for relationship management**:
   - Configure which products are subs
   - Assign subs to masters
   - Visualize product hierarchies

4. **Validation and warnings**:
   - Detect orphaned subs (master deleted)
   - Flag incomplete API data
   - Warn on capability conflicts

## Migration Notes

**No existing MongoDB documents** - fresh implementation.

If migrating from another system:
1. Create initial DocProps records with `productType` based on API flags
2. Manually configure `subProductIds` for known master-sub relationships
3. Run `getAll` API to populate and validate data

## Related Files

- **Types**: `ProductTypes.ts`
- **Server Logic**: `productServerFunc.ts`
- **Database Model**: `ProductDocPropsModel.ts`
- **Redux State**: `productSlice.ts`
- **Selectors**: `productSelectors.ts`
- **API Contract**: `api/ProductContract.ts`
- **Base Types**: `baseProduct.ts`
- **Legacy Reference**: `../productLegacy.readme.md`

## Summary

This architecture provides:
- ✅ Type-safe product differentiation (Master/Sub/Single)
- ✅ Resilient to CRM changes (API as source of truth)
- ✅ Preserved configuration (relationships survive demotion)
- ✅ Efficient database operations (bulk writes)
- ✅ Normalized state (no data duplication)
- ✅ Flexible querying (derived selectors)
- ✅ Scalable foundation for future enhancements

The discriminated union pattern ensures compile-time safety while the normalized state structure enables efficient runtime operations.
