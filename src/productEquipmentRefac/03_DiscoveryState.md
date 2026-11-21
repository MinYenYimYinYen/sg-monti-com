# 03 Discovery State: round 2 answers and new open questions

Status: discovery. No code changed. Read `02_RefactorPlan.md` first. Where the two files differ,
this one wins.

## Where discovery stands
- All seven open questions in 02 are answered.
- Questions 2, 4, 5 and 6 are closed. Nothing more is needed from Luke on them.
- Questions 1, 3 and 7 are answered, but each answer raised a follow-up. There are four new
  questions (N1 to N4 below).
- N1 blocks step 1, because step 1 edits Monthly Inventory. N4 blocks step 3. N2 and N3 block
  only the rename step, which is new and runs last.
- Steps 2, 4 and 5 have no open question, but they wait on step 1.
- Next: Luke answers N1 to N4. Then the action plan for step 1 can be written.

## Answers, and what was checked

### 1. Products used on a completed service: rename everything, stored key included
- Taken as settled: the hydration stays, so `allProductsMap` stays an input of the customer
  tree. Luke's answer covered the rename only. Say so if the hydration should go instead.
- The stored key `usedAppProductCores` is in five code files: `Production.ts` (type),
  `ServiceModel.ts` (schema), `serviceServerFunc.ts` (the sync writes it),
  `hydrateProduction.ts` (the only reader) and `completedServiceProductionFallback.ts`.
- No query or index names the key. The only nested path queried on a service is
  `productionCore.doneDate`.
- The hydrated names (`usedAppProducts`, `AppProduct`, `AppProductCore`) are in 23 code files.
  Ten of them are deleted with loadout, which leaves 13, plus `ServiceModel.ts`.
- The resync has a catch. See N2 and N3.

### 2. Planned row type: agreed
- The planned products function returns `PlannedProduct` (`productId`, `servId`, `amount`,
  `treated`). bizPlan keeps its own combined type.
- Checked: the bizPlan sites and `CoverSheetCard.tsx` already join the product themselves by
  `productId`, with the base product as the fallback. The new type needs no hydrated product
  on it. The cover sheet PDF page was not read for this.
- `CoverSheetCard.tsx` totals planned rows in a map typed as `AppProduct`. That map needs its
  own type. Small, and decided in the action plan.

### 3. Monthly Inventory: Luke's reading is half right
Luke asked for confirmation that both reads are for choosing which products to inventory. One
is. The other is a display figure.
- Read 1, choosing products: `selectProductIdsFromServices` (`inventorySelect.ts` lines 83 to
  91). It feeds the "By Date" tab of the Select Products sheet. The tab has two sources:
  products recorded on completed services in the date range, and products planned for those
  same services. Only the second source uses loadout.
- Read 2, not choosing products: `selectPredictions` (lines 132 to 151) computes `plannedUsed`.
  `ProductListRow.tsx` shows it as the "Planned:" line under each product, above "Recorded:".
- Neither read reaches the counts or the saved inventory checks. `onHandPredicted` uses the
  recorded amount only.
- The decoupling Luke describes still works. It removes one source from one tab, and one
  display line. See N1.

### 4. Forecast numbers: accepted
Every sub-product on a matching master counts once.

### 5. `productRuleCompliance`: remove
- Checked: its five readers are all under `scheduling/dailyInventory/loadoutFeedback/`.
- The getter and the `ProductRuleCompliance` type both go from `ServiceUtils.ts`.

### 6. `ProductSubDocProps.appMethodId`: remove
- Checked: nothing reads it. It exists only in the type (`ProductSubTypes.ts` line 25) and the
  base object (`baseProduct.ts` line 126).
- No Mongoose schema declares it, so it was never stored. No data to clean up.
- The `AppMethod` import in `ProductSubTypes.ts` has no use in that file and goes with it.

### 7. Mix chart labels: names are clear, and the chart gets an editable title
- The picker shows the app method description. No change to that part of the plan.
- Today the title is built in `mixChart/page.tsx` (lines 113 to 115) from the equipment
  description, and passed to both PDF layouts as `title`. The layouts need no change.
- New: `MixChartConfig` gains a `title` string, edited in a text input in the chart setup.
  It is not saved, like the rest of the setup. See N4.

## Changes to the 02 plan
- Planned products callers: bizPlan (4 sites) and cover sheets (2 sites). Monthly Inventory is
  no longer a caller.
