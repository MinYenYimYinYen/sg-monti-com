# Step 3 action plan: mix chart on app methods; app method cleanup

Status: plan written 2026-11-24. Luke accepted all defaults and said go the same day. Groups A, B, C and E are coded (2026-11-24). Step 2 was coded the same day, so groups D and F are done too. Open: G1 (partly done), G5 (Luke: `npx tsc --noEmit`) and G6 (Luke: sandbox checks).

Parent file: `05_FullStateSandboxSetup.md` holds the decisions, the facts and the order of work.
This file adds the file-level detail for step 3 only. Progress on this step is ticked off here
and summarised under "Progress" in 05. Step 2 is the previous action plan
(`step2_DeleteLoadout.md`).

## Goal
1. The mix chart no longer reads equipment. It picks a saved app method directly, has a
   gallons / fl oz toggle and an editable title (05, "Mix chart").
2. The app method delete guard is gone. Delete is a plain confirm, and `getAffectedProducts.ts`
   is deleted.
3. `tracksTankLevel` is gone from the app method type, model, route and create form.
4. Files that lose their last importer here are deleted here: `mixChart/components/CustomAppMethodEditor.tsx`
   and `equipment/waterProduct.ts` (its useful parts move to `mixChart/_lib/`).

Chart math and both PDF layouts do not change. Nothing in step 3 changes stored data.

## Order dependency
Step 3 must be coded after step 2, or in the same release. Two reasons, both checked by search:
- `tracksTankLevel` is read outside `src/app/appMethod/` only by loadout files
  (`loadout/LoadoutValidator.ts` lines 25 and 42, `dailyInventory/loadoutFinish/components/
  EquipmentFinishSection.tsx`, `dailyInventory/loadoutStart/components/EquipmentSection.tsx`). All
  are deleted by step 2. Removing the field from `AppMethod` before then breaks them at compile time.
- `equipment/waterProduct.ts` is deleted here only once its other importers (three files step 2
  deletes) are gone.
The same applies to deploying: step 3 never ships before step 2.

## Skills and reading
Read each when the work it covers starts.
- `product-module` skill: read (done at planning). The mix chart lives under
  `src/app/realGreen/product/mixChart/` (05 writes it as `mixChart/`).
- `api-route` skill: read (done at planning). Group E removes an op and a param from an existing
  contract. No new route, thunk or capability.
- `ui-styling` skill: read (done at planning). Item C2 adds a picker, a title input and a toggle.
  The page already uses `RadioGroup variant="button-group"`: reuse it. At the end, search the diff
  for `bg-white`, `bg-blue`, `bg-green` and `text-gray`.
- The files each item names, when the item starts. Nothing else.
- No test exists for any of this code (a search of `src/__tests__` for `appMethod` and `mixChart`
  finds nothing). None is added unprompted (see "For Luke", question 4).

## Facts checked against the code (2026-11-24)
Line numbers are as of that day.

### Mix chart today (`src/app/realGreen/product/mixChart/`)
- `page.tsx` (242 lines) holds `MixChartConfig` in `useState`. It calls `useProduct({ autoLoad })`
  and `useEquipment({ autoLoad })`. `useProduct` already calls `useAppMethod({ autoLoad })`, so app
  methods load without equipment.
- Equipment is read at: `page.tsx` lines 8, 40, 56, 73, 77-78, 86, 113-115; `MixChartSetup.tsx`
  lines 4, 39, 45-65, 94-147 and 150; `AppMethodOverrideSection.tsx` lines 13, 21, 40;
  `MixChartTypes.ts` lines 2 and 36. `mixChartUtils.ts` imports `Equipment` at line 3 and the file
  body does not appear to use it (confirm in item C4).
- `showFlOz` affects only the water column (`buildMixChartColumns`, `calcWaterRatePerKsf`).
- `MixChartConfig.appMethodOverride` is set to `null` at `page.tsx` line 41 and `MixChartSetup.tsx`
  line 61 and read nowhere. The page reads the live solver result with `solverSelect.solution`
  (line 73).
- `loadSavedAppMethod` already ends by dispatching `setSolveForField({ param: "coverage", field:
  "volume" })`. `MixChartSetup.handleEquipmentChange` and `AppMethodOverrideSection.handleReset`
  dispatch it again, so both repeats are redundant.
