# 05 Full State: Product, Loadout and Equipment

Status: discovery is complete and no question is open. No application code has changed. The
backup and sandbox scripts and their runbook were written on 2026-11-23. Step 0 (backup and
sandbox) was finished the same day, and the inventory counts were entered into QuickBooks, so
step 1 was implemented in code on the same day (see "Progress"). Statements about the application code were checked against
the code on 2026-11-21. Nothing here rests on a database read, and no step needs one.

## Documentation rule: full state
- This file is the whole state of the refactor: every decision, the facts behind it, the plan,
  the progress and the open questions. The only other file to read is the action plan of the
  step in progress, in `implementationSteps/`.
- Do not read `00_InitialConversation.md`, `01_InitialConversation.md`, `02_RefactorPlan.md`,
  `03_DiscoveryState.md` or `04_FullDiscoveryState.md`. They are superseded, and this file
  corrects some of their statements. They can be deleted.
- This file is kept up to date in place. It is not copied into a new numbered file. Progress is
  recorded under "Progress". Each step has an action plan in `implementationSteps/`, written
  when the step starts and ticked off as the work is done.
- When a decision changes, edit it here, drop what was undone, and note the change under
  "Progress". Luke's answers are recorded as decisions, not as a question-and-answer log. If the
  plan changes during implementation, Luke and the agent decide at that point whether this file
  is enough or a new iteration is needed.
- A statement about the code is checked against the code before it is written. A fact that
  cannot be checked is written as a check to run, inside the step that needs it. There is no
  "not verified" list.

## Required reading
- This file, and the action plan of the step in progress (`implementationSteps/`). No other
  file in `src/productEquipmentRefac/`.
- Each step under "Order of work" lists the skills and code to read for that step. Read them
  when the step starts, not before.

## Before any code changes
- Done on 2026-11-23: Luke read the latest inventory counts from Monthly Inventory and entered
  them into QuickBooks by hand. This was the prerequisite for step 1, which edits Monthly
  Inventory. Nothing in the app's database changed.
- Step 1 is implemented in code (see "Progress"); `tsc` and the sandbox checks are Luke's to
  run. Its action plan is `implementationSteps/step1_PlannedProductsAndInventory.md`.

## Goals
1. Remove the loadout feature and the types and data it orphans.
2. Remove the current equipment types, equipment packages and their data.
3. Correct the parts of the selector tree this touches.
4. Keep the mix chart working, without equipment.
5. Keep the product forecast, with the service as the unit that consumes products.
6. Leave the name `equipment` free for a later equipment maintenance module. Nothing is built
   for it here.

## Decisions
Settled by Luke, except where a line says it is proposed.

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
- The cover sheet shows no planned products. The three places that did (the card's "Products"
  view, and on the PDF the totals per service code and the products per service) are emptied and
  left as commented placeholders saying the section will be reworked after the refactor is
  complete. Nothing on the cover sheet calls the planned products function.
- `getPlannedProducts` gets unit tests (Luke, 2026-11-23).

### Monthly Inventory
- It stops reading services altogether. Luke: "remove inventory dependency on the whole
  Service object type".
- That removes the "By Date" tab of the Select Products sheet, and both the "Planned:" and
  "Recorded:" lines under each product. Both lines come from completed services.
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
- There is no guard for a missing key either. Step 7 is deployed outside working hours and the
  full sync is started at once.

### Shared code left with no importer
- Each such file is deleted in the step that removes its last importer. The action plan of the
  step confirms it has no importer left.
- Once the loadout folders are gone (step 2): `useByAssignmentCustomers.ts`,
  `DeepNonNullable.ts`, `style/components/slider.tsx` (the `@radix-ui/react-slider` package
  stays: two other files import it), and all of `src/lib/validation/`.
- `components/multiselect/MultiSelectEmpty.tsx` goes in step 4, not step 2: the two equipment
  forms still import it until `src/app/equipment/` is deleted.
- Already unused today: `mixChart/components/CustomAppMethodEditor.tsx`. It goes in step 3.
- The `byAssignment` customer context loses its only loader and is left alone. Removing it
  touches the shared customer slices.
