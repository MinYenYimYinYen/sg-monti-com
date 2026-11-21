# 04 Full Discovery State: Product, Loadout and Equipment

Status: discovery is complete apart from the four open questions at the end. No code has
changed. Every statement about the code below was checked against the code on 2026-11-21.
That session had no database tool. Nothing here rests on a database read, and no step needs
one.

## Documentation rule: full state
- This file is the whole state of the refactor: every decision, the facts behind it, the plan
  and the open questions. It needs no other file in this folder.
- Do not read `00_InitialConversation.md`, `01_InitialConversation.md`, `02_RefactorPlan.md` or
  `03_DiscoveryState.md`. They are superseded, and this file corrects some of their statements.
  They can be deleted.
- Each later iteration is a new numbered file (`05_...`) written the same way: full state,
  standalone, with this rule copied into it. It names the file it replaces as not to be read.
- An iteration carries forward every decision that still holds and drops what was undone.
  Luke's answers are recorded as decisions, not as a question-and-answer log.
- A statement about the code is checked against the code before it is written. A fact that
  cannot be checked is written as a check to run, inside the step that needs it. There is no
  "not verified" list.

## Required reading
- This file. It is the only file to read from `src/productEquipmentRefac/`.
- Each step under "Order of work" lists the skills and code to read for that step. Read them
  when the step starts, not before.

## Before any code changes
- Luke enters the latest inventory counts by hand in Monthly Inventory. The agent reminds him
  and waits for his go-ahead before step 1, which edits Monthly Inventory.

## Goals
1. Remove the loadout feature and the types and data it orphans.
2. Remove the current equipment types, equipment packages and their data.
3. Correct the parts of the selector tree this touches.
4. Keep the mix chart working, without equipment.
5. Keep the product forecast, with the service as the unit that consumes products.
6. Leave the name `equipment` free for a later equipment maintenance module. Nothing is built
   for it here.

## Decisions
Settled by Luke, except where a line says it is proposed or names an open question.

### Scope
- Loadout goes: `src/app/loadout/`, `src/app/scheduling/dailyInventory/`, `src/app/machines/`.
- `Equipment` and equipment packages go, stored data included. Nothing replaces them and
  nothing is migrated.
- No spray tank module. It was considered as the mix chart input in place of `Equipment` and
  dropped: the chart needs only an app method and a gallons / fl oz choice. If a later feature
  needs a tank property such as capacity, build a flat module then, outside `src/app/equipment/`.
- Monthly Inventory will be rebuilt later on QuickBooks data. Until then it is cut off from
  services (below), not removed.
- No old-versus-new comparison test.

### Forecast
- Planned products come from one pure function. Nothing about them is stored on `Service`.
- The function returns its own type, `PlannedProduct` (`productId`, `servId`, `amount`,
  `treated`). bizPlan keeps its own combined row type for the views that mix actual and planned.
- There is no water row.
- Every sub-product on a matching master counts once. Luke accepted the change in numbers.

### Monthly Inventory
- It stops reading services altogether. Luke: "remove inventory dependency on the whole
  Service object type".
- Read literally, that removes the "By Date" tab of the Select Products sheet, and both the
  "Planned:" and "Recorded:" lines under each product. Question 1 asks Luke to confirm.
- Products are still chosen from the Last Check, Non-Zero, Zero and Manual tabs. Counting,
  saving and history do not change.

### Product rules, masters and subs
- `ProductRule` holds master ids, not hydrated masters.
- `ServiceUtils.productRuleCompliance` is removed.
- `appMethodId` on sub-products is removed.
- Base objects stay as the fallback for a missing join.

### Mix chart
- The chart picks a saved app method directly. Any saved method can be picked.
- A gallons / fl oz toggle on the chart replaces the tank's stored choice. It defaults to
  gallons.
- The chart has an editable title. Picking a method sets the title to the default for that
  method, even if the title was edited. Reset leaves the title alone.
- None of the chart setup is saved, as today.

### Products used on a completed service
- Each row keeps its hydrated product, so product data stays an input of the customer tree.
- The names change throughout, the stored key included (step 7 has the names).
- The stored key is switched by a full sync of the mirror. There is no fallback that reads the
  old key.

### Data and environment
- Luke drops the `loadoutdocs` collection himself.
- Proposed, and not objected to in two rounds: he drops `equipment` and `equipmentpackages` the
  same way, and leftover fields on kept collections are left alone.
