# 01 Initial Conversation: Scope After First Answers

Status: discovery. No code changed. Where this disagrees with 00, this wins.

## End goals
1. Remove the loadout feature and the types and data it orphans.
2. Correct the parts of the selector tree we touch.
3. Remove the current equipment types and data.
4. Prepare for an equipment maintenance module.
5. Keep the mix chart.
6. Keep product forecasting, with the service as the unit that consumes products.

## Decisions carried from 00
- Today's `Equipment` is a tank concept built for loadout and misnamed. It goes, data included.
  A future `MixTank` module would be a flat collection keyed to a piece of equipment.
  - Luke says: We'll call this concept `SprayTank` instead.
    - In the spirit of ServCode/Service relationship, we'd want SprayTankMeta as a metadata type that defines the default properties of a class of spray tanks. SprayTankMeta would be the replacement of current Equipment role as inputs for our mix chart.
    - Assess this idea and advise on its merits or lack thereof.
- Equipment packages go.
- The forecast does not need a water row. `Mixture` may come back later; it is not kept now.
  - Luke says: The mix chart does need the Mixture concept, right?  We need to track what breaks and needs refactoring as we decouple the concepts we're removing and replacing.
    - When we get to implementation we need an idea of what will break and what we need to re-implement (build back better).
- The `loadoutdocs` collection can be dropped. Todo for Luke.
- No old-vs-new comparison test.
- Folder renamed to `productEquipmentRefac`.
- Direction: native concepts are joined in feature selectors with `createSelector`, not hydrated
  onto `Service` in `centralSelectors.ts`. `DocProps` stays for stable RealGreen extensions only.

## Verified in code

### Selector tree
    appMethodDocs -> appMethodMap
    equipmentDocs + appMethodMap -> equipments -> equipmentMap
    equipmentPackageDocs + equipmentMap -> equipmentPackages -> equipmentPackageMap
    productSubDocs + unitConfigMap + appMethodMap (unused input) -> productSubs
    productMasterDocs + subsMap + unitConfigMap + appMethodMap + equipmentMap
        + equipmentPackageMap -> productMasters -> productMastersMap
    masters + singles + subs -> allProductsMap
    productMastersMap + progServ docs + priceTables + assignment plan + employees
        -> progCodes -> servCodes
    servCodeMap + allProductsMap + 16 other inputs -> customers -> programs -> services

- Confirmed: a change to any equipment, package, app method or unit config rebuilds
  `productMasters`, then `servCodes`, then the whole customer tree.
  - Luke says: This is what we should decouple from centralSelectors.ts and consumers that need product knowledge will need to createSelectors by importing from products. I think it's justifiable to take this realGreen element out of central because we're going to be doing so much native work with these.
- `productSubs` takes `appMethodMap` as an input it never reads, so subs rebuild on every
  app method change.
- `Equipment` is hydrated twice with different rules. `equipmentSelect` falls back to
  `baseAppMethod`; `hydrateEquipmentPackages` in `productSelectors.ts` rebuilds it from the
  already hydrated maps and drops equipment whose method is missing.
  - Luke says: base objects are a convention I want to keep.  It prevents null checks everywhere, and it's falls on use when building a feature to call the required Deps hooks to hydrate data.
- `hydrateRate` returns `storedRate` and ignores its `appMethodMap` argument.

### Type relationships
- `Service.loadoutInventory: LoadoutBase` is the only link from the customer tree to loadout,
  equipment, packages and `Mixture`. `LoadoutTypes.ts` imports `Service` back (cycle).
- `ServCode.productRules[].productMasters[]` carries full `ProductMaster` objects, each with
  `equipmentPackages`, `defaultPackage` and `subProductConfigs[].mixedByEquipments`.
- `ProductMasterTypes.ts` imports equipment types; `equipment/waterProduct.ts` imports product
  types (cycle).
- `AppProductCore` is the RealGreen "product used on a completed service" shape. The forecast
  reuses it for planned rows, which is why the name reads badly there.

