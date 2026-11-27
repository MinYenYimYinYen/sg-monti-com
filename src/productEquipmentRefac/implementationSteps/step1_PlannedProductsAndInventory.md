# Step 1 action plan: planned products function; cut Monthly Inventory off from services

Status: implemented 2026-11-23. All code items are done and the 15 new tests pass. Open: G3
(Luke runs `npx tsc --noEmit`) and G4 (Luke's sandbox checks).

Parent file: `05_FullStateSandboxSetup.md` holds the decisions, the facts and the order of work.
This file adds the file-level detail for step 1 only. Progress on this step is ticked off here
and summarised under "Progress" in 05.

## Goal
1. The four bizPlan sites that read planned products from `Service.loadoutInventory` read them
   from one pure function instead.
2. The cover sheet shows no planned products. The three places that did are emptied and left as
   commented placeholders.
3. Monthly Inventory stops reading services.
4. `getPlannedProducts` has tests.

Afterwards nothing outside loadout reads `Service.loadoutInventory`. The field stays until step 2,
because loadout still reads it. The step can be deployed on its own. Forecast numbers change when
it is deployed (accepted in 05).

## Decisions made while planning (2026-11-23)
- Cover sheet: remove the whole planned products section and leave an empty placeholder with
  comments saying we intend to rework it, after the refactor is complete. Read as all three
  places that showed planned products: the "Products" view of the cover sheet card, and on the
  PDF both the product totals per service code and the products per service. The PDF section
  "products used on completed services" (history) is a different thing and stays.
- The "Products" radio on `coverSheets/page.tsx` and the `"products"` card variant stay, so the
  rework has a place to land. Choosing that view shows cards with no products. Luke confirmed
  keeping the placeholder (2026-11-23).
- Tests for `getPlannedProducts`: yes (item G).
- Checks: search-based checks are accepted for this step. This session has no `ide_*` tools.
  Luke still runs `npx tsc --noEmit` after the step.

## Skills and reading
Read each when the work it covers starts.
- `realgreen-customer` skill: read. This step adds no relation to the customer tree and removes
  none, so rule 4 (hydrate through `centralSelect`) is not touched.
- `pdf-document` skill and `src/lib/pdf/pdf.readme.md`: read in full before touching the cover
  sheet PDF (item C). Note its rule that `tw()` must never get an empty class string.
- `write-tests` skill and `src/__tests__/testing.readme.md`: read before item G.
- No other skill applies: there is no API route, slice shape, permission or styling change.

## Facts checked against the code (2026-11-23)
Line numbers are as of that day.
- The four bizPlan sites:
  - `bizPlan/selectors/inventorySelectors.ts`: `selectProductUsagePlanned` (line 35),
    `selectProductsMixedActualPlanned` (line 471), `selectProductComparison` (line 542).
  - `bizPlan/selectors/createInventorySelectors.ts`: `createProductUsagePlannedSelector`
    (line 74).
- The cover sheet sites, which are emptied instead of moved:
  - `scheduling/coverSheets/_lib/components/CoverSheetCard.tsx`: `getPlannedAppProductTotal`
    (lines 38-55), the "products" branch of the header (lines 82-105) and of the per-employee
    content (lines 166-195).
  - `scheduling/coverSheets/[routeDate]/page.tsx`: `getPlannedAppProductTotal` (lines 63-84) and
    its prop through `RouteDatePage`, `CoverSheetsPDFProps`, `CoverSheetViewer` and
    `CoverSheetsPDF`; the totals per service code (lines 253-266, shown in the cell at 301-319);
    the products per service (lines 329-346, shown in the `PRODUCTS` view at 556-576).
  - `productCommonMap` on that page is read only by the planned products code (lines 58, 110,
    135, 150, 161, 203, 329, 335), so it goes too. `AppProduct` stays imported: line 426 types
    the history rows.
  - `coverSheets/page.tsx` renders the card with `variant={view}`, with a "Products" radio.
- Together these seven sites (four bizPlan, three cover sheet) are the only importers of
  `loadoutBaseToAppProductCore.ts`, apart from a comment in `useAppProducts.ts`.
- `ProductRule` is `ProductRuleDoc` plus hydrated fields, and `ServCode` is `ServCodeDoc` plus
  hydrated fields. So `service.servCode.productRuleDocs` exists on every service, and
  `baseServCode.productRuleDocs` is `[]`. The function reads rule docs and master docs and needs
  no hydrated master, so step 5 does not touch it.
- `productSelect.productMasterDocMap` (`product/_lib/selectors/productSelectors.ts`) is a `Map` of
  master docs by `productId`, built from `state.product.productMasterDocs` only. It does not
  change when equipment, packages or app methods change.
- `ProductMasterDoc.subProductConfigDocs[]` holds `subId` and `storedRate` (and, until step 4,
  `mixedByEquipmentIds`). `hydrateRate` returns `storedRate`, so the old hydrated `config.rate` is
  the same number.
- The old rows' `method` (always `""`) is read nowhere in bizPlan or the cover sheets.
- Old rule matching (`getProductMasters` in `hydratePlannedLoadout.ts`) is kept exactly: `all`
  always matches, `lte` matches when `size <= rule.size`, `gt` when `size > rule.size`. A master
  on two matching rules counts twice. A master id with no master doc is skipped. A service with
  no servCode gives no rows.
- Monthly Inventory:
  - Services are read by `productIdsFromServices` and `predictions` in `inventorySelect.ts`
    only. Their consumers are `ByProductionDateTab` in `SelectProductsSheet.tsx`, and `page.tsx`
    with `ProductListRow.tsx`.
  - `useInventoryDeps` is called by `page.tsx` and `history/page.tsx` only.
  - `[productId]/page.tsx` and `SaveInventoryButton.tsx` read `session` and the counts only.
  - `inventorySelect.lastCheck` is read only by `ByProductionDateTab`. The internal
    `selectLastCheck` is also used by `selectPredictions`.
  - `lib/inventory/inventorySessionStorage.ts` uses only the `InventorySession` type.
  - `inventorySlice` is imported only by the reducers index and the inventory files.
- `vitest.config.ts` includes `src/__tests__/**/*.test.ts`, environment `node`, alias `@` to
  `src`. There is no builder for a product master doc (`src/_builders` has none).

## Design

### New type: `src/app/realGreen/product/_lib/types/PlannedProduct.ts`
```ts
/** A sub-product a service is expected to use, worked out from the product rules of its servCode. Never stored. */
export type PlannedProduct = {
  productId: number;
  servId: number;
  amount: number;
  treated: number;
};
```

### New function: `src/app/realGreen/product/_lib/selectors/getPlannedProducts.ts`
Plain inputs and outputs: no store, hooks or React. The master input is a narrow type, as the
builders readme advises: tests pass literals, and the step 4 change to `SubProductConfigDoc`
(dropping `mixedByEquipmentIds`) cannot break them.
```ts
import { ProductRuleDoc } from "@/app/realGreen/progServ/_lib/types/ProductRule";
import { SubProductConfigDoc } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { PlannedProduct } from "@/app/realGreen/product/_lib/types/PlannedProduct";

/** The part of a master doc this function reads. */
export type PlannedProductMasterDoc = {
  subProductConfigDocs: Pick<SubProductConfigDoc, "subId" | "storedRate">[];
};

type GetPlannedProductsParams = {
  servId: number;
  size: number;
  productRuleDocs: ProductRuleDoc[];
  productMasterDocMap: ReadonlyMap<number, PlannedProductMasterDoc>;
};

function ruleMatchesSize({ rule, size }: { rule: ProductRuleDoc; size: number }): boolean {
  switch (rule.sizeOperator) {
    case "all":
      return true;
    case "lte":
      return size <= rule.size;
    case "gt":
      return size > rule.size;
  }
}

// Every sub-product on a matching master counts once, at size * storedRate. The old counting by
// equipment package is gone on purpose (decision in 05), and so is the water row.
export function getPlannedProducts({
  servId,
  size,
  productRuleDocs,
  productMasterDocMap,
}: GetPlannedProductsParams): PlannedProduct[] {
  return productRuleDocs
    .filter((rule) => ruleMatchesSize({ rule, size }))
    .flatMap((rule) => rule.productMasterIds)
    .flatMap((masterId) => {
      const masterDoc = productMasterDocMap.get(masterId);
      if (!masterDoc) return [];
      return masterDoc.subProductConfigDocs.map((config) => ({
        productId: config.subId,
        servId,
        amount: size * config.storedRate,
        treated: size,
      }));
    });
}
```
Checks on the way in: `noImplicitReturns` accepts the exhaustive `switch` (the old
`getProductMasters` does the same); if it is flagged, add a `default` that returns `false`. The
callers pass `productSelect.productMasterDocMap` (a `Map<number, ProductMasterDoc>`), which
assigns to the `ReadonlyMap` of the narrow type. Luke's `tsc` run confirms it.

### Row type in bizPlan
`EnrichedAppProduct` (`bizPlan/types/inventoryTypes.ts`) stops extending the whole `AppProduct`,
because a planned row has no `method`. New base:
`Pick<AppProduct, "productId" | "amount" | "treated" | "productCommon">`, with the existing extra
fields (`servId`, `servCode`, ...) unchanged. Actual rows still fit, since they carry more. The
name stays until step 7. Update the doc comment above the type.

### Cover sheet placeholder
The same comment goes at each of the three places, so a search for "PLACEHOLDER: planned
products" finds them all:
```
PLACEHOLDER: planned products. Intentionally empty. Planned products were removed from the cover
sheet during the product / equipment refactor (src/productEquipmentRefac). We intend to rework
this section after the refactor is complete.
```
In JSX it is a `{/* ... */}` comment. The placeholder keeps the surrounding layout (the PDF's
fixed-width `PRODUCTS` view, the card's employee box) so the rework starts from a working frame.
## Work items
Order matters: the function first, then its tests, then the callers, then the cover sheet, then
Monthly Inventory, then the delete. Tick each box as it is done.

### A. Function and types
- [x] A1. Create `PlannedProduct.ts` and `getPlannedProducts.ts` as above.

### B. Tests for `getPlannedProducts`
Read the `write-tests` skill and `src/__tests__/testing.readme.md` first.
- [x] B1. Create `src/__tests__/realGreen/product/getPlannedProducts.test.ts` (mirrors the source
  folder). Vitest, `describe` / `it` / `expect`, imports through `@/`.
  - No `make*` builder is involved: the function takes plain rule docs and a narrow master doc
    type, and the readme says to pass a literal when the input type is narrow. A `ProductRuleDoc`
    is three scalars and an id list. Do not construct a `Service`, `Program` or `Customer`.
  - Inputs are built inside the test file, with a small local helper such as
    `masterMap(entries)` that turns `[masterId, [{ subId, storedRate }]]` pairs into the `Map`.
    No shared constants, and nothing imported from another test.
  - Use rates and sizes that multiply exactly (for example size 10, rate 2, rate 0.5), so
    `toBe` is safe and no float tolerance is needed.
- [x] B2. Cases, each stating its numbers in the test:
  1. No rules gives `[]`.
  2. One `all` rule with one master of two sub-products gives two rows. Each has `amount =
     size * storedRate`, `treated = size` and the given `servId`.
  3. `lte` matches when `size` equals `rule.size`, and when it is smaller. It does not match
     when `size` is larger.
  4. `gt` does not match when `size` equals `rule.size`. It matches when `size` is larger.
  5. Two rules, one matching and one not: only the matching rule's master counts.
  6. A master on two matching rules counts twice (this keeps the old behaviour, so it is pinned
     on purpose).
  7. A master id with no entry in the map is skipped, and the other masters on the rule still
     count.
  8. A master with no sub-products gives no rows.
  9. The same sub-product on two masters of one rule gives two rows (the caller groups them).
  10. Row order: rules in order, masters in their listed order, sub-products in their listed
      order.
  11. `size` 0 gives rows with `amount` 0 and `treated` 0.
- [x] B3. Ran `npx vitest run src/__tests__/realGreen/product` (the `write-tests` skill says to
  run the test you wrote; this is not a build or a dev server). Result on 2026-11-23: 2 test
  files, 15 tests, all passed. Luke can re-run it.
- Deviation from B1: the tests are two files plus a helper, not one file, to keep each file
  small: `getPlannedProducts.sizeRules.test.ts` (which rules match: cases 1, 3, 4 and 5, plus
  an explicit 'all' case; 8 tests) and `getPlannedProducts.rows.test.ts` (the rows a matching
  rule gives: cases 2 and 6 to 11; 7 tests), with `plannedProductTestHelpers.ts` holding the
  `masterMap` and `rule` helpers and the `SERV_ID` constant (shared plumbing only, no sample
  data). Total 15 tests. The file names follow the `<Subject>.<behavior>.test.ts` pattern from
  the `write-tests` skill.
- No old-versus-new comparison test (decided in 05).

### C. bizPlan (4 sites)
- [x] C1. `bizPlan/types/inventoryTypes.ts`: `EnrichedAppProduct` as described under "Row type in
  bizPlan". Update its doc comment.
- [x] C2. `bizPlan/selectors/inventorySelectors.ts`, three selectors:
  - `selectProductUsagePlanned`: add `productSelect.productMasterDocMap` to the input selectors.
    Replace the `loadoutBaseToAppProductCore(...)` call with `getPlannedProducts({ servId:
    service.servId, size: service.size, productRuleDocs: service.servCode.productRuleDocs,
    productMasterDocMap })`. The `.map((core) => ({ ...core, productCommon, servId, ... }))` body
    stays as it is.
  - `selectProductsMixedActualPlanned`: the same change in the `else` branch (services that are
    not completed). The completed branch still reads `production.usedAppProducts` (step 7
    renames it).
  - `selectProductComparison`: add `productMasterDocMap` as an input. `buildUsageMap` calls the
    function. Update the comment that names `loadoutBaseToAppProductCore`.
  - Remove the `loadoutBaseToAppProductCore` import. Block-body callbacks keep full names
    (`(service) => ...`, `(core) => ...`).
- [x] C3. `bizPlan/selectors/createInventorySelectors.ts`: `createProductUsagePlannedSelector`
  gets the same change as `selectProductUsagePlanned`. Remove the import.

### D. Cover sheet: remove planned products, leave placeholders
Read the `pdf-document` skill and `src/lib/pdf/pdf.readme.md` first.
- [x] D1. `CoverSheetCard.tsx`:
  - Delete the local `getPlannedAppProductTotal`, and the `productCommonMap` selector, the
    `useSelector`, `productSelect`, `loadoutBaseToAppProductCore`, `baseProductCommon` and
    `AppProduct` imports that only it used. Keep `Fragment`, `Number` and `LandPlot` (other
    variants use them). Check each import with a search before removing it.
  - Header, `variant === "products"` branch: keep the branch, return an empty
    `<CardDescription>` holding the placeholder comment.
  - Per employee, `variant === "products"` branch: keep the branch and the employee box with the
    employee id, and replace the product grid with the placeholder comment.
- [x] D2. `coverSheets/[routeDate]/page.tsx`:
  - Delete `getPlannedAppProductTotal` and its prop from `RouteDatePage`, `CoverSheetsPDFProps`,
    `CoverSheetViewer` and `CoverSheetsPDF`.
  - Delete the `productCommonMap` selector and prop (`ReturnType<typeof productSelect...>` goes
    with it), and the `productSelect`, `loadoutBaseToAppProductCore` and `baseProductCommon`
    imports. Keep the `AppProduct` import (line 426).
  - Totals per service code (the `SERV_CODE_PRODUCTS` rows): delete `plannedAppProductTotal`
    and the `filtered` list. Keep the cell that held the product lines as an empty `<View>` with
    the placeholder comment, so the row layout does not shift.
  - Products per service: delete `pcMap`, `products` and `filtered`. Keep the `PRODUCTS` `<View
    style={tw("flex flex-col w-[100px]")}>` as an empty view with the placeholder comment. Its
    width keeps the other columns where they are.
  - A react-pdf `View` with no children is valid. Never pass `tw()` an empty string.
  - The Water filter goes with the code it filtered: it was applied only to planned products.
- [x] D3. `coverSheets/page.tsx`: no change (see "Decisions made while planning").
- [x] D4. Search `src/app/scheduling/coverSheets` for `loadoutInventory`,
  `loadoutBaseToAppProductCore`, `getPlannedAppProductTotal`, `productCommonMap` and
  `PLACEHOLDER: planned products`. The first four give nothing. The last gives exactly four hits:
  the card's header and per-employee branches, and the PDF page's totals per service code and
  products per service.

### E. Monthly Inventory (all under `src/app/inventory/` unless a path is given)
- [x] E1. `InventoryTypes.ts`: remove `dateRange` from `InventorySession`, the `InventoryPrediction`
  type and the `TRange` import.
- [x] E2. `inventorySelect.ts`: remove `selectSessionDateRange`, `selectProductIdsFromServices`,
  `selectPredictions` and their keys in `inventorySelect` (`sessionDateRange`,
  `productIdsFromServices`, `predictions`). Also remove `selectLastCheck` and the `lastCheck` key:
  after these removals nothing reads them (only the By Date tab and the predictions did). Remove
  the `centralSelect` and `InventoryPrediction` imports.
- [x] E3. `inventorySlice.ts`: remove the `setDateRange` reducer and the `TRange` import. Drop
  `dateRange: null` from `initialSession` and from `clearSession`.
- [x] E4. `useInventory.ts`: remove `setDateRange` and the `TRange` import.
- [x] E5. `src/lib/inventory/inventorySessionStorage.ts`: `loadInventorySession` returns only
  `{ activeProductIds, counts }` from the stored session. A session saved earlier today still
  carries a `dateRange`. Without this it would be restored into state and saved back: harmless,
  but a field no type knows. Update its doc comment.
- [x] E6. `useInventoryDeps.ts`: remove `useCustomerContext`, `useProgServ`,
  `useRecentProduction`, `INVENTORY_CONTEXTS`, the `CustomerContextMode` import and the
  `dateRange` selector. Keep `useProduct`, `useInventory({ autoLoad: true })` and the session
  restore effect. Reword the `useProduct` comment: it now loads products for the Manual tab and
  the lists, not for production hydration. `useSelector` stays (it reads `prevSessionChecked`).
- [x] E7. `page.tsx`: remove the `predictions` selector, `predictionMap`, the `predictionMap`
  prop of `ProductListAccordion`, the `prediction` prop passed to `ProductListRow`, and the
  `InventoryPrediction` import. `ProductCount` and `dateStrings` stay (used elsewhere in the
  file).
- [x] E8. `_components/ProductListRow.tsx`: remove the `prediction` prop, `plannedDisplay`,
  `recordedDisplay`, the "Planned:" and "Recorded:" block and the `InventoryPrediction` import.
- [x] E9. `_components/SelectProductsSheet.tsx`:
  - Delete `ByProductionDateTab` and its props type.
  - Remove the "By Date" trigger and content. The tab list goes from 5 columns to 4:
    `grid-cols-5` becomes `grid-cols-4`. `Tabs defaultValue` becomes `"lastCount"`.
  - Remove the now-unused imports: `DateRangePicker`, `TRange`, `Loader2`, `Search`,
    `uiSelect`, `AppState`, `dateStrings`. Keep `PackageSearch`, `Input`, `Checkbox`, `useState`
    and `productSelect` (the Manual tab uses them). Check each with a search first.
  - Update the "5 fit on a phone" comment above the tab list.
- [x] E10. Search `src/app/inventory` and `src/lib/inventory` for `sessionDateRange`,
  `productIdsFromServices`, `predictions`, `setDateRange`, `InventoryPrediction`,
  `loadoutInventory` and `usedAppProducts`. All give nothing. (The two docs under
  `inventory/docs/` still name them and are updated in step 6.) The slice and the history page
  need no other change.

### F. Delete
- [x] F1. Search `src` for `loadoutBaseToAppProductCore`. The only hits left are the file itself
  and a comment in `useAppProducts.ts` (that file goes in step 2). Then delete
  `src/app/realGreen/customer/selectors/loadoutBaseToAppProductCore.ts`.
- [x] F2. `hydratePlannedLoadout.ts` stays: `centralSelectors.ts` still calls it, and
  `getProductMasters` is used by `loadoutStartSelect.ts`. Both go in step 2.

### G. Check
No `ide_*` tools are available in this session, so checks are by search and by reading.
- Result 2026-11-23: G1 and G2 done. Every edited file was re-read; every import that was
  removed has no remaining use, and every name still used is imported. The searches for the
  removed exports (G2) find hits only in `.md` docs (`inventory/docs/`, step 6) and in unrelated
  `setDateRange` slices in other features. Not settled by search, left to `tsc` (G3): that the
  `ReadonlyMap<number, PlannedProductMasterDoc>` parameter accepts
  `Map<number, ProductMasterDoc>`, and that actual rows still fit the narrowed
  `EnrichedAppProduct`.
- [x] G1. For every created or edited file: re-read it in full after the edit, and for each
  import confirm with a search that the imported name is still used (`noUnusedLocals` is on) and
  that each name still used is imported. List any file where this could not be settled.
- [x] G2. Search `src` for every removed export and prop and confirm no importer is left:
  `getPlannedAppProductTotal`, `loadoutBaseToAppProductCore`, `InventoryPrediction`,
  `sessionDateRange`, `productIdsFromServices`, `predictions`, `setDateRange`, `prediction=`.
- [ ] G3. Luke runs `npx tsc --noEmit`. Triggers: a shared type changed (`EnrichedAppProduct`,
  `InventorySession`), exports were removed (the `inventorySelect` keys, `setDateRange`,
  `loadoutBaseToAppProductCore`), and component props were removed (`prediction`,
  `getPlannedAppProductTotal`, `productCommonMap`).
- [ ] G4. Luke tries it on the sandbox (`sgSandbox`; no backup needed, because this step changes
  no stored data):
  - bizPlan products page: the product list loads, totals show, the by-servCode view opens, and
    there is no row with the base product's placeholder text.
  - A servCode whose master has no default package: its planned amount equals the old number.
    Numbers change only for masters with a default package (accepted in 05).
  - Cover sheets list page: all three views open. "Products" shows cards with no products.
  - Cover sheet PDF for a date: it generates with no error and the other columns line up. The
    history section (products used on completed services) still lists products.
  - Monthly Inventory: the page and the history page load without a customer or service request
    in the network tab. The Select Products sheet opens on "Last Check" with four tabs. A count
    can still be added, saved and seen in history.

## For Luke (open, small)
None open. The one earlier item, whether `useRecentProduction.ts` is deleted in step 2 and not
now (the loadout report still calls it), was confirmed by the step 2 scan. What is left for
Luke on this step is G3 and G4 above, and looking at the cover sheet PDF (its layout was not
viewed). The to-do list is in `05_FullStateSandboxSetup.md`, "Open questions".

## Differences from 05
Found while planning. 05 was updated to match.
1. Cover sheet: 05 said the cover sheet sites move onto the function. Luke decided instead to
   remove planned products from the cover sheet and leave placeholders. So the function has four
   callers (bizPlan), not seven, and the cover sheet needs no `CoverSheetProduct` type or helper.
2. `loadoutBaseToAppProductCore.ts` has no importer once the sites move or empty, so it is
   deleted in step 1.
3. 05 says the function takes "the servCode's rules". It takes the rule *docs*
   (`service.servCode.productRuleDocs`) and a narrow master doc type, so it does not depend on
   hydrated `ProductRule.productMasters`. Step 5 therefore does not touch it.
4. `useRecentProduction.ts` is left with one importer (the loadout report) after this step and is
   deleted in step 2 (proposed in 05, not yet confirmed).
5. A session saved earlier the same day still holds a `dateRange`. `loadInventorySession` drops
   it (E5).

## Done when
Every box above is ticked, `npx tsc --noEmit` and `npx vitest run src/__tests__/realGreen/product`
pass, the sandbox checks in G4 pass, and the results are noted under "Progress" in
`05_FullStateSandboxSetup.md`. Deploy is optional at this point: the step stands alone, but
forecast numbers change as soon as it is deployed.