- The solver state is the global `createAppMethod` slice, shared with the App Methods modal. The
  mix chart page renders `ProductsFooter`, whose "Application Methods" badge opens that modal.
  Editing a card there changes the same solver result the chart reads. This is how it works
  today and step 3 does not change it (see "Risks").
- `AddProductSheet.tsx` reads `config.rate` on a master's sub-product config (lines 62 and 181).
  `SubProductConfig` has both `rate` (line 45) and `storedRate` (line 32), and `rate` is the same
  number (`hydrateRate` returns `storedRate`).
- `mixChart/components/CustomAppMethodEditor.tsx` (252 lines) has no importer.
  `AppMethodOverrideSection` is imported only by `MixChartSetup`, and `MixChartSetup` only by
  `page.tsx`.

### Water unit config
- `equipment/waterProduct.ts` holds `WATER_PRODUCT_ID`, `buildWaterUnitConfig` and the
  `waterProduct` object. Importers: `mixChart/_lib/mixChartUtils.ts` (kept), `product/api/route.ts`
  line 36 (an import nothing uses), and three files step 2 deletes (`loadout/rehydrateLoadout.ts`,
  `customer/selectors/hydratePlannedLoadout.ts`, `dailyInventory/components/mixWizard/MixWizard.tsx`).
- After step 2 nothing uses the `waterProduct` object. `WATER_PRODUCT_ID` is used only inside
  `buildWaterUnitConfig`.
- Both doc comments in the file name the equipment's `showFlOz` and `hydratePlannedLoadout`.

### App method delete guard
- `AppMethodContract.ts`: the `checkDependencies` op, the `clearReferences` param on `deleteOne`
  and the `EquipmentDoc` import.
- `api/route.ts`: the `checkDependencies` handler (lines 80-112), the `clearReferences` branch of
  `deleteOne` (lines 48-72), the comment above `deleteOne` (lines 42-43) and the imports
  `ProductDocPropsModel`, `EquipmentModel` and `EquipmentDoc`. `cleanMongoArray` stays (`getAll`).
- `appMethodSlice.ts`: the `checkDependencies` thunk and its entry in `appMethodActions`.
- `useAppMethod.ts`: `clearReferences` on `deleteAppMethod`, and `checkAppMethodDependencies`.
- `AppMethodDeleteSheet.tsx` (265 lines): everything except the sheet shell, the method badge and
  the Cancel / Delete buttons. Its only importer is `AppMethodCreate.tsx` (import line 32, used at
  line 226). Its function props (`onOpenChange`, `onDeleteComplete`) lack the `Action` suffix that
  AGENTS.md requires.
- `getAffectedProducts.ts`: its only importer is the delete sheet.
- Interim state until step 4: a delete no longer clears the method from equipment or packages. The
  selectors tolerate a dangling id: `equipmentSelect.equipments` falls back to `baseAppMethod`, and
  `hydrateEquipmentPackages` drops the equipment (`if (!appMethod) return []`).

### `tracksTankLevel` (eight files, all under `src/app/appMethod/`)
- `AppMethodTypes.ts` (type line 26, base object line 40), `AppMethodModel.ts` (line 45),
  `api/route.ts` (line 31).
- Under `appMethodCreate/`: `AppMethodCreate.tsx` (lines 57, 73, 85, 179-186),
  `createAppMethodSlice.ts` (lines 24, 61, 112-114, 218), `loadSavedAppMethod.ts` (line 43),
  `useFormFieldValues.ts` (the `setTracksTankLevel` function), `selectors/solverSelect.ts` (lines
  22-23 and its entry in the exported object).
- After step 2 nothing reads it. `needsWater` stays: its only job is to default the chart's
  "Include Water" checkbox. Its comment in `AppMethodTypes.ts` (line 25) names the loadout.
- Stored `appmethods` documents keep their `tracksTankLevel`. The schema is strict and the upsert
  no longer sends the field, so the old value is neither read nor removed.

## Design (what the code looks like afterwards)
Decisions are in 05, "Mix chart". This section adds only the file-level shape.
- `MixChartConfig` = `appMethod: AppMethod | null`, `showFlOz: boolean`, `title: string`,
  `includeWater: boolean`, `products: MixChartProductRow[]`. `appMethodOverride` is gone.