- `useRecentProduction.ts` loses its last importer in step 2 (the loadout report; step 1 removed
  Monthly Inventory's use). Confirmed by the step 2 scan. It is deleted in step 2 and the
  `recentProduction` context is left alone, like `byAssignment`.
- Left alone in step 2: the `getBySchedDate` and `getAvailableDates` assignment ops, the
  `availableDates` field and four assignment selectors that only loadout called. They sit in
  shared assignment code. Open question for Luke (see the step 2 plan).

### Data and environment
- Luke drops the `loadoutdocs` collection himself.
- Proposed, and not objected to in two rounds: he drops `equipment` and `equipmentpackages` the
  same way, and leftover fields on kept collections are left alone.
- Backup and sandbox are two things, set up as a side mission (step 0):
  - The backup is a dated archive file, taken on demand. Nothing opens or changes it.
  - The sandbox is a local MongoDB server with the database `sgSandbox`, restored from an
    archive. It is disposable.
- The copy runs one way only: production to archive to sandbox. The backup uses a read-only
  Atlas user, and the restore target is fixed to the local server (`127.0.0.1`).
- Development switches between production and the sandbox by commenting one of two
  `MONGO_DB_URI` lines in `.env.local`. Luke often works on the live database and uses the
  sandbox for breaking work such as this refactor.
- The archive folder is set per computer in `.env.local`. It moves to the SeaFile server when
  that is ready.
- A nightly backup on Atlas is out of scope.
- The setup is repeated on other machines from the runbook,
  `src/lib/mongoose/mongoSandbox.readme.md`.

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
| Cover sheet card (`CoverSheetCard.tsx`) | 1 | Removed, placeholder left |
| Cover sheet PDF (`coverSheets/[routeDate]/page.tsx`) | 2 | Removed, placeholders left |
| Monthly Inventory (`inventorySelect.ts`) | 2 | Removed |
| Loadout (`loadoutStartSelect.ts`, `loadoutFormHelpers.ts`) | 2 | Removed with loadout |

- The bizPlan readers already join the product themselves by `productId`, with the base product
  as the fallback. `PlannedProduct` needs no hydrated product on it.
- The cover sheet PDF showed only the products described "Water" when one was present. That
  filter went with the planned products code (it was applied to planned products only).

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
  `undefined`, and `hydrateProduction` calls `.map` on it without a guard. So between deploying
  step 7 and starting the full sync, any screen that loads completed services from the mirror
  fails.

### Permissions, tests, database connection
- Removing a capability needs no data change. A stored grant for a removed capability is
  ignored, and the permission editors list it as a grant to clean up.
- None of the 75 test files mentions anything this refactor removes or renames. One builder is
  affected: `_builders/makeCustomer.ts`.
- One environment variable, `MONGO_DB_URI`, selects the database. Only `connectToMongoDB.ts`
  reads it. The URI names no database, so Mongoose uses `test`.
- `connectToMongoDB.ts` passes no `dbName`, so a database named in the URI is the one used.
- The code uses no transactions and no change streams, so a plain standalone local server is
  enough.
- This machine (TOWEROFPOWER) has MongoDB Community Server 9.0.8 running as the Windows service
  `MongoDB`, Database Tools 100.20.1 and mongosh 2.14.3. None of them is on PATH. The repo has
  the `mongodb` and `mongoose` packages and no script runner.
- `.env.local` is ignored by git. It has a production and a sandbox `MONGO_DB_URI` line, one of
  them commented out.
- The local server listens on IPv4 `127.0.0.1` only, and Node resolves `localhost` to the IPv6
  address `::1`. The sandbox URI is therefore `mongodb://127.0.0.1:27017/sgSandbox`.
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
- One pure function, `getPlannedProducts`. Inputs: a service's `servId` and `size`, the rule
  docs of its servCode (`servCode.productRuleDocs`), and the master docs by id
  (`productSelect.productMasterDocMap` already exists), typed as a narrow
  `subProductConfigDocs` shape so tests pass literals.
- Output: one `PlannedProduct` per sub-product of every master on a matching rule, with
  `amount = size * storedRate` and `treated = size`.
- Rule matching is unchanged.
- Callers: the four bizPlan sites. Each keeps its own join to the product. The cover sheet is
  not a caller (see "Forecast").
- bizPlan's `EnrichedAppProduct` stops extending the whole `AppProduct` (a planned row has no
  `method`).
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
| Water row in the forecast | A row with a placeholder code and description in bizPlan | None |
| Planned products on the cover sheet | The card's "Products" view, and on the PDF the product totals per service code and the products per service | None yet: empty placeholders, to be reworked after the refactor |
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
- `hydratePlannedLoadout.ts`, `loadoutBaseToAppProductCore.ts` (step 1), `hydrateRate.ts`,
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
  `bizPlan/types/inventoryTypes.ts`
- Cover sheet (planned products emptied): `coverSheets/_lib/components/CoverSheetCard.tsx`,
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

### Step 0. Backup and sandbox (side mission)
- Goal: an on-demand backup archive of production, and a local sandbox restored from it that
  development can point at.
