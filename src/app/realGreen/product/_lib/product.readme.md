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

---

## Implementation Status Report

**Last Updated**: 2026-02-04
**Status**: UI Implementation Phase - View & Edit Features

### Completed Features ✅

#### Architecture & Backend
- [x] Discriminated union type system for products (Master/Sub/Single)
- [x] MongoDB schema with `ProductDocPropsModel`
- [x] Server-side product type determination logic
- [x] Bulk write operations for efficient database updates
- [x] API contract and route handlers (`/api/realGreen/product`)
- [x] Redux state management with `productSlice`
- [x] Normalized selectors for derived data (`productSelectors.ts`)
- [x] Base product types for defaults and placeholders

#### UI Framework
- [x] Reusable `DataGrid` component with TanStack Table v8
- [x] Global search across multiple columns (type-safe)
- [x] Column sorting with visual indicators
- [x] Pagination controls with state management
- [x] Column visibility toggle
- [x] **Column resizing** with real-time feedback
  - [x] Resize handles visible on column borders (subtle at 20% opacity, 100% on hover)
  - [x] "Right only" resize behavior (affects only the resized column)
  - [x] Double-click to reset column width
  - [x] `table-layout: auto` for independent column widths
- [x] Expandable rows for master-sub relationships
- [x] CVA-based table variants (alternating, expandable, default)
- [x] Text truncation in cells (with `truncate` class)

#### Product List View
- [x] **Singles Tab**: Display all single products
  - [x] Product Code, Description, Sub-Category columns
  - [x] Green alternating row colors
  - [x] Sortable columns
  - [x] Global search (productCode, description)
  - [x] Pagination (20 per page)
- [x] **Masters Tab**: Display all master products
  - [x] Product Code, Description, Sub-Category, Sub Count, Actions columns
  - [x] Expandable rows showing sub-products
  - [x] Edit button to open relationship editor
  - [x] Sortable columns
  - [x] Global search (productCode, description)
  - [x] Pagination (20 per page)
- [x] Tab navigation between Singles and Masters views
- [x] Product count display per tab

#### Master-Sub Relationship Editor
- [x] `MasterEditSheet` component (opens in side sheet)
- [x] Display master product details (code, description)
- [x] Checkbox list of available sub-products
- [x] Filter to show only products capable of being subs
- [x] Current sub-products pre-selected in checkboxes

### In Progress / Pending Features 🚧

#### Master-Sub Relationship Management
- [ ] **Save functionality** for master-sub relationships
  - [ ] API endpoint to update `subProductIds` on master
  - [ ] Redux action to dispatch save request
  - [ ] Optimistic UI update in Redux state
  - [ ] Error handling and rollback on failure
  - [ ] Toast notifications for success/error
  - [ ] Close sheet after successful save
- [ ] **Validation logic** in edit sheet
  - [ ] Prevent saving if no changes made
  - [ ] Warn if removing all subs from a master
  - [ ] Validate sub-products still exist in API data