- A local copy of the production database is set up as a side mission (step 0). Luke wants to
  be able to sync the two, to get a backup out of it, and to switch development between them
  by commenting and uncommenting `MONGO_DB_URI` lines in `.env.local`. Development must not be
  tied to either one.

## How it works today

### Selector chain
    equipment + packages + app methods + unit configs + subs -> productMasters
    productMasters -> progCodes (rules carry hydrated masters) -> servCodes
    servCodes + allProductsMap + other inputs -> customers -> programs -> services

- Any equipment, package, app method or unit config change rebuilds the masters, then every
  servCode, then the whole customer tree.
- `allProductsMap` (masters, singles and subs) is also a direct input of the customer tree. It
  hydrates the products used on completed services.
- `productSubs` takes the app method map as an input and does not use it.

### Planned products
- `centralSelectors.ts` builds `Service.loadoutInventory` for every service with
  `hydratePlannedLoadout`. `loadoutBaseToAppProductCore` flattens it into rows.
- Rule matching: every rule whose size condition matches contributes its masters.
- The rate is always `storedRate`. `hydrateRate` only returns it.
- A master with no default package: every sub-product counts once, `amount = size * rate`.
- A master with a default package:
  - a sub-product with no equipment tag counts once;
  - a sub-product tagged to equipment in the package counts once for each such tag;
  - a sub-product tagged only to equipment outside the package is left out;
  - each piece of equipment adds a water row: product id -2, amount is the total mix in gallons.
- Product id -2 is not a real product. bizPlan and the cover sheets join it to the base
  product, so the water row carries the placeholder text of the base product as its code and
  description.

### Who reads `Service.loadoutInventory`
| Reader | Sites | After the refactor |
|---|---|---|
| bizPlan (`inventorySelectors.ts`, `createInventorySelectors.ts`) | 4 | Planned products function |
| Cover sheet card (`CoverSheetCard.tsx`) | 1 | Planned products function |
| Cover sheet PDF (`coverSheets/[routeDate]/page.tsx`) | 2 | Planned products function |
| Monthly Inventory (`inventorySelect.ts`) | 2 | Removed |
| Loadout (`loadoutStartSelect.ts`, `loadoutFormHelpers.ts`) | 2 | Removed with loadout |

- Every outside reader already joins the product itself by `productId`, with the base product
  as the fallback. `PlannedProduct` needs no hydrated product on it.
- The cover sheet PDF shows only the products described "Water" when one is present. That
  filter reads a real product description, not the -2 row, so it is not affected.

### Mix chart
- It never uses the `Mixture` class. That class and `LoadoutConstituent` exist only for loadout.
- Its own math is in `mixChart/_lib/mixChartUtils.ts`: product rows with a rate per ksf, and a
  water rate from the app method's coverage minus the liquid products. That code is kept.
- From equipment it takes: the picker, the tank's default app method, `showFlOz`, the tank
  description for the title, and `buildWaterUnitConfig` from `equipment/waterProduct.ts`.
- `useProduct` already loads app methods, so the chart has them without `useEquipment`.
- `MixChartConfig.appMethodOverride` is set to null in two places and never read. The page
  reads the solver result from Redux instead.
- `AppMethodOverrideSection` takes a callback that its parent passes as an empty function.

### App methods
- `tracksTankLevel` is read only by loadout. It is set or carried in eight files under
  `src/app/appMethod/`: the type, the model, the route, and five under `appMethodCreate/`.
- `needsWater` is still used: the mix chart defaults "Include Water" from it.
- The delete guard exists only because equipment and packages reference app methods. It is the
  `checkDependencies` op, the `clearReferences` option on `deleteOne`, most of
  `AppMethodDeleteSheet`, and `getAffectedProducts`.

### Monthly Inventory
- `useInventoryDeps` loads the customer context, servCodes, products, the saved checks and the
  completed services for a date range. The main page and the history page call it.
- Two selectors read services: `productIdsFromServices` (the "By Date" tab) and `predictions`
  (the "Planned:" and "Recorded:" lines).
- `onHandPredicted` is computed and shown nowhere.
- The session date range is set only by the "By Date" search. It is kept in local storage for
  the day and is not part of a saved check.
- The other four tabs, the counts, the save and the history read saved checks and products only.