- Done on 2026-11-23:
  - Luke installed the server, the Database Tools and mongosh, and created the read-only Atlas
    user.
  - `tools/mongo/backup.ps1`, `resetSandbox.ps1` and `mongoCommon.ps1` are written.
  - The runbook `src/lib/mongoose/mongoSandbox.readme.md` is written.
  - Checked: the scripts parse, find the three tools, refuse a backup folder inside the
    repository, and stop with a clear message when a setting is missing.
  - Luke ran `backup.ps1` (archive in `D:\MongoDB`) and `resetSandbox.ps1`. The restore gave
    75 collections in `sgSandbox`.
  - Luke pointed the app at the sandbox and it runs.
  - Document counts compared with production: 75 collections on both sides, 74 with the same
    count. `rgapilogs` had two more documents in production, written after the backup.
- Step 0 is finished on this machine. Other machines repeat it from the runbook.
- Before step 7, and whenever the sandbox should match production again: run `backup.ps1`, then
  `resetSandbox.ps1`.
- The switch needs no code change. The dev server must be restarted after switching, because
  the connection is cached for the life of the process.
- The app still talks to the live RealGreen account when it uses the sandbox. Anything that
  writes to RealGreen writes for real.
- Needed before step 7. Recommended first, so every step is tried on the sandbox.
- Read: `src/lib/mongoose/mongoSandbox.readme.md`.

### Step 1. Planned products function; cut Monthly Inventory off from services
- The inventory prerequisite is met (see "Before any code changes").
- Add the function and `PlannedProduct`, with tests. Move the four bizPlan sites onto it.
- Remove planned products from the cover sheet (card and PDF) and leave commented placeholders.
- Change Monthly Inventory as described under "Target design".
- `Service.loadoutInventory` stays for now. Loadout still reads it.
- Delete `loadoutBaseToAppProductCore.ts` once the bizPlan sites are moved and the cover sheet
  is emptied: it has no importer left.
- Action plan: `implementationSteps/step1_PlannedProductsAndInventory.md`.
- Forecast numbers change in this step.
- Read: the `realgreen-customer`, `pdf-document` and `write-tests` skills, the code the plan
  names (`hydratePlannedLoadout.ts` and `loadoutBaseToAppProductCore.ts` for the behaviour being
  replaced), the files under "Forecast callers" and "Monthly Inventory".

### Step 2. Delete loadout
- Delete the three loadout folders, `hydratePlannedLoadout.ts`, `useAppProducts.ts`,
  `useRecentProduction.ts` and the shared files in "Shared code left with no importer" that the
  step 2 list names.
- Remove `loadoutInventory` from `Service`, the base service, the central selector and the
  builder.
- Remove `productRuleCompliance` (and its type), the four loadout reducers, the "Loadout" menu
  entry and the `loadouts` capability.
- Needs step 1 deployed first or in the same release.
- Action plan: `implementationSteps/step2_DeleteLoadout.md`.
- Read: the `realgreen-customer` and `permission` skills, `store/reducers/index.ts`,
  `NavMenu.tsx`.

### Step 3. Mix chart on app methods; app method cleanup
- Switch the mix chart as described under "Target design".
- Remove the app method delete guard and `getAffectedProducts.ts`.
- Remove `tracksTankLevel`.
- Read: the `product-module`, `ui-styling` and `api-route` skills, the files under "Mix chart"
  and "App methods".

### Step 4. Delete equipment and packages
- Delete `src/app/equipment/`, the two reducers and the three capabilities. Also delete
  `components/multiselect/MultiSelectEmpty.tsx` (its only importers are the two equipment
  forms).
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
  `createInventorySelectors.ts`, `bizPlan/types/inventoryTypes.ts` and
  `coverSheets/[routeDate]/page.tsx` (the history rows). `CoverSheetCard.tsx` no longer holds
  the names after step 1.
- `productivityPlan.md` names the old property and is updated here.
- Run order: try it on the sandbox with a local full sync. Take a fresh backup. Then deploy to
  production outside working hours and start the full sync there from `/syncUtils` at once.
- Never run any sync from the renamed code against the production database before production
  has the renamed code. Each service it wrote would lose the old key, and the old code would
  fail on it.
- Read: the `realgreen-customer` skill, `mirrorSync.readme.md`.

## Progress

