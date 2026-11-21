# 00 Initial Conversation: Product & Equipment Refactor

Status: discovery. No code changed yet.
Layout: numbered conversation docs in this folder; action plans in `actionPlans/`.

## Goal
- Remove the unused Loadout feature.
- Stop the product/loadout design leaking into `Service` and `centralSelectors`.
- Build equipment maintenance tracking without tying it to the product code.
- Keep: AppMethod solver, mix charts, product forecast (bizPlan), monthly inventory, cover sheets.

## Findings

### 1. Loadout is a form shape stored on the core entity
- `ServiceProps.loadoutInventory: LoadoutBase` is hydrated for every service in
  `centralSelectors.ts` via `hydratePlannedLoadout`.
- `LoadoutBase` carries start/finish amounts, a `Mixture` class instance, and full
  product, unit and app method objects.
- `LoadoutTypes.ts` imports `Service` and `ServiceTypes.ts` imports `LoadoutBase` (a cycle).

### 2. Surviving consumers only need a flat list
All reduce the tree to `AppProductCore`-like rows (`productId`, `amount`, `treated`):
- `src/app/bizPlan/selectors/inventorySelectors.ts` (3 call sites)
- `src/app/bizPlan/selectors/createInventorySelectors.ts`
- `src/app/scheduling/coverSheets/_lib/components/CoverSheetCard.tsx`
- `src/app/inventory/inventorySelect.ts` (walks the tree by hand, 2 places)

The first three go through `loadoutBaseToAppProductCore.ts`.
Also touched: `baseService.ts`, `src/_builders/makeCustomer.ts` (both use `baseLoadout`).

### 3. Forecast math does not need equipment
- Sub-product amount = `size * config.rate`, with or without equipment.
- Equipment/package/appMethod only produce the water row (appMethod coverage * size,
  minus volumetric solutes) and the loadout UI grouping.

### 4. Joins are done by nesting, and repeated
- `ServCode.productRules[].productMasters[]` -> `equipmentPackages[].equipments[].appMethod`
  and `subProductConfigs[].subProduct` / `mixedByEquipments[]`.
- `Equipment` is hydrated in three places: `equipmentSelect`, `equipmentPackageSelect`,
  and again from docs in `productSelectors.hydrateEquipmentPackages`.
- Product imports equipment; `equipment/waterProduct.ts` imports product (circular).
- `calcTotalMixFlOz` is duplicated in `hydratePlannedLoadout.ts` and `mixChartUtils.ts`.
- `hydrateRate.ts` now only returns `storedRate`.
- `Equipment.mixedProductIds` and `SubProductConfigDoc.mixedByEquipmentIds` look like the
  same relationship stored twice (unverified).

