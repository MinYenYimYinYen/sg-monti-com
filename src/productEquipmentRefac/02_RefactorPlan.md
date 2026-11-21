# 02 Refactor Plan: Product, Loadout and Equipment

Status: draft plan with open questions. No code changed. This file stands on its own.

## Required reading
- This file only. Do not read `00_InitialConversation.md` or `01_InitialConversation.md`. They are
  superseded, and some of their statements are corrected here.
- To settle an open question, read only the code that question names.
- When implementation starts: the `data-module`, `permission` and `product-module` skills.

## Before implementation starts
- Luke enters the latest inventory counts by hand in Monthly Inventory first. The agent reminds
  him and waits for his go-ahead before changing anything Monthly Inventory reads.

## Goals
1. Remove the loadout feature and the types and data it orphans.
2. Correct the parts of the selector tree we touch.
3. Remove the current equipment types and data.
4. Leave the way clear for an equipment maintenance module. Nothing is built for it here.
5. Keep the mix chart working.
6. Keep the product forecast, with the service as the unit that consumes products.

## Decisions
- Loadout goes: `src/app/loadout/`, `src/app/scheduling/dailyInventory/`, `src/app/machines/`.
- `Equipment` and equipment packages go, stored data included.
- Nothing replaces `Equipment`. The mix chart picks a saved app method directly. If a tank-level
  feature is needed later, it is a flat `SprayTank` module, built then.
- The forecast has no water row.
- `ProductRule` holds master ids only, not hydrated masters.
- Product knowledge leaves the central customer hydration. Features that need it build their own
  selectors from the product module. (One part is still open: question 1.)
- Base objects stay as the fallback for a missing join. Features load what they need through
  their Deps hooks.
- Monthly Inventory will be replaced later by a QBO-backed module. Not part of this refactor.
- No old-vs-new comparison test.
- Luke drops the `loadoutdocs` collection himself.

## Decided against: SprayTankMeta
- Considered: a module describing a class of spray tanks, to replace `Equipment` as the mix
  chart input. Dropped.
- Why: the chart needs only an app method and a gallons / fl oz choice. A picker of saved app
  methods and a toggle cover both.
- Lost: the tank name as the picker label and printed chart title (question 7), and the
  remembered fl oz setting. The toggle is set on each visit, like the rest of the chart setup.
- Gained: no new data module, no app method delete guard, and any saved method can be picked.
  Today only a tank's default method can.
- Revisit when a feature needs a tank property such as capacity. Build it then as a flat module
  outside `src/app/equipment/`.

## Answer: does the mix chart need Mixture?
No. The mix chart never imports the `Mixture` class.
- `Mixture` and `LoadoutConstituent` exist for loadout: start and finish amounts and scaling by
  what the tech used. Only loadout code reads them.
- The mix chart has its own flat version of the idea in `mixChart/_lib/mixChartUtils.ts`: product
  rows with a rate per ksf, and a water rate derived from the app method's coverage minus the
  liquid products. That code is kept.
- What the mix chart does take from code being removed: the `Equipment` type and picker
  (5 files), `useEquipment`, and `buildWaterUnitConfig` from `equipment/waterProduct.ts`.

## Target design

### Selector tree after the refactor
    appMethodDocs -> appMethodMap
    productSubDocs + unitConfigMap -> productSubs
    productMasterDocs + productSubsMap + unitConfigMap -> productMasters
    masters + singles + subs -> allProductsMap
    progServ docs + priceTables + assignment plan + employees -> progCodes -> servCodes
    servCodeMap + other inputs -> customers -> programs -> services

- Today any equipment, package, app method or unit config change rebuilds masters, then
  servCodes, then the whole customer tree. Afterwards nothing in this tree depends on app
  methods, and no product change rebuilds servCodes.
- `allProductsMap` is still an input of the customer tree unless question 1 removes it.

### Planned products
- One pure function: given a service's size, its servCode's rule docs and the master docs, it
  returns one row per sub-product with `amount = size * storedRate`.
- Rule matching is unchanged: every rule whose size condition matches contributes its masters.
- Nothing is stored on `Service`. `loadoutInventory` is removed from `ServiceProps`.
- Callers: bizPlan (4 sites), cover sheets (2 sites), and Monthly Inventory (2 sites, question 3).
- `SubProductConfig.rate` and `hydrateRate` go. `hydrateRate` only returns `storedRate`.

### Mix chart
- The equipment picker becomes a picker of saved app methods. Picking one loads it into the
  method editor, as picking a tank does today, and Reset reloads it.
- In `MixChartConfig`, `equipment` is replaced by the picked app method and a `showFlOz` flag.
  The flag is set by a gallons / fl oz toggle on the chart, defaults to gallons, and is not
  saved. Nothing in the chart setup is saved today.