### Status at a glance (2026-11-23)
| Step | State | What is left |
|---|---|---|
| 0. Backup and sandbox | Done on this machine | Other machines repeat it from the runbook |
| 1. Planned products; Monthly Inventory | Implemented in code, 15 new tests pass, `tsc` clean, nothing deployed | Luke: sandbox checks, look at the cover sheet PDF |
| 2. Delete loadout | Implemented in code, `tsc` clean, nothing deployed | Luke: sandbox checks; deploy with or after step 1, never before |
| 3. Mix chart on app methods | Implemented in code, `tsc` clean, nothing deployed | Luke: sandbox checks; deploy with or after step 2 |
| 4. Delete equipment and packages | Implemented in code, nothing deployed | Luke: `tsc`, sandbox checks; deploy with or after step 3 |
| 5. Rules hold ids | Implemented in code, nothing deployed | Luke: `tsc`, sandbox check; deploy with or after step 4 |
| 6. Docs and stored data | Docs done, `bkp/` deleted | Luke: drop `loadoutdocs`, `equipment`, `equipmentpackages` after steps 2 and 4 are deployed |
| 7. Rename products used; full sync | Implemented in code, nothing deployed | Luke: `tsc`, sandbox full sync and checks, then the runbook (`implementationSteps/step7_RenameProductsUsedRunbook.md`) |

Open questions and Luke's to-do list are at the end of this file.

### Log
- 2026-11-23: step 0 finished (see Step 0).
- 2026-11-23: step 1 action plan written:
  `implementationSteps/step1_PlannedProductsAndInventory.md`. Planning found things beyond this
  file, all listed under "Differences from 05" in the plan: `loadoutBaseToAppProductCore.ts` can
  be deleted in step 1; the planned products function reads rule docs, so step 5 does not touch
  it; `useRecentProduction.ts` becomes unused in step 2 (confirmed by the step 2 scan); and the
  stale `dateRange` in a locally saved inventory session is dropped on restore.
- 2026-11-23: Luke's answers on the plan, now recorded as decisions: planned products are
  removed from the cover sheet and left as commented placeholders (so the function has four
  callers, not seven); tests for `getPlannedProducts` are wanted; search-based checks are
  accepted in place of IDE diagnostics for step 1 (this session has no `ide_*` tools).
- 2026-11-23: Luke confirmed keeping the "Products" radio on the cover sheet list as a visible
  placeholder.
- 2026-11-23: step 1 implemented (code only; nothing deployed, no stored data touched):
  - New: `PlannedProduct.ts`, `getPlannedProducts.ts` (both under `realGreen/product/_lib/`).
  - bizPlan: the four sites now call `getPlannedProducts`. `EnrichedAppProduct` now picks only
    `productId`, `amount`, `treated` and `productCommon` from `AppProduct`.
  - Cover sheet card and PDF: planned products removed, four commented
    `PLACEHOLDER: planned products` markers left (card header, card per employee, PDF totals per
    service code, PDF products per service). The PDF `PRODUCTS` cell keeps its width.
  - Monthly Inventory: no longer reads services. Removed the By Date tab, the Planned and
    Recorded lines, `predictions`, `productIdsFromServices`, `sessionDateRange`, `lastCheck`,
    `setDateRange`, `InventoryPrediction` and `InventorySession.dateRange`. `useInventoryDeps` no
    longer loads the customer context, servCodes or recent production. The sheet opens on "Last
    Check" with four tabs. `loadInventorySession` drops a stale `dateRange`.
  - Deleted: `loadoutBaseToAppProductCore.ts`.
  - Tests: 15 new tests in `src/__tests__/realGreen/product/`, all passing (run 2026-11-23).
  - Checks: by re-reading and search (no `ide_*` tools). The layout of the cover sheet PDF was
    not viewed.
  - Still open for step 1: Luke runs `npx tsc --noEmit` and the sandbox checks (G3, G4 in the
    plan).
- 2026-11-23: step 2 action plan written: `implementationSteps/step2_DeleteLoadout.md`. Found
  while planning, all listed under "Differences from 05" in the plan: `MultiSelectEmpty.tsx`
  goes in step 4, not step 2; `useRecentProduction.ts` deletion confirmed; the
  `@radix-ui/react-slider` package stays; the `ProductRuleCompliance` type goes with the getter;
  assignment leftovers (above) stay for now. Nothing in step 2 is implemented yet.
- 2026-11-23: status table, open questions and Luke's to-do list written (this section and
  "Open questions"). Step 1's own "For Luke" item (about `useRecentProduction.ts`) is settled.