- Defaults in `page.tsx`: `appMethod: null`, `showFlOz: false` (gallons), `title: "Mix Chart"`,
  `includeWater: false`, `products: []`.
- New pure helper in `mixChartUtils.ts`: `defaultMixChartTitle(appMethod)` returning
  `Mix Chart — <description>` (the format `page.tsx` builds from the tank today). The setup calls
  it, so the format lives in one place and can be tested later.
- Effective method on the page: `config.appMethod` is the gate. When it is null, there is no water
  column. When set, the method used is the live solver result if `solution?.success`, else
  `config.appMethod`. The gate matters because the solver slice is global and may hold a leftover
  from the App Methods modal before anything is picked.
- Picking a method (`MixChartSetup`): `loadSavedAppMethod(method, dispatch)` (it already selects
  "solve for coverage volume"), then one `onConfigChangeAction` with `appMethod`,
  `includeWater: method.needsWater` and `title: defaultMixChartTitle(method)`. `showFlOz` and the
  product rows are kept. The title is overwritten even if it was edited (05).
- Reset in `AppMethodOverrideSection`: `loadSavedAppMethod(appMethod, dispatch)`. It touches
  neither the title nor the toggle.
- `AppMethodOverrideSection` props: `appMethod: AppMethod` only. The empty
  `onSolutionChangeAction` callback and its `onSolutionChange(null)` call go.
- The water helper moves to `mixChart/_lib/waterUnitConfig.ts`: `WATER_PRODUCT_ID` and
  `buildWaterUnitConfig`. Comments are reworded: the flag is the chart's `showFlOz`, not the
  equipment's. The `waterProduct` object is not moved.
- The toggle uses the page's existing `RadioGroup variant="button-group"` ("Gallons" / "Fl Oz"), in
  the setup panel next to "Include Water". Shown only when a method is picked and Include Water is
  ticked (the toggle affects the water column only).
- The title is an `Input` in the setup panel, above the method picker.
- Delete sheet afterwards: title, a one-line explanation, the method badge, Cancel and Delete.
  Function props become `onOpenChangeAction` and `onDeleteCompleteAction`.

## Work items
Tick each box when done. Do group A first: B and C import from it. After that the groups are
independent, except that D1 comes last (it needs every importer of `waterProduct.ts` gone).

### A. Water helper moves into the mix chart
- [x] A1. Create `mixChart/_lib/waterUnitConfig.ts` with `WATER_PRODUCT_ID` and
  `buildWaterUnitConfig(showFlOz)`, copied from `equipment/waterProduct.ts` (lines 15 and 37-87)
  with the comments reworded (no "equipment", no `hydratePlannedLoadout`). Same imports minus
  `baseProductSub`, `ProductSub` and `UnitConfigDisplay`.