- The chart title comes from the app method description (question 7).
- Chart math and PDF layouts do not change.
- `buildWaterUnitConfig` and the water product id move into `mixChart/_lib/`.
- `AppMethod.needsWater` stays. The chart uses it to default "Include Water".

### Product rules and masters
- `ProductRule` = `ProductRuleDoc` plus `desc`. The `productMasters` property goes, and
  `progServSelect` stops taking `productMastersMap` as an input.
- `ProductMaster` loses `equipmentPackageIds`, `defaultPackageId`, `equipmentPackages` and
  `defaultPackage`. `SubProductConfigDoc` becomes `subId` plus `storedRate`.
- `productSubs` and `productMasters` stop taking `appMethodMap` as an input.

### App methods
- `tracksTankLevel` is removed (type, model, create form and its slice). Only loadout read it.
- Nothing references an app method afterwards, so the delete guard goes: the
  `checkDependencies` op, the `clearReferences` option, and the dependency and affected-product
  sections of `AppMethodDeleteSheet`. Delete becomes a plain confirm.
- `getAffectedProducts` goes with it.

## What breaks, and what replaces it
| Removed | What stops working | Replacement |
|---|---|---|
| Loadout feature | Start and finish loadout screens, feedback, loadout report, the "Loadout" nav entry | None. Intended. |
| `Service.loadoutInventory` | bizPlan forecast (4 sites), cover sheet card and PDF (2 sites), Monthly Inventory planned usage and product suggestions (2 sites) | Planned products function |
| Water row in planned products | A row with product id -2 that resolves to the base product in bizPlan and the cover sheet card | None. The row disappears. |
| `Equipment` | Mix chart picker, chart title, stored water unit choice | App method picker, title from the app method, gallons / fl oz toggle |
| `Equipment` | App method delete guard | None needed. Nothing references an app method. |
| `Equipment` | Equipment modal in the products footer | None |
| Equipment packages | Packages tab and default package in the master editor, the `saveMasterEquipmentPackages` op, the Packages modal | None |
| `mixedByEquipmentIds` | "Mixed By" checkboxes on a master's sub-products | None |
| Hydrated masters on rules | `ServiceUtils.productRuleCompliance` | Question 5 |
| `machines/` | Truck and ride-on pickers, which only loadout uses | None |

## Removal list
- `src/app/loadout/` (7 files, about 1,050 lines)
- `src/app/scheduling/dailyInventory/` (65 files, about 6,300 lines)
- `src/app/equipment/` (21 files, about 1,470 lines)
- `src/app/machines/`
- `hydratePlannedLoadout.ts`, `loadoutBaseToAppProductCore.ts`, `useAppProducts.ts`,
  `hydrateRate.ts`, `getAffectedProducts.ts`
- Reducers: `loadout`, `loadoutStart`, `loadoutFinish`, `loadoutReport`, `equipment`,
  `equipmentPackage`
- Capabilities: `loadouts`, `equipmentDefinitions`, `equipmentPackages`,
  `masterEquipmentPackages`
- `src/app/realGreen/product/bkp/*.json`: three production exports tracked in git. Deleting them
  leaves them in git history.
- The unused `WATER_PRODUCT_ID` import in the product route

## Files that change
- Customer tree: `ServiceTypes.ts`, `centralSelectors.ts`, `baseService.ts`,
  `_builders/makeCustomer.ts`, `ServiceUtils.ts`
- Forecast callers: `bizPlan/selectors/inventorySelectors.ts`, `createInventorySelectors.ts`,
  `coverSheets/_lib/components/CoverSheetCard.tsx`, `coverSheets/[routeDate]/page.tsx`,
  `inventory/inventorySelect.ts`
- Product module: `productSelectors.ts`, `ProductMasterTypes.ts`, `baseProduct.ts`,
  `ProductDocPropsModel.ts`, `ProductContract.ts`, product `route.ts`, `productSlice.ts`,
  `useProduct.ts`, `MasterEditPanel.tsx`, `MasterSubConfig.tsx`, `MastersTab.tsx`,
  `ProductsFooter.tsx`
- Rules: `ProductRule.ts`, `hydrateProductRules.ts`, `progServSelect.ts`
- Mix chart: `page.tsx`, `MixChartSetup.tsx`, `AppMethodOverrideSection.tsx`,
  `MixChartTypes.ts`, `mixChartUtils.ts`
- App method: `AppMethodTypes.ts`, `AppMethodModel.ts`, `api/route.ts`, `AppMethodContract.ts`,
  `AppMethodDeleteSheet.tsx`, `appMethodSlice.ts`, `useAppMethod.ts`, and the create form files
  that set `tracksTankLevel`