- 2026-11-24: step 3 action plan written: `implementationSteps/step3_MixChartOnAppMethods.md`.
  Nothing in step 3 is implemented. Found while planning, all listed under "Differences from 05"
  in the plan: step 3 must follow step 2 (three loadout files still read `tracksTankLevel`);
  `equipment/waterProduct.ts` is deleted in step 3 once its helper has moved to
  `mixChart/_lib/waterUnitConfig.ts`; the unused `WATER_PRODUCT_ID` import in the product route
  goes in step 3; `AddProductSheet` switches to `storedRate` in step 3; the delete sheet's props get
  the `Action` suffix; the water column is gated on a picked method because the solver state is
  shared with the App Methods modal.
- 2026-11-24: Luke accepted every default in the step 3 plan's "For Luke" list and said go. Those
  answers are now decisions: `equipment/waterProduct.ts` is deleted in step 3; the Gallons / Fl Oz
  toggle shows only with a picked method and "Include Water" ticked; the delete sheet reads "This
  permanently removes the application method."; no tests for the chart helpers unless asked;
  search-based checks are accepted; step 3 ships after step 2.
- 2026-11-24: step 3 partly implemented (code only; nothing deployed, no stored data touched):
  - Done (plan groups A, B, C, E): the mix chart no longer reads equipment (app method picker,
    title input, Gallons / Fl Oz toggle, water column gated on a picked method); new
    `mixChart/_lib/waterUnitConfig.ts` and `defaultMixChartTitle`; `AddProductSheet` reads
    `storedRate`; unused `WATER_PRODUCT_ID` import removed from the product route; the app method
    delete guard is gone (contract, route, thunk, hook, `getAffectedProducts.ts`) and
    `AppMethodDeleteSheet` is a plain confirm with `Action`-suffixed props;
    `CustomAppMethodEditor.tsx` deleted.
  - Held until step 2 is coded: group F (`tracksTankLevel`, eight files) and item D1 (delete
    `equipment/waterProduct.ts`). The loadout files that step 2 deletes still read the field and
    import the file.
  - Checks: `npx vitest run` 69 files, 944 tests passed; search shows no leftover importer of the
    removed names outside the held items and the equipment module's own copy of the same ops
    (`src/app/equipment/`, deleted in step 4). Not done: `ide_*` diagnostics (unavailable), `tsc`
    (Luke), sandbox checks (Luke).
- 2026-11-24: step 2 implemented, and the held part of step 3 finished (code only; nothing
  deployed, no stored data touched). Luke's go-ahead was "proceed"; the open questions for step 2
  were left at their defaults (assignment leftovers stay, search-based checks accepted, step 1
  deploys first).
  - Step 2: deleted `src/app/loadout/` (7 files), `src/app/scheduling/dailyInventory/` (65 files)
    and `src/app/machines/` (1 file); `hydratePlannedLoadout.ts`, `useAppProducts.ts`,
    `useRecentProduction.ts`, `useByAssignmentCustomers.ts`, `DeepNonNullable.ts`,
    `style/components/slider.tsx` and all of `src/lib/validation/`. `Service` no longer has
    `loadoutInventory` (type, base service, central selector, `makeCustomer`). Removed
    `ServiceUtils.productRuleCompliance` and the `ProductRuleCompliance` type, the four loadout
    reducers, the "Loadout" menu entry and the `loadouts` capability. The `@radix-ui/react-slider`
    package stays.
  - Step 3, held part: `tracksTankLevel` is gone from the eight app method files (the create form
    has no "Tracks Tank Level" box; the Needs Water label now reads "Needs Water (mix chart includes
    water by default)"), and `equipment/waterProduct.ts` is deleted.
  - Checks: a search of `.ts` and `.tsx` files for every removed name found no hit outside these
    notes. `npx vitest run`: 69 files, 944 tests passed. A scan of the edited files found no import
    that my edits left unused (nine imports were already unused in HEAD and are untouched). Not
    done: `ide_*` diagnostics (unavailable), `tsc` (Luke), sandbox checks (Luke).
  - Docs that still name the removed code, left for step 6: the inventory plan and implementation
    docs (`loadoutInventory`), `MirrorRefactor.md` and `customer.readme.md`
    (`useByAssignmentCustomers`), and the assignment docs.

- 2026-11-26: `npx tsc --noEmit` run for steps 1 to 3: clean in `src/`. The only 7 errors are in
  the generated `.next/dev/types/validator.ts` (deleted `dailyInventory` routes) and clear on a
  dev server restart. Stale step 2 lines in the to-do list and the open questions fixed.
  Documentation approach agreed: this file stays; per-step action plans are short checklists
  and only where discovery is risky (step 4, and a runbook for step 7). Steps 5 and 6 get no
  plan file; questions are asked in chat.
