# Step 2 action plan: delete loadout

Status: plan written 2026-11-23. Implemented in code 2026-11-24 (groups A to C done; D1 to D3 done by search and `npx vitest run`). Open for Luke: D4 (`npx tsc --noEmit`) and D5 (sandbox checks). Nothing deployed.

Parent file: `05_FullStateSandboxSetup.md` holds the decisions, the facts and the order of work.
This file adds the file-level detail for step 2 only. Progress on this step is ticked off here
and summarised under "Progress" in 05. Step 1 is the previous action plan
(`step1_PlannedProductsAndInventory.md`).

## Goal
1. The loadout feature is gone: `src/app/loadout/`, `src/app/scheduling/dailyInventory/` and
   `src/app/machines/`.
2. `Service` no longer carries `loadoutInventory`. The customer tree stops building it for every
   service.
3. The four loadout reducers, the "Loadout" menu entry and the `loadouts` capability are gone.
4. Every file that only the loadout code imported is deleted with it.

Step 2 must be deployed in the same release as step 1, or after it. Step 1 moved the last
outside readers of `Service.loadoutInventory` (bizPlan, cover sheets, Monthly Inventory) off it.
Nothing in step 2 changes stored data. After the deploy a tech cannot start or finish a loadout,
and the screens at `/scheduling/dailyInventory/...` give a 404 (both accepted in 05).

## Skills and reading
Read each when the work it covers starts.
- `realgreen-customer` skill: read. Item A removes a property from the hydrated `Service`, in
  `centralSelectors.ts`, `baseService.ts`, `ServiceTypes.ts` and the `makeCustomer` builder.
  Read `customer/selectors/howToHydrate.md` only if something in `centralSelectors.ts` is
  unclear. Do not read the long readmes.
- `permission` skill: read (done at planning). Removing a resource needs no data change, no
  `GatedPanel` change and no handler change outside the deleted folder. The skill's bundle
  reminder runs the other way: see "For Luke".
- `src/store/reducers/index.ts`, `NavMenu.tsx`: read when item B starts.
- No other skill applies: no new API route, slice, page or styling, and no tests are added.

## Facts checked against the code (2026-11-23)
Line numbers are as of that day.

### What is deleted
- `src/app/loadout/`: 7 files, 1,145 lines (`loadoutSelect.ts`, `loadoutSlice.ts`,
  `LoadoutTypes.ts`, `LoadoutValidator.ts`, `Mixture.ts`, `rehydrateLoadout.ts`,
  `useLoadout.ts`).
- `src/app/scheduling/dailyInventory/`: 65 files. This includes seven Next.js routes
  (`layout.tsx`, `page.tsx`, `api/route.ts`, and the pages under `loadoutFeedback/report`,
  `loadoutFeedback/[employeeId]/[routeDate]`, `loadoutFinish`, `loadoutStart`), the Mongoose
  model `models/LoadoutDocModel.ts` and a notes file `loadoutFeedback/feedBackData.md`.
- `src/app/machines/`: 1 file, `MachineTypes.ts`.

### Who imports the deleted code from outside
Every import of `@/app/loadout`, `@/app/scheduling/dailyInventory` or `@/app/machines` from a
file outside those folders, in `src` (tests included; no test mentions any of it):
- `realGreen/customer/selectors/hydratePlannedLoadout.ts` (deleted here).
- `realGreen/customer/_lib/entities/bases/baseService.ts`: `baseLoadout` (lines 9, 52, 67).
- `realGreen/customer/_lib/entities/types/ServiceTypes.ts`: `LoadoutBase` (lines 14, 153).
- `_builders/makeCustomer.ts`: `baseLoadout` (lines 65, 426) and a comment naming
  `loadoutInventory` (line 81).
- `store/reducers/index.ts`: four reducers (imports at lines 31, 32, 33, 39; keys at 117, 118,
  119, 138).
- `components/navBar/NavMenu.tsx`: the "Loadout" entry (lines 53-57).
- No relative imports leave the deleted folders, and nothing outside reads `state.loadout`,
  `state.loadoutStart`, `state.loadoutFinish` or `state.loadoutReport`.