- Shared: `store/reducers/index.ts`, `NavMenu.tsx`, `permission/groups/scheduling.ts`,
  `permission/groups/realGreenProducts.ts`
- Docs: the type naming examples in `AGENTS.md`, the `product-module` and `mongo-read` skills,
  the inventory and assignment docs that mention loadout

## Stored data
- Collections with no reader afterwards: `loadoutdocs`, `equipment`, `equipmentpackages`.
- Fields with no reader afterwards: on `productdocprops`, `equipmentPackageIds`,
  `defaultPackageId` and `subProductConfigDocs[].mixedByEquipmentIds`; on `appmethods`,
  `tracksTankLevel`.
- Nothing is migrated. The three equipment docs are not carried forward.
- Leftover fields are harmless. Proposed: Luke drops the collections; the fields are left alone.

## Proposed order
Each step leaves the app compiling.
1. Planned products function. Move the forecast callers onto it and remove `loadoutInventory`
   from `Service`. Luke enters inventory counts before this step.
2. Delete the loadout feature and everything only it uses.
3. Switch the mix chart to the app method picker and remove the app method delete guard.
4. Delete equipment and packages, including the master editor tab and the "Mixed By" control.
5. Rules hold ids; remove the unused selector inputs.
6. Docs, skills, stored data.

Step 1 comes before the deletion because `LoadoutBase` is a property of `Service`. Loadout cannot
be deleted until its five outside readers stop using that property.

## Open questions
1. Products used on a completed service. Today `production.usedAppProducts` rows each carry the
   hydrated product, built inside the central customer hydration. Keeping that means
   `allProductsMap` stays an input of the customer tree, so a product or unit config edit still
   rebuilds it (app method and equipment edits no longer do). Seven files read `.productCommon`
   on these rows or on planned rows built in the same shape. Recommendation: keep the
   hydration, and rename the hydrated side only:
   `usedAppProducts` to `productsUsed`, `AppProduct` to `ProductionProduct`,
   `AppProductCore` to `ProductionProductCore`. Leave the stored key `usedAppProductCores`
   alone, because it is on every mirrored service document. Rename now, or later?
   1. Luke says: This can be renamed as well.  But when we do that, I must do a full resync of the mirror.
2. Planned row type. Today the forecast builds planned rows in the "product used" shape, with an
   empty `method`. Recommendation: the planned products function returns its own type,
   `PlannedProduct` (`productId`, `servId`, `amount`, `treated`), and bizPlan keeps its own
   combined row type for the actual-plus-planned views. Agree?
   1. Luke says: yes
3. Monthly Inventory. Recommendation: repoint its two reads at the planned products function so
   it keeps working until the QBO module replaces it. Or should it be removed in this refactor?
   1. Luke says: The dependencies here are for choosing which products to inventory.  Please confirm that's correct.  If it is, we can simply remove those ways of choosing which products to inventory from the inventory module.  That's a clean decoupling, and it's not really needed anyway since I'll be rebuilding the inventory module from the ground up in the near future.
4. Forecast numbers. Today a sub-product tagged to equipment outside its master's default package
   is left out of the forecast, and one tagged to two pieces of equipment in the same package is
   counted twice. Afterwards every sub-product on a matching master counts once. Accept?
   1. Luke says: Yes.
5. `ServiceUtils.productRuleCompliance` (did a completed service use every sub-product its rule
   expects?). Only loadout feedback and the loadout report read it. Recommendation: remove it
   with loadout. Or keep it as a pure function for a later feature?
   1. remove
6. `ProductSubDocProps.appMethodId` has no reader. Remove it in this refactor?
   1. Yes
7. Mix chart labels. The picker and the printed title will show the app method description
   instead of a tank name. Are the app method names clear enough for that? Recommendation: add
   an editable title field to the chart only if they are not.
   1. The names are clear.  But a mix chart should still have an editable title.

## Not verified
- Anything in Mongo (no database tool in the discovery sessions): the app method names, what
  `equipment` and `equipmentpackages` hold, whether any master has the taggings in question 4, and
  whether stored capability bundles or user capabilities hold the capability keys being removed.
- `dailyInventory` internals. Not read, because all of it is removed.
- How the bizPlan tables display the base-product water row today.
- `MastersTab.tsx`, `productSlice.ts` and `useProduct.ts`: matched by search for package fields,
  not read.
- Which app method files set `tracksTankLevel`: 8 files under `src/app/appMethod/` match
  `needsWater` or `tracksTankLevel` by search. Only the type and the route were read.
- `appMethodSlice.ts` and `useAppMethod.ts`: not read. They are assumed to hold the dependency
  check that the delete sheet calls.
- That the mix chart already has app methods loaded once `useEquipment` is gone. A comment in
  `useInventoryDeps.ts` says `useProduct` loads them; the hook itself was not read.
