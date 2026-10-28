---
name: product-module
description: Work on the RealGreen Product module - Master, Sub and Single product types, the ProductDoc discriminated union, subProductIds relationships, productSlice and productSelectors, product API operations (saveCategory, saveUnit, saveMasterSubProducts, saveMasterEquipmentPackages), mix charts, and unit config. Use when touching src/app/realGreen/product or anything that classifies or hydrates products.
---

# Product Module

Reference: `src/app/realGreen/product/_lib/product.readme.md` (about 600 lines). Read lines 1-300 for the architecture. **Do not rely on the "Implementation Status Report" from line 404 onward**: it is dated 2026-02-04 and is a progress log, not a spec, so verify any "pending" or "known issue" claim against the code before acting on it.

Code layout under `src/app/realGreen/product/`:
- `_lib/types/`, `_lib/models/`, `_lib/slices/productSlice.ts`, `_lib/selectors/`, `_lib/hooks/`
- `api/ProductContract.ts` and `api/route.ts`
- `list/`, `mixChart/`, `unitConfig/` are feature UIs. `bkp/` is a backup folder; do not extend it.

## Core model

- RealGreen flags decide what a product *can* be: **Single** = production + mobile + not master; **Master** = production + mobile + master; **Sub** = production + not mobile + not master.
- The API is the source of truth for capability. `determineProductType()` reconciles stored MongoDB config against current API flags; on conflict the API wins (but a demoted master keeps its `subProductIds` in Mongo, so reverting the CRM flag restores the relationships).
- Type chain: `ProductRaw` -> `ProductCore` -> `ProductDoc` (discriminated union of `ProductMasterDoc | ProductSingleDoc | ProductSubDoc`, discriminant `productType`) -> hydrated `Product`.
- **Relationships are stored once**, as `subProductIds` on the master only. Never add a `masterProductId` to subs. Find a sub's master with a selector over the masters.
- Redux state is normalized: `productMasterDocs`, `productSingleDocs`, `productCores`. Subs are *derived* in selectors from masters + cores. Do not store subs or hydrated products in state.
- Hydration happens in selectors, and FKs resolve to full entities (e.g. `mixedByEquipmentId` -> `mixedByEquipment`). UI receives hydrated no-suffix types, never Docs.

## Working rules

1. Narrow with the `productType` discriminant, never with casts. Accessing `subProductIds` on a non-master should be a compile error, so keep it that way.
2. Server writes use one `bulkWrite` (single round trip), as `extendProducts()` does. Do not loop `updateOne`.
3. New operations follow the `data-module` and `api-route` skills: add to `ProductContract`, a handler with explicit `roles`, a thunk in `productSlice.ts` via `createStandardThunk`, and a selector. `api/route.ts` already uses `createRealGreenRpcHandler`, so new operations go in the same `handlers` map.
4. Select data in components with `useSelector(productSelect.<name>)`; hooks in `_lib/hooks` expose actions only.
5. PDF mix charts live in `mixChart/chartLayouts/`; use the `pdf-document` skill for those.