#### UI Polish
- [ ] **Text truncation tooltips** (Issue #3 from resizing discussion)
  - Current: `truncate` class applied, but tooltips not working
  - Problem: Column cells render `<div>{value}</div>`, making text extraction complex
  - Options to fix:
    1. Render plain text in cells instead of wrapping in div
    2. Manually add `title` attributes in column definitions
    3. Implement recursive text extraction in `TableCell`
  - **Recommendation**: Update column cell renderers to include explicit `title` attributes
- [ ] Replace `categoryId` with resolved `categoryName`
  - Need category lookup/mapping from API
  - Update selectors to hydrate category names
- [ ] Loading states for data fetching
- [ ] Empty states when no products exist
- [ ] Error boundaries for component failures

#### Data Management
- [ ] **Create new master products** (UI + API)
- [ ] **Promote single to master** (if API allows via `isMaster` flag)
- [ ] **Demote master to single** (remove all subs, update type)
- [ ] **Reassign sub-products** between masters
- [ ] **Orphaned sub detection** (subs whose master was deleted)
  - Visual indicator in UI
  - Bulk reassignment tool
- [ ] **Product type migration**
  - Handle products whose API flags changed
  - Show warnings/confirmations before reconciling

#### Advanced Features
- [ ] **Bulk operations**
  - Select multiple products
  - Bulk assign to master
  - Bulk delete relationships
- [ ] **Product hierarchy visualization**
  - Tree view showing master → sub relationships
  - Drag-and-drop to reassign subs
- [ ] **Search and filtering enhancements**
  - Filter by product type (master/single/sub)
  - Filter by category
  - Advanced filter builder
- [ ] **Audit trail**
  - Track relationship changes (who, when, what)
  - Display change history in UI
  - Add `lastModifiedBy` and `lastModifiedAt` fields

#### Technical Debt & Optimization
- [ ] Remove debug `console.log` statements from DataGrid components
- [ ] Add TypeScript strict mode compliance
- [ ] Add unit tests for selectors
- [ ] Add integration tests for API routes
- [ ] Performance optimization for large datasets (>1000 products)
  - Virtualized scrolling for tables
  - Lazy loading of sub-product details
- [ ] Error tracking fields on `ProductDocPropsStorage`:
  - `apiDataIncomplete: boolean`
  - `missingFields: string[]`
  - `lastApiSync: Date`

### Known Issues 🐛

1. **Column resizing text truncation** (Low Priority)
   - Truncation CSS works, but tooltip doesn't show full text
   - Cell content wrapped in `<div>` makes text extraction complex
   - Workaround: Update column definitions to add explicit `title` attributes

2. **Category ID instead of name** (Medium Priority)
   - Currently displaying numeric `categoryId` in tables
   - Need to fetch category data from API and create selector to resolve names
   - Affects both Singles and Masters tabs

### Next Steps (Recommended Order)

1. **Implement save functionality** for master-sub relationships (highest value)
   - Create API endpoint: `PUT /api/realGreen/product/:productId`
   - Add Redux thunk for save action
   - Wire up save button in `MasterEditSheet`
   - Add loading state and error handling

2. **Fix category name resolution** (improves UX)
   - Fetch categories from RealGreen API
   - Create category selector
   - Update product table columns to display names

3. **Add tooltip fix for truncated text** (polish)
   - Update column cell renderers in `productTableColumns.tsx`
   - Add explicit `title={row.getValue(...)}` to divs

4. **Implement loading and error states** (production readiness)
   - Add loading spinner during data fetch
   - Add error messages when API fails
   - Add empty states for zero products

5. **Build bulk operations** (advanced features)
   - Multi-select in tables
   - Bulk assign/unassign subs

### Files Modified in This Session

**Component Library:**
- `src/components/DataGrid/DataGrid.tsx` - Main grid component with resizing
- `src/components/DataGrid/DataGridToolbar.tsx` - Global search implementation
- `src/components/DataGrid/DataGridPagination.tsx` - Fixed state sync issues
- `src/components/DataGrid/types.ts` - Added resizing and global filter props
- `src/style/components/table.tsx` - Added resize handles, changed to `table-layout: auto`

**Product Features:**
- `src/app/realGreen/product/list/page.tsx` - Tab navigation layout
- `src/app/realGreen/product/list/tabs/SinglesTab.tsx` - Singles product table
- `src/app/realGreen/product/list/tabs/MastersTab.tsx` - Masters product table with expandable rows
- `src/app/realGreen/product/list/tabs/MasterEditSheet.tsx` - Relationship editor UI
- `src/app/realGreen/product/list/productTableColumns.tsx` - Column definitions with sizing

**Navigation:**
- `src/components/navBar/NavMenu.tsx` - Added "Real Green → Products" menu item with role-based filtering

### Architecture Decisions Made

1. **Global Search vs Per-Column Filters**: Chose global search across multiple columns (Option 3)
   - More user-friendly single search box
   - Searches across `productCode` and `description` simultaneously
   - Type-safe with `keyof TData` constraint

2. **Column Resizing: Fixed vs Auto Layout**: Chose `table-layout: auto` (Option B modified)
   - Provides "right only" resize behavior naturally
   - Resizing one column doesn't affect others proportionally
   - Better UX - users don't need to re-adjust earlier columns
   - Table still fills container width with `w-full`

3. **Text Truncation Strategy**: Deferred implementation
   - Applied `truncate` CSS class to cells
   - Tooltip extraction from nested React elements too complex
   - Decided to handle explicitly in column definitions when needed

4. **State Management for Table Features**: Explicit state props
   - TanStack Table's internal state changes don't trigger React re-renders
   - Solution: Pass explicit state values as props to sub-components
   - Affects: pagination, column visibility, global filter

---

**Session Context**: This session focused on building the DataGrid component library and implementing the product list viewer with column resizing, global search, and master-sub relationship visualization. The next major milestone is implementing the save functionality for relationship management.