### Who reads `loadoutInventory` (outside the loadout feature)
| Consumer | Sites | Needs |
|---|---|---|
| `bizPlan/selectors/inventorySelectors.ts` | 3 | flat rows |
| `bizPlan/selectors/createInventorySelectors.ts` | 1 | flat rows |
| `scheduling/coverSheets/_lib/components/CoverSheetCard.tsx` | 1 | flat rows |
| `scheduling/coverSheets/[routeDate]/page.tsx` | 1 | flat rows (missing from 00) |
| `inventory/inventorySelect.ts` | 2 | walks the tree, skips water |

Luke says: The current inventory system was built prior to qbo api integration.  With qbo integrated we'll be able to create a new inventory system that actually accesses a source of truth for what we have on hand.  The current inventory system will be deprecated.  Warn me before we start implementation that I still have to enter the latest inventory counts manually before breaking the current inventory system.


Also: `centralSelectors.ts` (2 places), `ServiceTypes.ts`, `baseService.ts`,
`_builders/makeCustomer.ts`. No test file touches any of this.

### Forecast math
- Every branch computes a sub-product amount as `size * config.rate`. Equipment only adds the
  water row and the grouping.
- A flat version differs from today in two cases. A sub tagged to equipment that is not in the
  master's default package is dropped today. A sub tagged to two pieces of equipment in the
  same package is counted twice today.
- Water rows carry `productId -2`, which is not in `productCommonMap`, so bizPlan shows them
  as the base product. A filter at line 592 of `inventorySelectors.ts` (it looks like the
  LY/TY comparison) removes them; the planned and mixed selectors do not.
- The cover sheet PDF has a branch that shows only products described "Water". The synthetic
  water row cannot trigger it, because it resolves to the base product.

### Who uses `Equipment` (outside loadout)
| Consumer | Uses | After loadout is gone |
|---|---|---|
| Mix chart (`page.tsx`, `MixChartSetup`, `AppMethodOverrideSection`, `mixChartUtils`) | equipment picker, `equipment.appMethod`, `showFlOz`, `appMethod.needsWater`, `buildWaterUnitConfig` | still live |
| `MasterEditPanel` packages tab, `saveMasterEquipmentPackages` op | package ids, default package | no reader |
| `MasterSubConfig` "Mixed By" checkboxes | `mixedByEquipmentIds` | no reader |
| `ProductsFooter` | Equipment and Packages CRUD modals | only feeds the mix chart picker |
| `appMethod/api/route.ts`, `AppMethodDeleteSheet`, `getAffectedProducts` | delete guard | needs rewriting |

- The mix chart already ignores `mixedByEquipmentIds` and builds from flat product rows. It
  needs an app method and a gallons / fl oz choice, not a tank.
- `Equipment.mixedProductIds` is dead: no UI edits it and nothing reads it.
  `mixedByEquipmentIds` is the live field, and loadout is its only reader.
- `appMethod/api/route.ts` queries `equipmentPackageDocs.equipmentDocs.defaultAppMethodId`
  on product docs. That path is not in the current schema, so those queries match nothing.

### Corrections to 00
- `machines/MachineTypes.ts` is used only by loadout (`ChooseTruck`, `ChooseRideOn`,
  `truckId`, `rideOnId`). It dies with loadout. Maintenance starts clean, not as a
  replacement for it.
- `AppMethod.needsWater` is not dead: the mix chart uses it to default "Include Water".
  `tracksTankLevel` is dead after loadout.
- There is a fourth loadout reducer, `loadoutReport`.
- The cover sheet PDF page is a sixth forecast call site.
- `can.loadouts` appears only in the loadout feature, `NavMenu` and the scheduling group.

## Scope