### Products used on a completed service, and the mirror
- RealGreen sends `productsUsed` on a service. The sync stores it as
  `productionCore.usedAppProductCores`. `hydrateProduction` turns that into
  `production.usedAppProducts`, each row with its hydrated product.
- The stored key appears in five code files: `Production.ts`, `ServiceModel.ts`,
  `serviceServerFunc.ts`, `hydrateProduction.ts` and `completedServiceProductionFallback.ts`.
- No query or index names the key. The only nested service path that is queried is
  `productionCore.doneDate`.
- Every sync (delta, re-sync, full) writes a service with `$set` of its top-level fields,
  matched on `servId`. `productionCore` is one of those fields and is written whole. So any
  sync of a completed service replaces the old key with the new one and leaves no old key
  behind. Checked by running Mongoose 9.1.3's update casting on a schema of the same shape.
- `mirrorSync.readme.md` says a re-sync does not remove fields the sync no longer maps. That
  holds for top-level service fields only, not for keys inside `productionCore`.
- A full sync deletes all mirrored services, programs and customers and reloads them. It is
  password-gated and runs in chunks from `/syncUtils`. While it runs, mirror queries are
  refused with a 409.
- Re-sync Services would also switch the key, with no wipe. But until each season is re-synced
  its completed services fail to load, with no 409 to explain why. The full sync stays the
  chosen route.
- Mirror reads do not apply schema defaults. A service document without the key gives
  `undefined`, and `hydrateProduction` calls `.map` on it without a guard (question 2).

### Permissions, tests, database connection
- Removing a capability needs no data change. A stored grant for a removed capability is
  ignored, and the permission editors list it as a grant to clean up.
- None of the 75 test files mentions anything this refactor removes or renames. One builder is
  affected: `_builders/makeCustomer.ts`.
- One environment variable, `MONGO_DB_URI`, selects the database. Only `connectToMongoDB.ts`
  reads it. The URI names no database, so Mongoose uses `test`.
- This machine has no MongoDB server, no MongoDB command-line tools and no Docker. The repo
  has the `mongodb` and `mongoose` packages and no script runner.
- The RealGreen API key is a separate variable. Pointing the app at another database does not
  change which RealGreen account it reads and writes.

## Target design

### Selector chain afterwards
    productSubDocs + unitConfigMap -> productSubs
    productMasterDocs + productSubsMap + unitConfigMap -> productMasters
    masters + singles + subs -> allProductsMap
    progServ docs + priceTables + assignment plan + employees -> progCodes -> servCodes
    servCodeMap + allProductsMap + other inputs -> customers -> programs -> services

- App methods feed only the app method screens and the mix chart.
- No product, unit config or app method edit rebuilds servCodes.
- A product or unit config edit still rebuilds the customer tree, through `allProductsMap`.
  That is the accepted cost of keeping the hydrated product on each product-used row.

### Planned products
- One pure function. Inputs: a service's `servId` and `size`, its servCode's rules, and the
  master docs by id (`productSelect.productMasterDocMap` already exists).
- Output: one `PlannedProduct` per sub-product of every master on a matching rule, with
  `amount = size * storedRate` and `treated = size`.
- Rule matching is unchanged.
- Callers: the seven bizPlan and cover sheet sites. Each keeps its own join to the product.
- `CoverSheetCard.tsx` and the cover sheet PDF total planned rows in maps typed `AppProduct`.
  Those maps get their own type.
- `SubProductConfig.rate` goes; readers use `storedRate`. `hydrateRate.ts` is deleted.

### Monthly Inventory
- `useInventoryDeps` keeps the product load, the saved-checks load and the session restore. It
  drops the customer context, `useProgServ` and `useRecentProduction`.
- `productIdsFromServices`, `predictions`, `sessionDateRange`, `InventoryPrediction`, the
  session `dateRange` and `setDateRange` are removed.
- `SelectProductsSheet` loses the "By Date" tab and opens on "Last Check".
- `ProductListRow` loses its `prediction` prop and both lines.

### Mix chart
- `MixChartConfig`: `equipment` is replaced by `appMethod`, `showFlOz` and `title`. The unused
  `appMethodOverride` is removed.
- The setup shows a picker of saved app methods, labelled by description. Picking one loads it
  into the method editor, sets "Include Water" from `needsWater`, and sets the title.