- [x] A2. `mixChartUtils.ts`: import `buildWaterUnitConfig` from `./waterUnitConfig` (relative, as the
  file already sits in `_lib/`; keep the `@/` form if neighbours use it, and match the file). Delete
  the unused `Equipment` import (line 3). Reword the comment at line 62 ("based on
  equipment.showFlOz" becomes "based on the chart's showFlOz").
- [x] A3. `product/api/route.ts`: delete the unused `WATER_PRODUCT_ID` import (line 36). It must go
  here: item D1 deletes the file it imports from. Search the file first to confirm the name appears
  nowhere else. The commented-out migration block in the same route is left for step 6.

### B. Types and the pure title helper
- [x] B1. `MixChartTypes.ts`: replace the `Equipment` import with `AppMethod`; remove the
  `AppMethodResult` import; set `MixChartConfig` as in "Design". Reword the doc comment on
  `MixChartProductRow` (it names `mixedByEquipmentIds`, which step 4 removes).
- [x] B2. `mixChartUtils.ts`: add `defaultMixChartTitle(appMethod: AppMethod): string`. Pure, no
  Redux, no React.

### C. The mix chart screen
- [x] C1. `page.tsx`:
  - remove the `useEquipment` import and call (lines 8 and 56);
  - `DEFAULT_CONFIG` as in "Design";
  - `effectiveAppMethod`: null when `config.appMethod` is null, else the solver result if
    `solution?.success`, else `config.appMethod`;
  - `waterRatePerKsf`: `effectiveAppMethod && config.includeWater` then
    `calcWaterRatePerKsf(effectiveAppMethod, config.products, config.showFlOz)`;
  - `showFlOz: config.showFlOz` in `buildMixChartColumns`;
  - `chartTitle` is `config.title` (delete the equipment-based ternary, lines 113-115);
  - empty-state text (line 232): "Add equipment and products to generate a chart." becomes "Add
    products to generate a chart."
  - the existing `useSelector as useReduxSelector` alias stays as it is.
- [x] C2. `MixChartSetup.tsx`:
  - remove `equipmentSelect` and the `allEquipment` selector;
  - Title: `Label` + `Input` (value `config.title`, `onChange` updates `title`);
  - Step 1, "Application method": `Select` over `appMethodSelect.appMethodDocs`, value
    `config.appMethod?.appMethodId ?? ""`, items labelled by `description`, handler per "Design";
  - Step 2, the collapsible "Customize Application Method" section: gate on `config.appMethod`, pass
    `appMethod={config.appMethod}`;
  - Step 3: gate on `config.appMethod`; add the Gallons / Fl Oz toggle beside "Include Water";
  - delete the empty `onSolutionChangeAction` callback and the now-redundant
    `setSolveForField` dispatch (and the `createAppMethodActions` import if nothing else uses it).
  - Prop names stay `onConfigChangeAction` etc. (already satisfy the `Action` rule).
  - Edge case, accepted and not handled: if the picked method is deleted from the modal while the
    chart is open, the Select shows blank and the chart keeps its own copy of the method.
- [x] C3. `AppMethodOverrideSection.tsx`: props become `{ appMethod: AppMethod }`; `handleReset`
  calls `loadSavedAppMethod(appMethod, dispatch)` only; drop the `Equipment` import, the
  `onSolutionChange` plumbing and the unused `setSolveForField` dispatch (and unused imports).
- [x] C4. `AddProductSheet.tsx`: `config.rate` becomes `config.storedRate` at lines 62 and 181. Step 4
  deletes `SubProductConfig.rate`, so this keeps step 4 from breaking the chart. `ProductList.tsx`
  is unchanged (its `rate` is the chart row's own field).
- [x] C5. Delete `mixChart/components/CustomAppMethodEditor.tsx` (search shows no importer) and the
  empty `components/` folder.

### D. Delete the old water file (last, after A2, A3 and step 2)
- [x] D1. Search `src` for `equipment/waterProduct`. Expected hits: none outside `.md` files. Then
  delete `src/app/equipment/waterProduct.ts`. The rest of `src/app/equipment/` stays until step 4.

### E. App method delete guard
Contract, route, thunk, hook, sheet. Follows the `api-route` skill: no new op, no capability change
(`can.appMethods.delete` stays on `deleteOne`).
- [x] E1. `api/AppMethodContract.ts`: remove the `checkDependencies` op, the `clearReferences`
  param of `deleteOne`, and the `EquipmentDoc` import.
- [x] E2. `api/route.ts`: remove the `checkDependencies` handler, the `clearReferences` branch and
  the comment above `deleteOne`. `deleteOne` becomes `await connectToMongoDB()`, `deleteOne` on the
  model, return the payload. Remove the imports `ProductDocPropsModel`, `EquipmentModel` and
  `EquipmentDoc`. Keep `cleanMongoArray` (`getAll`) and `can`.
- [x] E3. `appMethodSlice.ts`: remove the `checkDependencies` thunk and its entry in
  `appMethodActions`.
- [x] E4. `useAppMethod.ts`: `deleteAppMethod` takes `{ appMethod }` only; remove
  `checkAppMethodDependencies` and its return entry.
- [x] E5. `AppMethodDeleteSheet.tsx`: rewrite to the shell described under "Design". Remove
  `useMemo`, `React.useEffect`, the equipment and product state, `productSelect`, `appMethodSelect`,
  `ScrollArea`, `Select*`, `Label`, `AlertTriangle`, `XCircle`, `EquipmentDoc` and
  `getAffectedProducts`. Rename the function props to `onOpenChangeAction` and
  `onDeleteCompleteAction` (AGENTS.md "Action suffix"). Keep the `canDelete` check on the Delete
  button and the `isDeleting` state. Behaviour of the delete call itself does not change.
- [x] E6. `AppMethodCreate.tsx` (lines 226-231): pass the renamed props to the sheet.
- [x] E7. Delete `realGreen/product/_lib/selectors/getAffectedProducts.ts` (its only importer is the
  sheet; confirm by search first).

### F. Remove `tracksTankLevel`
All in `src/app/appMethod/`. Do this after step 2 (see "Order dependency").
- [x] F1. `AppMethodTypes.ts`: remove the property and the base-object entry. Reword the comment on
  `needsWater` (it says "in loadout") to say it defaults the mix chart's "Include Water" box.
- [x] F2. `AppMethodModel.ts`: remove the schema entry. Reword the "Water carrier flags" comment.
- [x] F3. `api/route.ts`: remove the `tracksTankLevel` default in `upsert`. Keep the `needsWater`
  default.
- [x] F4. `createAppMethodSlice.ts`: remove the state field, its initial value, the
  `setTracksTankLevel` reducer and its line in `resetForm`.
- [x] F5. `useFormFieldValues.ts`: remove `setTracksTankLevel`.
- [x] F6. `selectors/solverSelect.ts`: remove `selectTracksTankLevel` and its entry in the exported
  object.
- [x] F7. `loadSavedAppMethod.ts`: remove the `setTracksTankLevel` dispatch (line 43).
- [x] F8. `AppMethodCreate.tsx`: remove `setTracksTankLevel`, the `tracksTankLevel` selector, the
  field in `handleSave` and the checkbox block (lines 179-186). Reword the "Needs Water (auto-add
  carrier row)" label to "Needs Water (mix chart includes water by default)".

### G. Check
No `ide_*` tools are available in this session. Step 1 and step 2 used search and re-reading
(Luke agreed for step 1; see "For Luke", question 5).
- [ ] G1. For every edited file (groups A to F): re-read it after the edit. For each import in it,
  confirm with a search that the name is still used (`noUnusedLocals` is on), and that every name
  still used is imported. List any file where this could not be settled.
- [x] G2. Search `src` for every removed name and confirm no importer is left: `tracksTankLevel`,
  `TracksTankLevel`, `checkDependencies`, `checkAppMethodDependencies`, `clearReferences`,
  `getAffectedProducts`, `AffectedProduct`, `appMethodOverride`, `CustomAppMethodEditor`,
  `equipment/waterProduct`, and `useEquipment` / `equipmentSelect` inside `mixChart/`. Expected
  hits: the `productEquipmentRefac` notes only. (A search of the `.md` files under `src` and
  `.claude` outside that folder found none of these names on 2026-11-24.)
- [x] G3. Search the diff for `bg-white`, `bg-blue`, `bg-green`, `text-gray` (ui-styling check).
- [x] G4. The agent runs `npx vitest run` (whole suite), using the `cmd /c` form that worked in step
  1. No test mentions the app method or the mix chart, so no change is expected. Report file and
  test counts. No test is added or changed unless Luke says so (question 4).
- [ ] G5. Luke runs `npx tsc --noEmit`. Triggers: shared types changed (`AppMethod`,
  `AppMethodDoc`, `MixChartConfig`, the `AppMethodContract` ops and params), exports removed
  (`checkDependencies`, `setTracksTankLevel`, `getAffectedProducts`, `waterProduct.ts`), function
  props renamed (`AppMethodDeleteSheet`), and files deleted.
- [ ] G6. Luke tries it on the sandbox (`sgSandbox`; no backup needed, this step changes no stored
  data except what a normal app method save or delete does):
  - Mix chart: the title box starts as "Mix Chart". Pick a method: the title becomes "Mix Chart —
    <description>", "Include Water" follows that method's `needsWater`, and the customize section
    shows its values. Edit the title: the PDF follows. Pick another method: the title is replaced.
    Reset: the title and toggle stay.
  - Mix chart: add products from a master (the rate shown in the sheet and the chart column is the
    stored rate), a sub and a single. Tick "Include Water": a water column appears. Switch Gallons
    / Fl Oz: only the water column's unit changes. Choose Water as the key column: still works.
    Change a value in the customize section: the water amount changes.
  - The Equipment and Equipment Packages badges are still in the footer (step 4 removes them).
  - App Methods modal: create a method (no "Tracks Tank Level" box; "Needs Water" is there), edit
    and save an old method that still has the stored field, then delete one. Delete shows a plain
    confirm with Cancel and Delete, no equipment or product lists, and the method disappears.
  - Optional: with the modal open on the mix chart page, confirm the chart reflects edits made there
    (known, unchanged behaviour; see "Risks").

## Risks
1. **Shared solver state (unchanged, now more visible).** The mix chart and the App Methods modal
   share the global `createAppMethod` slice. Selecting or editing a card in the modal changes the
   solver result the chart reads, and `resetForm` (run when a card is selected or deselected) can
   clear it. The `config.appMethod` gate (item C1) stops a leftover solver result from producing a
   water column before anything is picked. The sharing itself is left alone: a separate solver state
   for the chart would touch the `appMethodCreate` field components, which read the global slice.
2. **Overwritten title.** Picking a method always replaces an edited title (05 decision). Easy to
   change later if it annoys people.
3. **Dangling ids until step 4.** After E2, deleting an app method no longer clears it from
   equipment or packages. The selectors tolerate a missing method (see "Facts"). No user-visible
   effect expected; the Equipment and Packages modals still open until step 4.
4. **Order.** Step 3 must not ship before step 2 (see "Order dependency").

## For Luke (open, small)
Defaults apply if you do not answer. None blocks reading the plan.
1. **Water file.** 05 only said the `waterProduct` object is not moved. This plan also deletes
   `equipment/waterProduct.ts` in this step (item D1): its helper moves to `mixChart/_lib/` and its
   last other importers go in step 2. Otherwise it would sit until step 4 deletes the folder.
   Default: delete it in step 3.
2. **Toggle position.** Gallons / Fl Oz shows only when a method is picked and "Include Water" is
   ticked, since it affects only the water column. Default: as described.
3. **Delete sheet wording.** The sheet becomes a short confirm: "This permanently removes the
   application method." Default: use that sentence.
4. **Tests.** `defaultMixChartTitle`, `calcWaterRatePerKsf` and `buildMixChartColumns` are pure and
   have no tests. Want tests for them (the `write-tests` skill and `testing.readme.md` apply)?
   Default: no tests, asked again when the step is done.
5. **Search-based checks.** Same acceptance as steps 1 and 2 (G1, G2, G4 plus your `tsc`)? Default:
   yes, asked again only if the `ide_*` tools come back.
6. **Release.** Step 3 ships with step 2 or after it, never before. Default: after step 2 is
   deployed and checked, as in 05's open question 3.

## Differences from 05
Found while planning. 05 is updated to match once Luke approves the plan.
1. The mix chart folder is `src/app/realGreen/product/mixChart/`, not a top-level `mixChart/`.
2. Order: step 3 needs step 2, because three loadout files still read `tracksTankLevel`. 05's order
   lists step 2 first but does not say why it matters.
3. `equipment/waterProduct.ts` is deleted in step 3 (question 1). 05 implied step 4.
4. Item A3 is new: the unused `WATER_PRODUCT_ID` import in `product/api/route.ts` must go in this
   step, not step 6, or deleting the file breaks the product route's compile.
5. Item C4 (`AddProductSheet` reads `storedRate`) is in 05's "Target design" for the mix chart, but
   05's step 3 text did not list it. It is done here so step 4 can delete `SubProductConfig.rate`.
6. New: `AppMethodDeleteSheet` function props are renamed with the `Action` suffix (AGENTS.md).
7. New: the `config.appMethod` gate on the water column (Risk 1).
8. `useAppMethod.ts`, `appMethodSlice.ts` and the `AppMethodCreate.tsx` call sites change too. 05
   listed the files; the exact edits are now in groups E and F.

## Done when
Every box above is ticked, `npx vitest run` and `npx tsc --noEmit` pass, the sandbox checks in G6
pass, and the results are noted under "Progress" in `05_FullStateSandboxSetup.md`.