### Other code that stops being used (checked by reading every import of the deleted files)
- Only the deleted files import these, so they are deleted too:
  - `realGreen/customer/selectors/hydratePlannedLoadout.ts`. It is also the last caller of
    `getProductMasters` and `PackageSelection`. `centralSelectors.ts` is its only other
    importer (item A3).
  - `realGreen/customer/_lib/hooks/useAppProducts.ts`: an empty stub that nothing imports.
  - `realGreen/customer/hooks/useRecentProduction.ts`: its last importers are the loadout
    report (deleted here) and, until step 1, Monthly Inventory. Proposed in 05, now confirmed by
    the scan.
  - `realGreen/customer/hooks/useByAssignmentCustomers.ts`: its only user was the loadout page.
  - `lib/primatives/typeUtils/DeepNonNullable.ts`.
  - All of `lib/validation/` (`BaseValidator.ts`, `createValidationSelectors.ts`,
    `getFieldPath.ts`): they import each other, and nothing else imports any of them.
  - `style/components/slider.tsx`: only `MixWizard.tsx` used it. The package
    `@radix-ui/react-slider` stays in `package.json`: `BurndownChart.tsx` and
    `GoalMultiplierSlider.tsx` import it directly.
- Not orphaned, so they stay: every other module the deleted code imports has an importer outside
  the deleted folders. The scan found no further orphans. In particular
  `components/multiselect/MultiSelectEmpty.tsx` is **not** orphaned: only the two equipment
  forms use it, and they go in step 4 (05 said step 2; see "Differences from 05").
- Left in place (nothing outside the loadout code calls them any more):
  - In `app/assignment/`: the `getBySchedDate` and `getAvailableDates` ops (contract, route,
    thunk, reducer case), the state field `availableDates`, and the selectors `availableDates`,
    `techsForDate`, `servIdsForDate`, `servIdsByEmployeeAndSchedDate`. Their comments name the
    loadout. `getBySchedDateRange` and `useAssignments` are used elsewhere. Removing the rest
    touches the shared assignment contract and slice, so it is not done here (see "For Luke").
  - The `recentProduction` and `byAssignment` customer contexts (05 decision). Their slices,
    `customerSlices.ts` entries, search scheme and `PIPELINE` flags stay.
  - `equipment/waterProduct.ts` and the `needsWater` field: the mix chart still uses them
    (steps 3 and 4). Two comments there name loadout; they change with those steps.

### The customer tree
- `centralSelectors.ts` builds `loadoutInventory` in two places: a placeholder object at line
  274 (in the fallback shape for services with no stored production) and
  `hydratePlannedLoadout({ servDoc, servCodeMap })` at line 282. `servCodeMap` is still used at
  line 229, so the `selectServCodeMap` input stays.
- Removing it also removes the planned-loadout work that ran for every service on every rebuild
  of the customer tree.
- `ServiceUtils.productRuleCompliance` (lines 169-209) and the type `ProductRuleCompliance`
  (line 14, exported, no importer other than this file) are read only by five deleted files
  under `loadoutFeedback/`. `AppProduct` stays imported in `ServiceUtils.ts` (the `productsUsed`
  getter uses it). After the getter goes, `ProductRule.productMasters` is read by no code except
  `hydrateProductRules.ts` (step 5).
- `makeCustomer.ts` lists the fields its spec does not cover: the compile-time coverage check
  picks only external props from `ServiceProps`, and `loadoutInventory` is derived, so removing
  it from `ServiceProps` cannot break the check.

### Permissions and navigation
- `loadouts` (`name: "Daily loadouts"`, verbs `read` and `write`) is defined at
  `permission/groups/scheduling.ts` line 34, with a two-line comment above it. All `can.loadouts`
  uses are inside the deleted folder, in `NavMenu.tsx` (line 56) and nowhere else.
- A stored grant for a removed capability is ignored (05, "Permissions"). The permission editors
  list it as a grant to clean up.

### Docs that name the deleted code (changed in step 6, not here)
`.claude/skills/mongo-read/SKILL.md` (`loadoutdocs`), `assignment.readme.md`,
`assignmentCodeReview.md`, `inventory/docs/inventoryPlan.md`,
`inventory/docs/inventoryImplementation.md`, and two files about the removed hook:
`customer/customer.readme.md` and `customer/mirror/MirrorRefactor.md`
(`useByAssignmentCustomers`). `feedBackData.md` is deleted with its folder.

## Work items
Order matters. First edit the kept code so nothing outside the loadout code refers to it (A, B),
then delete (C), then check (D). The app compiles after each letter. Tick each box as it is done.

### A. Customer tree: `Service` loses `loadoutInventory`
- [x] A1. `realGreen/customer/_lib/entities/types/ServiceTypes.ts`: remove the `LoadoutBase`
  import (line 14) and the `loadoutInventory: LoadoutBase;` property of `ServiceProps` (line
  153).