- The default title is built from the method description, as it is from the tank description
  today. The title is a text input. Both PDF layouts already take `title` and do not change.
- Reset reloads the picked method into the editor.
- `buildWaterUnitConfig` and the water product id move to `mixChart/_lib/`. The `waterProduct`
  object is not moved: only loadout uses it.
- `AddProductSheet.tsx` reads a master's sub-product `rate`. It reads `storedRate` instead.
- The empty-state text "Add equipment and products" is reworded.
- Chart math does not change.

### Product rules, masters and subs
- `ProductRule` is `ProductRuleDoc` plus `desc`. `desc` stays because `useServCodes` groups
  cover sheet rows by it.
- `hydrateProductRules` and `progServSelect` stop taking the masters map.
- `ProductMaster` loses `equipmentPackageIds`, `defaultPackageId`, `equipmentPackages` and
  `defaultPackage`. `SubProductConfigDoc` becomes `subId` plus `storedRate`.
- `productSubs` and `productMasters` stop taking the app method map.
- `ProductSubDocProps.appMethodId` goes from the type, the base object and the
  `ProductDocProps` schema, with the unused `AppMethod` import in `ProductSubTypes.ts`.
- The master editor keeps the Sub-products and Attributes tabs. Its default tab is the
  packages tab today, so the default changes.

### App methods
- `tracksTankLevel` is removed from the eight files.
- The delete guard is removed. Delete becomes a plain confirm.

## What stops working
| Removed | What the user loses | Replacement |
|---|---|---|
| Loadout | Start and finish loadout, loadout feedback, the loadout report, the "Loadout" menu entry | None |
| Water row in the forecast | A row with a placeholder code and description in bizPlan and on cover sheets | None |
| Forecast counting rules | Numbers change for masters with a default package | Accepted |
| Monthly Inventory service data | The "By Date" tab, and the "Planned:" and "Recorded:" lines | None |
| Equipment | The mix chart tank picker and the tank's stored fl oz choice | App method picker, toggle, editable title |
| Equipment | The Equipment badge and modal in the products footer | None |
| Equipment packages | The Equipment Packages badge and modal, the packages tab and "Pkg" count on masters | None |
| Equipment tags on sub-products | The "Mixed By" checkboxes | None |
| App method delete guard | The list of affected equipment and products before a delete | None needed |
| `machines/` | Truck and ride-on pickers, used only by loadout | None |
| Capabilities | `loadouts`, `equipmentDefinitions`, `equipmentPackages`, `masterEquipmentPackages` | None |

## Removal list
- `src/app/loadout/` (7 files, 1,145 lines)
- `src/app/scheduling/dailyInventory/` (65 files, 6,985 lines)
- `src/app/equipment/` (21 files, 1,604 lines)
- `src/app/machines/` (1 file)
- `hydratePlannedLoadout.ts`, `loadoutBaseToAppProductCore.ts`, `hydrateRate.ts`,
  `getAffectedProducts.ts`
- `useAppProducts.ts`. Nothing imports it today.
- Reducers: `loadout`, `loadoutStart`, `loadoutFinish`, `loadoutReport`, `equipment`,
  `equipmentPackage`
- The `saveMasterEquipmentPackages` op, its thunk, its reducer and its hook function
- The unused `WATER_PRODUCT_ID` import and the commented-out migration block in the product route
- `src/app/realGreen/product/bkp/`: three production exports tracked in git. No code imports
  them. Deleting them leaves them in git history.

## Files that change
- Customer tree: `ServiceTypes.ts`, `centralSelectors.ts`, `baseService.ts`, `ServiceUtils.ts`,
  `_builders/makeCustomer.ts`
- Forecast callers: `bizPlan/selectors/inventorySelectors.ts`, `createInventorySelectors.ts`,
  `bizPlan/types/inventoryTypes.ts`, `coverSheets/_lib/components/CoverSheetCard.tsx`,
  `coverSheets/[routeDate]/page.tsx`
- Monthly Inventory: `inventorySelect.ts`, `InventoryTypes.ts`, `inventorySlice.ts`,
  `useInventory.ts`, `useInventoryDeps.ts`, `page.tsx`, `ProductListRow.tsx`,
  `SelectProductsSheet.tsx`