- "What breaks" table: Monthly Inventory loses the planned-products source of the "By Date"
  tab and the "Planned:" line. Nothing replaces them.
- Files that change, added: `inventory/InventoryTypes.ts`, `inventory/_components/ProductListRow.tsx`,
  `product/_lib/types/ProductSubTypes.ts`. The inventory docs under `inventory/docs/` describe
  the planned figure and need the same edit.
- Mix chart: the title is an editable field, not derived from the app method on every render.
  "Chart title" comes off the "Lost" list in the SprayTankMeta section.
- The mix chart empty-state text says "Add equipment and products". It needs new wording.
- New step 7, after the current step 6: rename the products-used names, stored key included,
  then resync. It runs last so the ten loadout files are already gone, and so a problem with
  the sync cannot hold up the rest of the refactor.
- The inventory-counts precondition still stands. Step 1 still edits Monthly Inventory.

## New open questions

N1. Monthly Inventory, the two planned reads. Recommendation:
   - Keep the "By Date" tab, fed by recorded products only. It does not depend on loadout.
   - Remove the "Planned:" line and the `plannedUsed` property. Keep "Recorded:".
   Agree? Or should the whole "By Date" tab go?
     - Luke says: let's remove inventory dependency on the whole Service object type.

N2. Name of the stored key. Recommendation: `productsUsedCores`, beside the hydrated
   `productsUsed`. It follows the existing pair `doneByCores` and `doneBys`. The types become
   `ProductionProductRaw`, `ProductionProductCore` and `ProductionProduct`, and the file
   `AppProduct.ts` becomes `ProductionProduct.ts`. Agree with the names?
    Luke says: yes

N3. How the stored key is switched over. Two facts decide this:
   - `mirrorSync.readme.md` says Re-sync Services upserts over existing documents and does not
     remove fields the sync no longer maps. Only a full sync (wipe and reload) clears them. So
     after a Re-sync every service holds both the old key and the new one. After a full sync
     it holds only the new one.
   - Between deploying the rename and the sync finishing, a mirrored service has only the old
     key. Code that reads the new key sees no products used for it. bizPlan actuals and the
     Monthly Inventory "Recorded:" figure are wrong until the sync finishes.
   Options:
   a. Full sync straight after deploy, and accept wrong figures until it finishes.
   b. Read the new key and fall back to the old one. Run Re-sync Services at any time, then
      remove the fallback. Old keys stay on the documents until the next full sync.
   c. Same as b, then a full sync later to clear the old keys.
   Recommendation: b. No window of wrong data and no wipe. Which one?
   Also needed: do local development and production share one mirror database? If they do, the
   rename cannot be tested locally without affecting production reads.
   - Luke says: A full sync is no problem.  I don't want a fallback.
     Regarding the database: Up to this point there is only one database and it's the production database.  I think this level of a refactor justifies a side mission, which would be wiring up a local copy of the production database, and the ability to sync the two (we get a backup copy this way too), and the ability to switch dev db to/from the local copy.  The switch would be handled in .env.local and I'm thinking this could be achieved by commenting/uncommenting different MONGO_DB_URI lines.  I don't want development to always be restricted to one or the other.

N4. Mix chart title, when a different app method is picked after the title was edited.
   Recommendation: picking a method always resets the title to the default built from that
   method's description. Reset (which reloads the method into the editor) leaves the title
   alone. Agree? The alternative is to keep an edited title until the page is reloaded.
    Luke says: yes

## Not verified
Everything listed under "Not verified" in 02 still stands. Added this round:
- `runServiceResync.ts` was not read. The Re-sync behaviour in N3 comes from
  `mirrorSync.readme.md` only.
- What a reader gets for a missing `productsUsedCores` on an old document: an empty list or
  `undefined`. It depends on whether the mirror read path applies schema defaults. Option b in
  N3 avoids the question.
- Whether Monthly Inventory still needs `useProgServ` once the planned reads are gone. The
  comment in `useInventoryDeps.ts` gives loadout hydration as the reason for it. The customer
  tree may need servCodes anyway. Left in place unless checked.
- `MixChartSetup.tsx` and `AppMethodOverrideSection.tsx` were matched by search, not read.
  `MixChartConfig.appMethodOverride` may be unused: the page reads the solver result directly.
- The 13 files that keep the products-used names were found by search. Not all were read.
- No test or builder mentions the names being removed, apart from `loadoutInventory` in
  `_builders/makeCustomer.ts`, which 02 already lists.