- [x] A2. `realGreen/customer/_lib/entities/bases/baseService.ts`: remove the `baseLoadout`
  import (line 9) and the two `loadoutInventory: baseLoadout,` lines (52 and 67).
- [x] A3. `realGreen/customer/selectors/centralSelectors.ts`: remove the `hydratePlannedLoadout`
  import (line 29), the placeholder `loadoutInventory: { masters: [], ... }` (line 274) and
  `loadoutInventory: hydratePlannedLoadout(...)` (line 282). Keep `servCodeMap`: line 229 still
  uses it. Do not touch anything else in the file.
- [x] A4. `_builders/makeCustomer.ts`: remove the `baseLoadout` import (line 65) and
  `loadoutInventory: baseLoadout,` (line 426). In the comment at lines 78-82, take
  `loadoutInventory,` out of the list of derived fields (keep `eta`). Do not edit the coverage
  checks.
- [x] A5. `realGreen/customer/_lib/classes/ServiceUtils.ts`: remove the exported type
  `ProductRuleCompliance` (line 14) and the `productRuleCompliance` getter with its doc comment
  (lines 169-209). Keep the `AppProduct` import (the `productsUsed` getter uses it). Check each
  remaining import in the file against the file body with a search before leaving it.

### B. Store, navigation, permission
Read `store/reducers/index.ts` and `NavMenu.tsx` first.
- [x] B1. `store/reducers/index.ts`: remove the four imports (`loadoutStartReducer`,
  `loadoutFinishReducer`, `loadoutReducer`, `loadoutReportReducer`) and the four keys `loadout`,
  `loadoutStart`, `loadoutFinish`, `loadoutReport`. The `equipment` and `equipmentPackage`
  reducers stay until step 4.
- [x] B2. `components/navBar/NavMenu.tsx`: remove the "Loadout" entry from `schedulingSection`
  (lines 53-57). `can` is still used by the other entries.
- [x] B3. `permission/groups/scheduling.ts`: remove the `loadouts` resource and the two comment
  lines above it (lines 32-34). The file's header comment does not name it.
- [x] B4. Search `src` for `can.loadouts`. The only hits left are inside the folders that C2
  deletes.

### C. Delete
Each deletion is preceded by a search showing the file has no importer left, as 05 requires.
- [x] C1. Search `src` for `@/app/loadout`, `@/app/scheduling/dailyInventory`,
  `@/app/machines`, `/dailyInventory` and `state.loadout`. After A and B, the only hits are
  files inside the three folders, `.md` docs and the `productEquipmentRefac` notes. (The match
  `href: "/scheduling/dailyInventory"` in `NavMenu.tsx` is gone with B2.)
- [x] C2. Delete the three folders: `src/app/loadout/`, `src/app/scheduling/dailyInventory/`,
  `src/app/machines/`. Record the file counts before deleting (7, 65 and 1).
- [x] C3. Search each file below for importers, then delete it. Each has only the deleted
  folders as importers, or none:
  - `realGreen/customer/selectors/hydratePlannedLoadout.ts`
  - `realGreen/customer/_lib/hooks/useAppProducts.ts`
  - `realGreen/customer/hooks/useRecentProduction.ts`
  - `realGreen/customer/hooks/useByAssignmentCustomers.ts`
  - `lib/primatives/typeUtils/DeepNonNullable.ts`
  - `lib/validation/BaseValidator.ts`, `createValidationSelectors.ts`, `getFieldPath.ts` (then
    the empty `lib/validation/` folder)
  - `style/components/slider.tsx` (leave `@radix-ui/react-slider` in `package.json`)
- [x] C4. Check that no empty folder is left behind in the places above.

### D. Check
No `ide_*` tools are available, so checks are by search and by reading (Luke agreed for step 1;
confirm again before relying on it if the session has changed).
- [x] D1. For every edited file (A1-A5, B1-B3): re-read it after the edit. For each import in
  it, confirm with a search that the name is still used (`noUnusedLocals` is on), and that every
  name still used is imported. List any file where this could not be settled.