- Product module: `productSelectors.ts`, `ProductMasterTypes.ts`, `ProductSubTypes.ts`,
  `baseProduct.ts`, `ProductDocPropsModel.ts`, `ProductContract.ts`, product `route.ts`,
  `productSlice.ts`, `useProduct.ts`, `MasterEditPanel.tsx`, `MasterSubConfig.tsx`,
  `MastersTab.tsx`, `ProductsFooter.tsx`
- Rules: `ProductRule.ts`, `hydrateProductRules.ts`, `progServSelect.ts`
- Mix chart: `page.tsx`, `MixChartSetup.tsx`, `AppMethodOverrideSection.tsx`,
  `AddProductSheet.tsx`, `MixChartTypes.ts`, `mixChartUtils.ts`
- App methods: `AppMethodTypes.ts`, `AppMethodModel.ts`, `api/route.ts`, `AppMethodContract.ts`,
  `AppMethodDeleteSheet.tsx`, `appMethodSlice.ts`, `useAppMethod.ts`, and under
  `appMethodCreate/`: `AppMethodCreate.tsx`, `createAppMethodSlice.ts`, `loadSavedAppMethod.ts`,
  `useFormFieldValues.ts`, `selectors/solverSelect.ts`
- Shared: `store/reducers/index.ts`, `NavMenu.tsx`, `permission/groups/scheduling.ts`,
  `permission/groups/realGreenProducts.ts`
- Docs: `AGENTS.md` (type naming examples), the `data-module`, `product-module` and
  `mongo-read` skills, `assignment.readme.md`, `assignmentCodeReview.md`,
  `inventory/docs/inventoryPlan.md`, `inventory/docs/inventoryImplementation.md`,
  `productivityPlan.md`, `unitConfig/UnitUtils_vs_UnitMath_Analysis.md`

## Stored data
- Collections with no reader afterwards: `loadoutdocs`, `equipment`, `equipmentpackages`. Luke
  drops them after step 4 is deployed.
- Fields with no reader afterwards, left in place: on `productdocprops`, `equipmentPackageIds`,
  `defaultPackageId`, `appMethodId` and `subProductConfigDocs[].mixedByEquipmentIds`; on
  `appmethods`, `tracksTankLevel`.
- `services`: the key `productionCore.usedAppProductCores` is replaced by
  `productionCore.productsUsedCores` through a full sync (step 7).

## Order of work
Each step leaves the app compiling, gets its own action plan and can be deployed on its own.
The agent checks edited files with the IDE diagnostics. Luke runs `npx tsc --noEmit` after
each step.

### Step 0. Local copy of the production database (side mission)
- Goal: development can point at a local copy or at production, switched by commenting one of
  two `MONGO_DB_URI` lines in `.env.local`. The copy doubles as a backup.
- The switch needs no code change. The dev server must be restarted after switching, because
  the connection is cached for the life of the process.
- The app still talks to the live RealGreen account when it uses the local copy. Anything that
  writes to RealGreen writes for real.
- Needed before step 7. Recommended first, so every step is tried on the copy.
- How the copy is made is question 4.
- Read: `src/lib/mongoose/connectToMongoDB.ts`, `mirrorSync.readme.md`, the `mongo-read` skill.

### Step 1. Planned products function; cut Monthly Inventory off from services
- Luke enters the inventory counts first.
- Add the function and `PlannedProduct`. Move the seven bizPlan and cover sheet sites onto it.
- Change Monthly Inventory as described under "Target design".
- `Service.loadoutInventory` stays for now. Loadout still reads it.
- Forecast numbers change in this step.
- Ask Luke whether he wants tests for the function.
- Read: the `realgreen-customer` skill, `hydratePlannedLoadout.ts` and
  `loadoutBaseToAppProductCore.ts` (the behaviour being replaced), the files under "Forecast
  callers" and "Monthly Inventory".

### Step 2. Delete loadout
- Delete the three loadout folders, the two loadout helpers and `useAppProducts.ts`.
- Remove `loadoutInventory` from `Service`, the base service, the central selector and the
  builder.
- Remove `productRuleCompliance`, the four loadout reducers, the "Loadout" menu entry and the
  `loadouts` capability.
- Read: the `permission` skill, `store/reducers/index.ts`, `NavMenu.tsx`.

### Step 3. Mix chart on app methods; app method cleanup
- Switch the mix chart as described under "Target design".
- Remove the app method delete guard and `getAffectedProducts.ts`.
- Remove `tracksTankLevel`.
- Read: the `product-module`, `ui-styling` and `api-route` skills, the files under "Mix chart"
  and "App methods".