- 2026-11-26: step 4 scan (search of `src` and `.claude`, excluding `src/app/equipment/` and this
  folder) for the equipment, package, `mixedBy`, `hydrateRate`, `defaultPackage` and
  `MasterEquipmentPackages` names. Result: no difference from 05. Outside `src/app/equipment/`
  the only code hits are the files 05 already lists: the product module (`ProductContract.ts`,
  product `route.ts`, `ProductsFooter.tsx`, `MasterEditPanel.tsx`, `MasterSubConfig.tsx`,
  `MastersTab.tsx`, `useProduct.ts`, `productSlice.ts`, `productSelectors.ts`,
  `ProductMasterTypes.ts`, `baseProduct.ts`, `ProductDocPropsModel.ts`, `hydrateRate.ts`),
  `store/reducers/index.ts` and `permission/groups/realGreenProducts.ts`. Doc hits (step 6):
  `inventoryImplementation.md`, `UnitUtils_vs_UnitMath_Analysis.md` and the `data-module`,
  `product-module` and `mongo-read` skills. `MultiSelectEmpty.tsx` is imported only by the two
  equipment forms.
- 2026-11-26: step 4 implemented (code only; nothing deployed, no stored data touched). No
  separate action plan, per the agreed approach.
  - Deleted: `src/app/equipment/` (20 files; 05 said 21, and `waterProduct.ts` already went in
    step 3), `product/_lib/selectors/hydrateRate.ts` and
    `components/multiselect/MultiSelectEmpty.tsx`.
  - Removed: the `equipment` and `equipmentPackage` reducers; the `saveMasterEquipmentPackages`
    op (contract, route, thunk, `updateMasterEquipmentPackages` reducer, hook function); the
    `masterEquipmentPackages`, `equipmentDefinitions` and `equipmentPackages` capabilities and
    the two comments about deleting equipment; the commented-out `mixedByEquipmentId`
    migration block in the product route.
  - Product types: `SubProductConfigDoc` is `subId` plus `storedRate`; `SubProductConfig` is
    that plus `subProduct` (`rate` and `mixedByEquipments` gone); `ProductMasterDocProps` and
    `ProductMasterProps` lost the package fields; `ProductSubDocProps.appMethodId` removed from
    the type, the base object and the schema, with the unused `AppMethod` import.
    `productSubs` and `productMasters` no longer take the app method map, so app method,
    equipment and package edits no longer rebuild the masters.
  - UI: the products footer has only the Application Methods badge; the master list loses the
    "Pkg" badge; the master editor loses the Equipment Packages tab and opens on
    "Sub-Products"; `MasterSubConfig` loses "Mixed By" and its two callback props are renamed
    `onRemoveAction` and `onUpdateRateAction` (AGENTS.md `Action` suffix).
  - Checks: a search of `src` for every removed name (`.ts` and `.tsx`) found no hit. `npx
    vitest run`: 69 files, 944 tests passed. Not done: `ide_*` diagnostics (unavailable),
    `tsc` (Luke), sandbox checks (Luke).
  - Docs that still name the removed code stay for step 6.
  - Step 6 detail: the capabilities were removed from the group, so a stored grant for any of
    the three is now ignored and listed as one to clean up in Users and Bundles.

- 2026-11-26: step 5 implemented (code only; nothing deployed, no stored data touched). No
  action plan, per the agreed approach.
  - `ProductRule` is now `ProductRuleDoc` plus `desc`; `baseProductRule` lost `productMasters`.
  - `hydrateProductRules` takes only the rule docs. `progServSelect.progCodes` no longer reads
    `productMastersMap`, so servCodes no longer depend on products at all (no product or unit
    config edit rebuilds them, and through them the customer tree, except via `allProductsMap`).
  - Checked by search: nothing read `ProductRule.productMasters` (`useServCodes` reads `desc`;
    `makeCustomer` sets only `productRules: spec.productRules ?? []`). `npx vitest run`: 69
    files, 944 tests passed. Not done: `ide_*` diagnostics (unavailable), `tsc` (Luke).