- [x] D2. Search `src` for every removed name and confirm no importer is left: `loadoutInventory`,
  `LoadoutBase`, `baseLoadout`, `hydratePlannedLoadout`, `getProductMasters`,
  `PackageSelection`, `productRuleCompliance`, `ProductRuleCompliance`, `can.loadouts`,
  `useRecentProduction`, `useByAssignmentCustomers`, `DeepNonNullable`, `BaseValidator`,
  `createValidationSelectors`, `getFieldPath`, `components/slider`, `Mixture`,
  `LoadoutConstituent`, `MachineTypes`. Expected hits: `.md` docs and the
  `productEquipmentRefac` notes. In `.ts` and `.tsx` files the only hits are the comments this
  plan lists under "Left in place": in `assignmentSelect.ts`, `AssignmentModel.ts`,
  `AppMethodTypes.ts` and `equipment/waterProduct.ts` (the word "loadout" in a comment, and
  `hydratePlannedLoadout` named in the two comments in `waterProduct.ts`).
- [x] D3. The agent runs `npx vitest run` (the whole suite). `ServiceUtils.ts` and `makeCustomer.ts`
  changed, and the existing tests build their entities through `makeCustomer`. Use the `cmd /c`
  form that worked in step 1 (the plain form only printed a Vite config warning). Report the
  file and test counts. No test is added or changed.
- [ ] D4. Luke runs `npx tsc --noEmit`. Triggers: a shared type changed (`ServiceProps`,
  `Service`), exports were removed (`baseLoadout`, `productRuleCompliance`,
  `ProductRuleCompliance`, `can.loadouts`, four reducers, `AppState` keys `loadout*`), and
  files were deleted. If `tsc` reports errors only under `.next/types/` or `.next/dev/types/`
  that name `dailyInventory`, they are stale generated route types (`tsconfig.json` includes
  both folders): stop the dev server, delete the `.next` folder, start it again, and re-run.
- [ ] D5. Luke tries it on the sandbox (`sgSandbox`; no backup needed, this step changes no
  stored data):
  - The app loads. The side menu has no "Loadout". The "Scheduling" section still shows Pace,
    Priority Scheduling, Cover Sheets, Prenotification, Time Off Calendar and Holidays.
  - `/scheduling/dailyInventory` gives a 404.
  - Screens built on the customer tree still load: bizPlan products, cover sheets (list and
    PDF), Pace, Prenotification and a completed-service view.
  - Monthly Inventory still loads and saves a count.
  - Optional: open the permission editor for a user or bundle that held `loadouts`. It should list
    the old grant as one to clean up (05, "Permissions").

## For Luke (open, small)
The same items, with two more, are in `05_FullStateSandboxSetup.md` under "Open questions":
whether step 1 is deployed alone first, and whether search-based checks are accepted again.
1. **Assignment leftovers.** The loadout was the only caller of the `getBySchedDate` and
   `getAvailableDates` ops, the `availableDates` state field and four selectors in
   `app/assignment/` (their comments say "for loadout"). They are shared with live assignment
   code (contract, route, slice), so this step leaves them. Remove them later (in step 6, or as
   a separate cleanup), or leave them for good? Default if you do not say: left in place, and
   noted in step 6's reading.
2. **Capability bundles.** If any bundle or user holds `loadouts.read` or `loadouts.write`, the
   grant is ignored after this step and shows as one to clean up. Nothing in code changes. Tidy
   them in Users and Bundles (`/permission/users`) when you like.
3. **Timing.** A loadout that a tech started and did not finish cannot be finished after this is
   deployed (the data stays in `loadoutdocs` until you drop it, step 6). Deploy when no loadout
   is in progress, or accept the loss.
4. **Compile-first deploy.** Step 2 needs step 1 deployed first or in the same release.

## Differences from 05
Found while planning. 05 was updated to match.
1. `MultiSelectEmpty.tsx` is not orphaned by step 2. 05 listed it under "once the removed
   folders are gone". Its only importers are the two equipment forms
   (`equipment/EquipmentForm.tsx`, `equipment/equipmentPackage/EquipmentPackageForm.tsx`), so it
   is deleted in step 4. The other `multiselect/` components have other importers and stay.
2. `useRecentProduction.ts` is confirmed for deletion in step 2 (05 had it as proposed). The scan
   of every import of the deleted files found no other importer.
3. `style/components/slider.tsx` is deleted, but the `@radix-ui/react-slider` package stays:
   two other files import it directly.
4. `ProductRuleCompliance` (the type) goes with the getter. 05 named only the getter.
5. The `app/assignment/` leftovers above are new. 05 did not mention them.
6. 05's read list for step 2 omitted the `realgreen-customer` skill. Item A needs it.

## Done when
Every box above is ticked, `npx vitest run` and `npx tsc --noEmit` pass, the sandbox checks in
D5 pass, and the results are noted under "Progress" in `05_FullStateSandboxSetup.md`.