### Step 4. Delete equipment and packages
- Delete `src/app/equipment/`, the two reducers and the three capabilities.
- Change the product module as described under "Target design". Delete `hydrateRate.ts`.
- Remove the two footer badges, the packages tab, the "Pkg" count and "Mixed By".
- Read: the `product-module`, `data-module` and `permission` skills.

### Step 5. Rules hold ids
- Change `ProductRule`, `hydrateProductRules` and `progServSelect`.
- Read: the `data-module` skill and those three files.

### Step 6. Docs and stored data
- Update the docs listed under "Files that change". Delete `product/bkp/`.
- Luke drops the three collections.

### Step 7. Rename products used; full sync
- Stored key: `usedAppProductCores` becomes `productsUsedCores`.
- Hydrated property: `usedAppProducts` becomes `productsUsed`.
- Types: `AppProductRaw`, `AppProductCore` and `AppProduct` become `ProductionProductRaw`,
  `ProductionProductCore` and `ProductionProduct`. The file `AppProduct.ts` becomes
  `ProductionProduct.ts`.
- bizPlan's own `EnrichedAppProduct` is renamed in the same step. Its name is chosen in the
  action plan.
- `ServiceUtils` already has a `productsUsed` getter, and RealGreen's raw service field has the
  same name. Neither changes.
- Files that hold these names today and are not deleted earlier: `AppProduct.ts`,
  `Production.ts`, `ServiceTypes.ts`, `ServiceModel.ts`,
  `serviceServerFunc.ts`, `hydrateProduction.ts`, `ServiceUtils.ts`,
  `completedServiceProductionFallback.ts`, `bizPlan/selectors/inventorySelectors.ts`,
  `createInventorySelectors.ts`, `bizPlan/types/inventoryTypes.ts`, `CoverSheetCard.tsx`,
  `coverSheets/[routeDate]/page.tsx`.
- `productivityPlan.md` names the old property and is updated here.
- Run order: try it on the local copy with a local full sync. Then deploy to production and
  run the full sync there from `/syncUtils`.
- Never run any sync from the renamed code against the production database before production
  has the renamed code. Each service it wrote would lose the old key, and the old code would
  fail on it.
- Read: the `realgreen-customer` skill, `mirrorSync.readme.md`.

## Open questions
1. Monthly Inventory. Cutting it off from services removes the "By Date" tab and the
   "Recorded:" line as well as "Planned:". Both come from completed services. Is that what you
   meant? Recommendation: yes, as written.

2. The gap between deploying step 7 and starting the full sync. In that gap, any screen that
   loads completed services from the mirror fails, because the stored documents have no
   `productsUsedCores` yet. Once the sync starts, those screens show the "mirror is rebuilding"
   message until it ends. Options:
   a. No guard. Deploy outside working hours and start the full sync at once.
   b. A one-line guard that treats a missing key as no products, removed after the sync. It
      does not read the old key, so it is not the fallback you ruled out. Figures read zero
      instead of failing.
   Recommendation: a. The rebuild already makes those screens unavailable, and it adds no code.

3. Shared code left with no importer. Delete it, or keep it?
   - Once the removed folders are gone: `useByAssignmentCustomers.ts`, `MultiSelectEmpty.tsx`,
     `DeepNonNullable.ts`, `style/components/slider.tsx`, and all of `src/lib/validation/`.
   - Already unused today: `mixChart/components/CustomAppMethodEditor.tsx`.
   - The `byAssignment` customer context loses its only loader. Removing the context itself
     touches the shared customer slices.
   Recommendation: delete each file in the step that removes its last importer. Leave the
   `byAssignment` context alone.

4. How the local copy is made (step 0). This PC has no MongoDB server, no MongoDB command-line
   tools and no Docker.
   a. Install MongoDB Community Server and the MongoDB Database Tools. Copy with `mongodump`
      and `mongorestore`, wrapped in two short PowerShell scripts.
   b. A second database on the Atlas cluster. Nothing to install for the server, but the copy
      still needs the Database Tools, and it is not a backup kept off the cluster.
   Recommendation: a.
   Also: should the copy run one way only, production to local? Recommendation: yes. A copy
   from local to production would overwrite live data.