### Removed
- `src/app/loadout/` (7 files, about 1,050 lines)
- `src/app/scheduling/dailyInventory/` (65 files, about 6,300 lines)
- `src/app/equipment/` (21 files, about 1,470 lines), unless `waterProduct.ts` moves (question 1)
- `src/app/machines/`
- `hydratePlannedLoadout.ts`, `loadoutBaseToAppProductCore.ts`, `useAppProducts.ts`
- Reducers: `loadout`, `loadoutStart`, `loadoutFinish`, `loadoutReport`, `equipment`,
  `equipmentPackage`
- Capabilities: `loadouts`, `equipmentDefinitions`, `equipmentPackages`,
  `masterEquipmentPackages`; the NavMenu "Loadout" entry
- Product master fields: `equipmentPackageIds`, `defaultPackageId`, `equipmentPackages`,
  `defaultPackage`, `mixedByEquipmentIds`, `mixedByEquipments`
- `src/app/realGreen/product/bkp/*.json`: three production exports tracked in git

### Changed
- `ServiceProps`, `centralSelectors.ts`, `baseService.ts`, `makeCustomer.ts`
- The six forecast call sites and `inventorySelect.ts`, onto one planned-products function
- `productSelectors.ts`, `ProductMasterTypes.ts`, `baseProduct.ts`, `ProductDocPropsModel.ts`,
  `ProductContract.ts`, product `route.ts`, `productSlice.ts`, `useProduct.ts`
- `MasterEditPanel`, `MasterSubConfig`, `MastersTab`, `ProductsFooter`
- Mix chart setup and types (equipment picker replaced)
- App method delete flow and `getAffectedProducts`
- Docs and skills: `AGENTS.md` type examples, `product-module` and `mongo-read` skills,
  inventory and assignment docs

### Kept as is
- `appMethodSolver/`, `appMethodCreate/`, `unitConfig/`, mix chart math and PDF layouts
- `ServCode.productRules` (servCode + size -> masters) and `subProductConfigs` (master ->
  sub + rate): the two joins the forecast needs

### Out of scope, noted
- Full review of the customer / program / service hydration strategy
- One product type instead of the master / sub / single hierarchies
- Cover sheets using mix chart logic
- Renaming `AppProduct`

## Open questions
1. Mix chart without equipment: pick an app method directly? Then where does `showFlOz` live:
   on `AppMethod`, or as a toggle on the chart? And where do `buildWaterUnitConfig` and
   `waterProduct` move?
   1. Luke says: I think this is answered above
2. Planned products: one pure function called by each feature, with nothing on `Service`?
   That removes `loadoutInventory` and, later, lets `productRules` hold ids instead of masters.
   1. Luke says: productRules only holding ids sounds appropriate.
3. The two forecast edge cases above: accept the new numbers?
4. Planned rows: keep the `AppProductCore` shape for now, or introduce a named type in this
   refactor?
   1. Luke says: Let's discuss this.  I'm not sure what you mean here.  I know I'm wishy-washy about hydration onto the service object, but AppProductCore is actually coming from realGreen data.
      1. this is an example of bad semantic choice.  usedAppProducts should be called productsUsed and the type should be ProductionProducts.  I like that the realGreen product hydrates in this case, but it's not a deal breaker if that has to change.
5. Does maintenance need anything from this refactor beyond a free `equipment` name, folder,
   collection and capability key?
   1. Luke says: we don't need to implement anything for maintenance during this refactor.

## Not verified
- Mongo: the three `equipment` docs, the contents of `equipmentpackages`, which product docs
  hold package or mixed-by values, and whether stored capability bundles or user capabilities
  hold the capability keys being removed. No database tool in this session.
- `dailyInventory` internals (not read; all of it is removed).
- The middle of `MasterEditPanel.tsx`, and how it builds the "Mixed By" equipment list.
- `ServiceUtils` has a product-rule check against used products (around lines 178-201). It is
  another reader of `productRules`; not read in detail.
- How the bizPlan tables display the base-product water row.
- Whether `ProductSubDocProps.appMethodId` still has a reader.