### 5. What a normal-join design looks like
Flat modules joined in selectors or pure functions where needed:
- product (one type with `productType`, not three hierarchies)
- unit config, keyed by `productId` (already its own slice)
- master recipe: master -> `{ subProductId, ratePerKsf }[]`
- product rule: servCode + size -> master ids (exists)
- app method (exists, standalone)
- applicator (today's `Equipment`): app methods + `showFlOz`

Planned use = `plan({ size, servCode })` -> flat rows. Computed by the features that
need it, not stored on `Service`.
Proof it works: `mixChart/_lib` already runs on flat rows plus an `AppMethodResult`.

### 6. "Equipment" is two concepts
- `src/app/equipment`: applicator configuration, part of the product code.
- `src/app/machines/MachineTypes.ts`: hardcoded trucks and Toros, used only by
  `dailyInventory` headers (`ChooseTruck`, `ChooseRideOn`).

Maintenance tracking wants the second. Hypothesis, needs confirming (open question 1).

## What goes when Loadout goes
- `src/app/loadout/` (all 7 files)
- `src/app/scheduling/dailyInventory/` (UI, api route, `LoadoutContract`, `LoadoutDocModel`,
  start/finish/feedback/report slices)
- Reducers `loadout`, `loadoutStart`, `loadoutFinish` in `src/store/reducers/index.ts`
  (check for a report slice too)
- NavMenu "Loadout" entry; `can.loadouts` in `src/permission/groups/scheduling.ts`
- `hydratePlannedLoadout.ts`, `loadoutBaseToAppProductCore.ts`, deprecated `useAppProducts.ts`
- Likely dead afterwards: `AppMethod.needsWater`, `AppMethod.tracksTankLevel`,
  equipment packages, `ProductMaster.defaultPackage`
- `src/app/realGreen/product/bkp/*.json` look like data exports committed to the repo

## What stays
- `src/app/appMethod/appMethodSolver/` and `appMethodCreate/` (depend only on unit types)
- `src/app/realGreen/product/mixChart/` (needs `Equipment.appMethod`, `showFlOz`,
  `buildWaterUnitConfig`)
- `unitConfig/` (`UnitUtils`, `UnitMath`, `UnitConfigDisplay`)

## Proposed stages (one action plan each, none written yet)
1. `actionPlans/01_decoupleServiceFromLoadout.md`: pure `planServiceProducts`, move the
   four consumers, remove `loadoutInventory` from `ServiceProps`, builder and base.
2. `actionPlans/02_removeLoadoutFeature.md`: the deletion list above.
3. `actionPlans/03_equipmentMaintenance.md`: physical-asset module, replaces `machines/`.
4. `actionPlans/04_flattenProductModule.md` (optional): recipe module, single Equipment
   hydration, break the product <-> equipment cycle, rename applicator.

After stage 1, stage 2 is mostly deletion. Stage 3 never touches product code, so it does
not have to wait for stage 4.

## Open questions
1. Are `Equipment` docs individual physical units (for example "Toro 3's tank") or kinds of
   applicator? This decides whether maintenance gets a new asset module or extends the
   existing one.
   1. There are only three equipment docs in the db.  They represent tanks which were used in the chain of types needed to create the loadout module.
   2. The type shape was created with the loadout module as its only consumer, I believe
   3. The semantic choice of the type name was a mistake.  I think we can safely remove the stored data and the current equipment concept completely before rebuilding an equipment maintenance module.  In the future if I ever want to track tank mix concepts to a piece of equipment, I would make a MixTank data module and key it to a piece of equipment.  Flat collections.
      1. This should be verified.
2. Does the forecast need the water row that `loadoutBaseToAppProductCore` emits?
   1. It does not NEED the water row.  But the Mixture concept could still be valuable, and a mixture would include water, which I suppose would share some properties of a product, but is not really a product.  If I was purchasing water it would be no different than a product.
3. Keep the stored loadout collection in Mongo, or drop it later?
   1. The store loadout collection can be removed.  It should become a todo item for me.
4. Are equipment packages used by anything except the loadout UI?
   1. No.
5. Tests: lock stage 1 with an old-vs-new comparison test before removing the old path?
   1. Probably not needed.
6. Folder name: the `&` in `product&equipmentRefac` needs quoting in every PowerShell
   command. Keep it, or rename to `productEquipmentRefac`?
   1. rename is fine
7. Which action plan gets written first? Stage 1 is the suggested start.
   1. Not sure yet.  The answers to these questions may affect the staging plan.
   2. My preference would be to start be removing the loadout feature, but I still don't know how deep that goes.  We'd start be removing what we know we're not keeping.
      1. I don't want to break the mix chart tool.  But if we have to break it, we also have to re-invent it, which would be another side mission.
         1. Similarly - the coverSheet module should be using mix chart logic, but it does not, so another side mission is standardizing the expected products for a given service.
      2. Then, we'd re-folder and also consider some renaming as well.  For example, AppProduct is a bad name.  And detangling it from centralSelectors.ts (ServiceProps type) is something to consider.  Not saying it's necessary.
8. Up for discussion
   1. the hydration strategy for customer,program,service in centralSelectors.ts
      1. The original strategy was to hydrate everything we could tie to a customer, program, or service.  Hydrating realGreen entities for sure makes sense.  Hydrating native entities became a problem sometimes, resulting in tight coupling we're experiencing now.  The DocProps suffix types are a convention that is currently defined but I no longer think it's a good clean way to extend the realGreen api.  It works for realGreen types because the api is stable.  But this project will be under constant development because it's my personal sandbox.  So we need to keep our stuff well segregated and build features that combine types with createSelector as needed, rather than fully integrating native concepts with realGreen concepts in centralSelectors.ts.  The awkward gray area here is the realGreen api gaps we had to fill, like with units and the distinctions between master, sub, and single variants of Product type.  Fixing all of this is beyond the scope of the current refactor, but it should be known during this refactor that some of the currently implemented conventions won't prevail.

## Not yet verified
- That `progServSelect.servCodes` rebuilds when equipment/appMethod/unit config change
  (it would invalidate the whole customer tree).
- How bizPlan treats `WATER_PRODUCT_ID` rows.
- Permission bundles that reference `can.loadouts`.
- `UnitConfigDisplay` internals and the three-context conversion design.

## Required reading for the next session
Stage 1 (read these, nothing else):
- `src/app/realGreen/customer/selectors/hydratePlannedLoadout.ts`
- `src/app/realGreen/customer/selectors/loadoutBaseToAppProductCore.ts`
- `src/app/inventory/inventorySelect.ts` (lines 60-145)
- `src/app/bizPlan/selectors/inventorySelectors.ts` (around lines 35, 471, 542)
- `src/app/realGreen/progServ/_lib/types/ProductRule.ts`
- `src/app/realGreen/product/_lib/types/ProductMasterTypes.ts`

Stage 3:
- `src/app/machines/MachineTypes.ts`, `src/app/equipment/EquipmentTypes.ts`
- `data-module` and `permission` skills