- 2026-11-26: step 6 done for everything the agent can do (docs and the `bkp/` folder; no
  application code changed, no stored data touched). No action plan, per the agreed approach.
  - Deleted `src/app/realGreen/product/bkp/` (3 tracked JSON exports; nothing imported them;
    they stay in git history). They show as deleted in `git status`, to commit.
  - Updated: `AGENTS.md` (type naming examples now `AssignmentGroup*` and `PriorityService*`);
    skills `data-module`, `product-module` (op list, the `bkp/` line, the example) and
    `mongo-read` (collection list no longer names `equipment`, `equipmentpackages`,
    `loadoutdocs`); `assignment.readme.md` (loadout rows removed, one note that
    `getBySchedDate`, `getAvailableDates` and four selectors have no caller);
    `assignmentCodeReview.md` (loadout rows removed); `customer.readme.md` and
    `MirrorRefactor.md` (`useByAssignmentCustomers` is gone; examples point at
    `usePriorityServiceCustomers`).
  - Banners instead of rewrites, because the text is a historical design: `inventoryPlan.md`,
    `inventoryImplementation.md` (Monthly Inventory no longer reads services) and
    `UnitUtils_vs_UnitMath_Analysis.md` (`hydrateRate.ts` is gone).
  - Check: a scan of the `.md` files under `src`, `.claude` and the root docs for every removed
    name leaves only those banners, the historical bodies they sit on, and the assignment note.
  - `productivityPlan.md` is not touched here: it names `usedAppProducts`, which step 7 renames,
    so it is updated in step 7 as 05 says.
  - Left for Luke: dropping the three collections (see his to-do list).

- 2026-11-27: step 7 implemented in code (nothing deployed, no stored data touched, no sync
  run). The run order is in `implementationSteps/step7_RenameProductsUsedRunbook.md`.
  - Renamed by a one-off script over 13 files, then checked by diff and search: stored key
    `usedAppProductCores` to `productsUsedCores` (`ServiceModel.ts`, `serviceServerFunc.ts`,
    `Production.ts`); hydrated `usedAppProducts` to `productsUsed` (`hydrateProduction.ts`,
    `completedServiceProductionFallback.ts`, bizPlan selectors); types `AppProductRaw`,
    `AppProductCore`, `AppProduct`, `AppProductProps` to `ProductionProductRaw`,
    `ProductionProductCore`, `ProductionProduct`, `ProductionProductProps`; the file
    `AppProduct.ts` to `ProductionProduct.ts`; `remapAppProducts` to `remapProductionProducts`;
    `ServiceUtils.productsUsed` (getter) and RealGreen's raw `productsUsed` field unchanged.
  - Decision (the step 7 "Later decisions" item, taken by the agent): bizPlan's
    `EnrichedAppProduct` is now `ServiceProductUsage`, and its `enrichedAppProducts` property
    (on `ProductUsagePlanned`) is `serviceProductUsages`. The row is a product used on one
    service, with the service context attached, for actual and planned rows alike.
  - Not in 05's list of files, found by the scan: `bizPlan/products/components/ProductsTable.tsx`
    read `enrichedAppProducts`. The cover sheet PDF (`[routeDate]/page.tsx`) needed only the
    type name and local variable names. `productivityPlan.md` updated.
  - Left as written: the historical inventory docs (their banners already say the code is gone)
    and `AppProduct` mentions in the refactor notes.
  - Checks: no `.ts` or `.tsx` hit for any old name; no collision for the new names;
    `npx vitest run` 69 files, 944 tests passed. Not done: `ide_*` diagnostics (unavailable),
    `tsc` (Luke), the sandbox full sync (Luke).
  - Still hits that are intentional: the stale-looking names in the two inventory docs and the
    refactor notes only.

## Open questions
Updated 2026-11-26. Answers are recorded as decisions (under "Decisions") and removed from here.
Question 4 (search-based checks for step 2) is settled: accepted, and `tsc` has since been run.

### Questions for Luke
Each says what it blocks and what happens if you do not answer.
1. **Assignment leftovers (step 2).** The `getBySchedDate` and `getAvailableDates` ops, the
   `availableDates` field and four selectors in `app/assignment/` were only called by loadout.
   They are shared assignment code, so step 2 leaves them. Remove them later (step 6 or a
   separate cleanup), or leave them for good? Blocks nothing. Default: left in place, noted in
   step 6.
2. **Timing of the loadout deploy (step 2).** A loadout a tech started and did not finish cannot
   be finished once step 2 is deployed (the data stays in `loadoutdocs` until it is dropped).
   Deploy when no loadout is in progress, or accept the loss? Blocks the deploy, not the code.
3. **Deploy order of steps 1 and 2.** Step 1 changes forecast numbers on deploy (accepted).
   Deploy step 1 alone first so you can look at the bizPlan and cover sheet numbers, then step 2?
   Or deploy both together? Step 2 needs step 1 deployed first or in the same release. Default:
   step 1 first.
5. **Dropping `equipment` and `equipmentpackages` (step 6).** Proposed in an earlier round and
   not objected to: you drop them yourself, as you drop `loadoutdocs`, and leftover fields on
   kept collections are left alone. Confirm? Default: treated as agreed.

### Luke's to-do list
Things only you can do. The agent cannot run the app, a build or `tsc`, and does not touch
databases.

Steps 1 to 3 (implemented in code, not deployed):
- [x] Run `npx tsc --noEmit` (2026-11-26, run by the agent at Luke's request). Result: 7 errors,
  all in the generated `.next/dev/types/validator.ts`, all "Cannot find module" for deleted
  `scheduling/dailyInventory` routes. No error in `src/`. They clear when the dev server
  restarts or `.next/dev/types` is deleted. This also settled `productMasterDocMap` fitting the
  new function's parameter and actual rows fitting the narrowed `EnrichedAppProduct`.
- [ ] Restart the dev server (on the sandbox) so the stale generated types are rebuilt.

Step 1 sandbox checks:
- [ ] Run the sandbox checks, G4 in `implementationSteps/step1_PlannedProductsAndInventory.md`:
  bizPlan products page, cover sheet list (all three views), Monthly Inventory.
- [ ] Open the cover sheet PDF for a date and look at it. The agent could not see the layout:
  check it generates, the columns line up where the product text used to be, and the history
  section still lists products used.
- [ ] Optional: re-run `npx vitest run src/__tests__/realGreen/product` (15 tests passed on
  2026-11-23).

Step 2 (implemented in code, not deployed):
- [ ] Sandbox checks: the app loads with no "Loadout" menu entry, the products and app method
  screens work, and the permission editors list `loadouts.*` as a grant to clean up.
- [ ] Answer questions 1 to 3 above (they block the deploy, not the code).
- [ ] After step 2 is deployed: tidy any bundle or user that held `loadouts.read` or
  `loadouts.write` in Users and Bundles (`/permission/users`). The grant is ignored and shows
  as one to clean up. Nothing in code changes.

Step 4 (implemented in code, not deployed):
- [ ] Run `npx tsc --noEmit` and send the errors, if any. Shared types changed
  (`ProductMaster`, `SubProductConfig`, `SubProductConfigDoc`, `ProductSubDocProps`), the product
  contract lost an op, and two reducers left the store.
- [ ] Sandbox checks: Products page footer shows only Application Methods; the Masters tab lists
  masters with a "Sub" badge only; a master opens on Sub-Products, and saving sub-products and
  rates works; the mix chart and bizPlan products page still load.
- [ ] After step 4 is deployed: tidy any bundle or user that held `equipmentDefinitions.*`,
  `equipmentPackages.*` or `masterEquipmentPackages.write` (`/permission/users`).

Step 5 (implemented in code, not deployed):
- [ ] Run `npx tsc --noEmit` together with step 4's (one run covers both).
- [ ] Sandbox check: the ServCode editor still lists rules ("All", "LTE n", "GT n") and the cover
  sheet list still groups by them; bizPlan products page still shows planned products.

Step 6 (docs done):
- [ ] Commit the `product/bkp/` deletion with the rest.
- [ ] Question 1 (assignment leftovers) is still open: leave the five unused assignment items
  for good, or remove them in a separate cleanup? The assignment readme now says they have no
  caller.

Step 7 (implemented in code, not deployed; this is the only step with operational risk):
- [ ] Run `npx tsc --noEmit` (covers steps 4 to 7 together if you have not run it since step 3).
- [ ] Follow `implementationSteps/step7_RenameProductsUsedRunbook.md`: sandbox full sync and
  checks, fresh backup, off-hours deploy, full sync at once. Do not run any sync from this code
  against production before production has it deployed (that includes `/syncUtils` and the dev
  server while `.env.local` points at production).

Housekeeping:
- [ ] Delete the superseded files `00_InitialConversation.md`, `01_InitialConversation.md`,
  `02_RefactorPlan.md`, `03_DiscoveryState.md` and `04_FullDiscoveryState.md` when you are
  ready. Nothing reads them.
- [ ] Optional: repeat the sandbox setup on other machines from
  `src/lib/mongoose/mongoSandbox.readme.md`.

Later:
- [ ] Step 6, after step 4 is deployed: drop the `loadoutdocs`, `equipment` and
  `equipmentpackages` collections.
- [ ] Before step 7: run `backup.ps1`, then `resetSandbox.ps1`, and try the renamed code with a
  local full sync on the sandbox. Deploy step 7 outside working hours and start the full sync
  from `/syncUtils` at once. Never run any sync from the renamed code against the production
  database before production has the renamed code.

### Later decisions (the agent proposes them when the step starts)
- None open. Step 7's name for bizPlan's `EnrichedAppProduct` was settled on 2026-11-27 as
  `ServiceProductUsage` (see the log). Steps 3 to 7 have no separate action plan, by agreement;
  step 7 has a runbook instead.