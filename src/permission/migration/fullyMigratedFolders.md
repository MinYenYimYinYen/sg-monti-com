# Migrated Folders

How this works: `migrationInstructions.md`. **Read this file first in every session.** It holds what is done, what was decided by default (for the final review), and what is deferred. Update it after each folder.

Status: **Complete** means routes on `capability:`, declaration registered, write and delete controls gated, decisions recorded, and every dependency that could not be implemented is in the deferred table. **Partial** means part of the folder's routes are still on `roles`.

## Progress

Top-level folders alphabetically. `qbo` and `realGreen` are worked one sub-folder at a time. Sessions are capped at 5 folders.

| Folder | Status | Notes |
|---|---|---|
| `account` | Complete | Deferred: `realGreen/rgAccount` requires and load gate |
| `appMethod` | Complete | `deleteOne` is irreversible (own capability). Deferred: load gates in other folders' hooks |
| `assignment` (with `migrate`) | Complete | `migrateAssignments` is one-time and overwrites data (own capability). Deferred: load gates in other folders' hooks |
| `assignmentGroup` | Complete | Looks like dead code (nothing mounts it). `pace/assignmentGroup` is the live copy |
| `auth` | Complete | `approveUser` sets a role, so `accessRequests.write` is sensitive. Deferred: removing the applied flow with roles |
| `bizPlan` | Complete (nothing to declare) | No routes. Its access is the reads of the features it shows |
| `csv` | Complete (nothing to declare) | Stub route reuses `assignment.serviceAssignments.write`. Looks like dead code, with `centralDocPropsSlice` |
| `employeeAvailability` | Complete | Deferred: load gate and `requires` in the pace layout |
| `equipment` (with `equipmentPackage`) | Complete | Both `deleteOne` ops can clear references (own `delete` verbs). Deferred: load gates in other folders' hooks, footer badges |
| `flagRule` | Complete | `deleteOne` was admin only (own `delete` verb). Deferred: the `sanity` screens that use it |
| `formDataTypes` | Complete (nothing to declare) | A static in-code registry, no routes. Stored templates migrate with `formTemplate` |
| `formTemplate` | Complete | Ownership stays a server rule apart from the capabilities. Deferred: prepay letters load gate and link |
| `globalSettings` | Complete | Singleton `settings` (`read`, `write`). About 35 callers load it, and the nav bar loads it on every page. Deferred: load gates and `requires` in all of them |
| `holiday` | Complete | `deleteOne` was admin only (own `delete` verb). Deferred: load gates in pace, productivity and time off screens |
| `inventory` | Complete | `requires` appMethod and globalSettings reads. Not usable by a non-superuser until the `realGreen` product, progServ and customer reads exist |
| `javelin` (the `api` route, layout and headers) | Complete | Posts are irreversible (own capability `journalEntryPostings.qbo.write`). `javelin.readme.md` still says admin only |
| `javelin/depositMapping` | Complete | Its own routes and components only. `javelin/api` is its own folder later |
| `knowledgeBase` | Complete | No screen yet. Nothing calls `useTopics`. Deferred: the `rcOnboarding.md` doc and the call assist topic screen |
| `legal`, `loadout`, `machines` | Complete (nothing to declare) | `legal` is static public pages, `machines` is an in-code list, `loadout` is a client module over `scheduling/dailyInventory/api` (migrates with `scheduling`) |
| `pace` (with `assignmentGroup`, `assignmentPlan`, `groupSequence`, `seasonPlan`) | Complete | `pace/assignmentGroup` reuses `assignmentGroup.assignmentGroups.*`. Not usable by a non-superuser until the `realGreen` reads exist. Deferred: RealGreen, priority service and planned time off loads, hiding the Season Plan tab |
| `permission` | Complete | Already on capabilities. Finding: `userCapabilities.read` probably should require `bundles.read` |
| `plannedTimeOff` | Complete | `requires` the holiday read. Deferred: load gates and write gating in other folders, RealGreen employees |
| `prepayLetters` | Complete | `deleteConfig` admin override became the superuser. Deferred: the `realGreen` loads on every tab. Not usable by a non-superuser until those reads exist |
| `priceIncrease` | Complete | Two resources (`increasePlans`, `increaseSettings`). Closes the `globalSettings` flag mappings row. Deferred: the `realGreen` loads and the customer flag write-back. Not usable by a non-superuser until those exist |
| `priorityService` | Complete | `requires` the global settings read. Not usable by a non-superuser until the `realGreen` reads exist. The `pace` load gates for it are now ready to add |
| `productivity` | Complete (nothing to declare) | No routes. `useProductivity` has `canLoad` for holidays, absences and assignments, and "Record Absence" is gated by `absences.write`. Not usable by a non-superuser until the `realGreen` and `timeCard` reads exist. The nav entry stays on roles |
| `qbo/account`, `qbo/customer`, `qbo/employee`, `qbo/vendor` | Complete | Reference reads and `createVendor`. Deferred: `importCCTxn` role button |
| `qbo/connection` | Complete | `disconnect` is irreversible (own capability, `connectionRevocation.write`). The OAuth callback now evaluates `connection.write` for the user in its `state`. Nav entry moved |
| `qbo/importCCTxn` (with `rows`, `decisions`, `post`) | Complete | `postRows` is irreversible (own capability, `expensePostings.qbo.write`), and `upsertFormatAccount` is its own resource. Closes the `MapRowVendorPicker` row. Deferred: the post reload dispatches |
| `qbo/journalEntry` | Complete | `postMany` is irreversible (own capability, `journalEntryPostings.qbo.write`). Looks like dead code (nothing calls the route, and there is no screen). Javelin posts through its own route and capability |
| `qbo/purchase` | Complete | Read only (`purchases.qbo.read`). Looks like dead code (nothing calls the route, and there is no screen) |
| `quickSend` | Complete | Two resources (`storedTemplates`, `templateGroups`). The admin override of ownership became the superuser. Deferred: the `realGreen` loads on the page. Not usable by a non-superuser until those reads exist |
| `realGreen/callAhead` | Complete | Three resources (`callAheads` from RealGreen, `callAheadDocProps`, `keywords`). `deleteKeyword` has its own `delete` verb. Deferred: load gates in other folders' hooks, and the Service Codes tab (`progServ`) |
| `realGreen/callLog` | Complete | `syncCallLogs` is its own singleton capability (`callLogSync.write`, was admin only). The live read is `callLogs.realGreen.read`. No screen: the shown call logs come from the mirror through `customer`. Deferred: the sandbox pages |
| `realGreen/company` | Complete | Read only (`companies.realGreen.read`). The list page is a `GatedPanel`. Deferred: the `prepayLetters` load gate |
| `realGreen/rgAccount` | Complete | Read only (`rgAccounts.realGreen.read`). Closes the `account` deferred row. The account screen's capability set now includes it |
| `realGreen/conditionCode` | Complete | Read only (`conditionCodes.realGreen.read`). No screen. Deferred: the cover sheet loads |
| `realGreen/custFlag` (with `add`) | Complete | `addCustFlag` is irreversible (own capability, `flagAssignments.realGreen.write`, was office and admin). Closes the `AssignFlagButton` row. Deferred: the nav bar, price increase, prepay and sanity loads, and the `sandbox` page |
| `realGreen/customer` (with `mirror`, `sync`, `corruptedRecords`) | Complete | Four resources: `customers` (mirror read), `liveCustomers` (live read), `customerSync` (own capability, was admin only) and `corruptedSyncRecords`. 12 hooks gained `canLoad`, 7 gained `canRefreshLive`. Deferred: every caller of those hooks (about 40 files), the sandbox pages, the `requires` for the hydrated entities |
| `realGreen/discount` | Complete | Read only (`discounts.realGreen.read`). No screen. Deferred: the pace and prepay letter loads |
| `realGreen/employee` | Complete | Read only (`employees.realGreen.read`). The view active page is a `GatedPanel` (an unfinished stub, not in the nav). Deferred: about 11 callers load it for names |
| `realGreen/flag` | Complete | Read only (`flags.realGreen.read`). The list page is a `GatedPanel` (an unfinished stub, not in the nav). Deferred: seven hooks load it and about twenty files read `flagSelect`, including the nav bar on every page |
| `realGreen/prepay` | Complete | Read only (`prepays.realGreen.read`). No screen. Deferred: the `QuickSendPage` load gate and `requires` |
| `realGreen/priceTable` | Complete | Read only (`priceTables.realGreen.read`). No screen. The route also refreshes a Mongo cache, which is a side effect of the read. Deferred: five hooks load it and two readers (`progServ`) select it |
| `realGreen/product` (with `unitConfig`) | Complete | Six resources (`products` from RealGreen, four native saves, `unitConversions`). The list and mix chart pages are a `GatedPanel`, and the nav entries moved to `products.read` (Mix Charts was open to tech by role). Closes the `ProductsFooter` and `EquipmentPackageDeleteSheet` rows. Deferred: load gates in about nine other hooks |
| `realGreen/progServ` | Complete | Four resources (two RealGreen lists, two native saves). Both pages are a `GatedPanel`, and the nav entries moved to the reads. Closes the `ServCodeCallAheadRow` row. Deferred: load gates in about eighteen other hooks. Findings: the edit fields stay editable (only the save is gated), and `getProgCodes` refreshes a Mongo cache |
| `realGreen/rgApiLog` | Complete (nothing to declare) | No routes. A server side call counter that no user reads. An admin page would need its own read later |
| `realGreen/serviceCondition` | Complete | Read only (`serviceConditions.realGreen.read`), `requires` the condition code read. No screen. Deferred: the cover sheet load gate and `requires`, and every screen that shows services (`centralSelect` hydrates conditions) |
| `realGreen/syncLock` | Complete (nothing to declare) | No routes. Locks are taken by server sync code. `forceClearLock` is reviewed with `syncUtils` |
| `realGreen/syncMetadata` | Complete | Read only (`lastSyncTimes.read`, was admin only). Looks like dead code (nothing calls the route). Deferred: the readme still says admin only |
| `realGreen/taxCode` | Complete | Read only (`taxCodes.realGreen.read`). No screen. Deferred: the prepay letters and quick send loads. `zipCode` now threads its flag through |
| `realGreen/zipCode` | Complete | Read only (`zipCodes.realGreen.read`), `requires` the tax code read. No screen. `useZipCode` has `canLoad` and `canLoadTaxCodes`. Deferred: the customer value and quick send loads |
| `realGreen/_lib`, `realGreen/sampleData` | Complete (nothing to declare) | Shared helpers and fixtures, no routes |
| `ringCentral` | Complete (nothing to declare) | Only `rcOnboarding.md`, now naming the `knowledgeBase` capabilities. Deferred: the call assist topic screen, when it exists |
| `routeNotes` | Complete | One resource (`routeNotes`: `read`, `write`, `delete`, all were admin and office). `RouteNoteEditor` disables Save and Delete by capability. Deferred: the load gates in `useCoverSheetDeps` and `RoutePlanPage` |
| `sanity` | Complete (nothing to declare) | No routes. `useSanityDeps` takes nine `canLoad` flags, the layout is a `GatedPanel` on the customer read, `FlagRuleCRUD` is gated. Deferred: twelve refresh buttons and the `requires` entries |
| `sandbox` | Complete (nothing to declare) | No routes. Seven pages gated by the capabilities their routes check. Flag assignment and the migrate page are irreversible. Deferred: `useCustomerQuery` on two sub-pages, and whether to delete the dev pages |
| `schedPromise` | Complete (nothing to declare) | No routes, no screens, no data. Pure parsing (`parsePromise`, `dateRangeParse`, `timeRangeParse`) and one presentational `PromiseBuilder` that no code loads or saves through. Nothing to gate |
| `scheduling` | Complete | Two routes, new `scheduling` feature: `loadouts` (`read`, `write`) and `serviceEtas` (`read`, `write`). Cover sheets, prenotify and the four loadout screens take `canLoad` flags from one `schedulingCanLoad` helper. Closes about fifteen deferred rows. Deferred: the two screens share `serviceEtas.read` as their entry gate |
| `syncUtils` | Complete | One route, new `syncUtils` feature, four capabilities: `syncStatus.read`, `deltaSync.write`, `fullSync.write` (IRREVERSIBLE), `syncLocks.write`. Layout is a `GatedPanel`, every button is gated by its own capability |
| `timeCard` | Complete | One route, new `timeCard` feature: `punches` (`read`, `write`). Layout gated, Import button disabled without `write`. Deferred: the productivity callers of `useTimeCard` |
| `transactions` | Complete (nothing to declare) | One planning document (`transactionPlan.md`) and no code. The built screens are `qbo/importCCTxn` |











Next in alphabetical order after what is above: `vercelCron` is the last top-level folder. After it, the "Finishing the migration" steps in `migrationInstructions.md` start. (Session 13 did `schedPromise`, `scheduling`, `syncUtils`, `timeCard` and `transactions`.) (Session 12 did `realGreen/zipCode`, `ringCentral`, `routeNotes`, `sandbox` and `sanity`, with the user's override of the 5 folder cap, which completes `realGreen`.) (Session 11 did `realGreen/rgApiLog`, `realGreen/serviceCondition`, `realGreen/syncLock`, `realGreen/syncMetadata` and `realGreen/taxCode`.) (Session 10 did `realGreen/flag`, `realGreen/prepay`, `realGreen/priceTable`, `realGreen/product` and `realGreen/progServ`.) (Session 9 did `realGreen/conditionCode`, `realGreen/custFlag`, `realGreen/customer`, `realGreen/discount` and `realGreen/employee`.) (Session 8 did `quickSend`, `realGreen/rgAccount`, `realGreen/callAhead`, `realGreen/callLog` and `realGreen/company`.) (Session 7 did `productivity`, `qbo/connection`, `qbo/importCCTxn`, `qbo/journalEntry` and `qbo/purchase`, which completes `qbo`.) (Session 6 did `permission`, `plannedTimeOff`, `prepayLetters`, `priceIncrease` and `priorityService`.) (Session 5 did `knowledgeBase`, `legal`, `loadout`, `machines` and `pace`.) (Session 2 did `appMethod`, `assignment`, `assignmentGroup`, `auth` and `bizPlan`. Session 3 did `csv`, `employeeAvailability`, `equipment`, `flagRule` and `formDataTypes`. Session 4 did `formTemplate`, `globalSettings`, `holiday`, `inventory` and `javelin` (the `api` route and its screens).)

## Deferred dependencies

Each row is one thing that could not be implemented yet. Work the table down at the end, and do the final sweep for ungated loads (see `migrationInstructions.md`, Finishing the migration).

| Screen or hook | Capability needed | Outstanding | Waits for |
|---|---|---|---|
| `useAccount`, `AccountMappingEditor` | `rgAccount.rgAccounts.realGreen.read` | Done: `accountMappings.read` `requires` it, and `useAccount` takes a `canLoad.rgAccounts` flag that `AccountMappingEditor` sets from `allows(...)` | Nothing |
| `MapRowVendorPicker` (`qbo/importCCTxn`) | `quickbooks.vendors.qbo.write` | Done: `MapRowVendorPicker` shows "New vendor" by `allows(vendors.write)` | Nothing |
| `useImportCCTxnDeps` (`qbo/importCCTxn`) | Its own reads (mappings, rows) | Done: the layout passes `canLoad` for the four mapping lists and the open rows. Still open: the reloads in `useImportPost` (`postRows`, `reconcileRow`) dispatch `getOpenRows` and `getMerchantMappings` with no gate. Guard them with `importRows.read` and `merchantMappings.read` (add `canLoad` flags to `useImportPost` and pass them from `PostPanel`) | Nothing: do it in the final sweep |
| `javelin/_lib/javelinContextServer.ts` | `depositMapping.depositFieldLinks.read` | Direct `DepositFieldMappingModel` read inside the javelin ops. Now gated by `javelin.entryPlans.read` and `journalEntryPostings.qbo.write`, not by the user's own deposit link read. Decided: leave it, since the server builds the entry on the caller's behalf (see the `javelin` entry) | Nothing. Revisit in the final sweep |
| `QboConnectionPanel`, `qboCallbackServer.ts` | `qboConnection.connection.read`, `.write` | Done: the panel is a `GatedPanel` with write and revocation controls disabled, and the callback evaluates `connection.write` for the user in its `state` | Nothing |
| `useProduct`, `useLoadoutReportDeps`, `useLoadoutFeedbackDeps` (call `useAppMethod({ autoLoad })`) | `appMethod.appMethods.read` | Pass `canLoad` into `useAppMethod` from the component. The flag exists and defaults to allowed. Nine screens load it through `useProduct` (`realGreen/product` list and mixChart, `bizPlan/products`, `inventory`, `servCode` panel, cover sheets, loadout pages) | Nothing: the route is migrated. Done for the cover sheet and loadout screens (session 13: `useProduct` and `useAppMethod` take `canLoad.appMethods`). Still open: `bizPlan/products` and the final sweep |
| `useCoverSheetDeps`, `usePrenotify`, `usePaceDeps` (`useAssignments`), `useProductivity`, `useLoadoutPageDeps`, `useLoadoutFeedbackDeps` (`assignmentActions` dispatches) | `assignment.serviceAssignments.read` | `useAssignments` has a `canLoad` flag (default allowed). The direct `assignmentActions.getBySchedDate`, `getBySchedDateRange` and `getAvailableDates` dispatches have none. Also add `requires` entries to those screens' capabilities | `pace` and `productivity` are done (`usePaceDeps` and `ProductivityLayout` pass `canLoad`; `requires` lists it for pace only, since productivity declares nothing). Closed by `scheduling` (session 13): `useAssignments` and the four direct `assignmentActions` dispatches in `useLoadoutPageDeps` and `useLoadoutFeedbackDeps` take `canLoad.assignments`, and the `requires` entries are on `scheduling.serviceEtas.read` and `loadouts.read` |
| `AppMethodCRUD` callers (`ProductsFooter` on the product list and mixChart pages) | `appMethod.appMethods.read` | The footer badge opens the modal for everyone. `GatedPanel` shows "You do not have access" inside it. Done: `ProductsFooter` hides the badge unless the user holds the read | Nothing |
| `NavMenu.tsx` entries for screens that load appMethods or assignments (Cover Sheets, Prenotification, Loadout, Productivity, Product Forecast) | `read` of each feature the screen loads | Entries are still on `roles`, so a non-superuser sees a link to a screen whose data is refused | Cover Sheets, Prenotification, Loadout and Sync Utilities are done (session 13). Still on `roles`: Productivity and Product Forecast (`bizPlan/products`) |
| `pace/assignmentGroup` | `assignmentGroup.assignmentGroups.*` or its own | Resolved in the `pace` folder: `pace/assignmentGroup` reuses the `assignmentGroup` feature. Only the dead-code question remains (see the last rows of this table) | Nothing |
| `auth` applied flow (`approveUser`, the `applied` role, `getPendingActions` reading `role: "applied"`, `proxy.ts`, `AdminActionModal` role select) | Assigning capabilities replaces the role | Stays role-based on purpose | The final roles removal (step 4) |
| `sandbox/assignmentMigrate` page | `assignment.legacyAssignmentMigration.write` | Done: the Run button is disabled by the capability, with a tooltip (see the `sandbox` record). The page is still dead code once the migration has run | Delete the page and the migrate route once the migration has run |
| `usePaceDeps` (calls `useEmployeeAvailability({ autoLoad: true })`), `employeeSelect` (hydrates employees from availability) | `employeeAvailability.availabilityConstraints.read` | Done for pace (`PaceShell` passes `canLoad` and `requires` lists it). Still open for `employeeSelect`. Employees with no loaded record fall back to no restriction, so a refused load is silent | Nothing: the route is migrated. Do it with the `pace` folder |
| `EmployeeAssignmentPanel` (`pace/setup/employees`, mounts `EmployeeAvailabilitySheet`) | `employeeAvailability.availabilityConstraints.read` | The sheet is gated inside itself. Done: the trigger is disabled without `read` | Nothing |
| `csv` stub route and `centralDocPropsSlice` | n/a | Dead code (see the `csv` entry). Delete with its slice, selector and contract | Nothing. Do in the final sweep or earlier |
| `useEquipment` callers: `useLoadoutReportDeps` (`realGreen/product/mixChart/page.tsx` is done), `useLoadoutFeedbackDeps`, `useLoadoutFormDeps`, `useLoadoutPageDeps` | `equipment.equipmentDefinitions.read` | Pass `canLoad` into `useEquipment` from the component or layout. The flag exists and defaults to allowed. Also add `requires` entries to those screens' capabilities | Closed by `scheduling` (session 13). No caller is left in `realGreen` |
| `useEquipmentPackage` callers: `useLoadoutReportDeps`, `useLoadoutFeedbackDeps`, `useLoadoutFormDeps`, `useLoadoutPageDeps` (`MasterEditPanel` is done) | `equipment.equipmentPackages.read` | Pass `canLoad` into `useEquipmentPackage`. The flag exists and defaults to allowed | Closed by `scheduling` (session 13). No caller is left in `realGreen` |
| `ProductsFooter` (`realGreen/product/list`, opens `EquipmentCRUD` and `EquipmentPackageCRUD`) | `equipment.equipmentDefinitions.read`, `equipment.equipmentPackages.read` | The two badges open their modal for everyone. `GatedPanel` shows "You do not have access" inside it. Done: `ProductsFooter` hides each badge unless the user holds that read | Nothing |
| `EquipmentPackageDeleteSheet` | `realGreen` product master read (not declared) | It counts affected product masters from the store. Without that read the list is empty and the sheet says "Safe to delete". Done: `equipment.equipmentPackages.delete` now `requires` `product.products.realGreen.read`, so the admin screens offer it with the delete. The sheet still reads the store with no gate of its own | Nothing |
| `useSanityDeps`, `FlagRuleCRUD`, `sanity/flags/rules/page.tsx` | `flagRule.flagRules.read`, `.write`, `.delete` | Done in the `sanity` folder: `useSanityDeps` passes `canLoad` into `useFlagRule` and guards the direct dispatch. `FlagRuleCRUD` disables Save, New Rule and both Delete buttons by capability and shows a note without the read. Still open: the `requires` entries (see the `flagRule` `requires` row below) | The final sweep |
| `usePrepayLettersDeps` (`useFormTemplate({ autoLoad: true })`), `renewalLettersSelect` | `formTemplate.formTemplates.read` | Pass `canLoad` into `useFormTemplate` from the prepay letters component. The flag exists and defaults to allowed. Add the `requires` entry to the prepay letter screens' capabilities | Nothing: the route is migrated. Do it with the `prepayLetters` folder |
| `RenewalSettingsPanel` (link to `/formTemplate`) | `formTemplate.formTemplates.read` | The link shows for everyone, and the page then says "You do not have access". Hide it by `read` | The `prepayLetters` folder |
| About 35 callers of `useGlobalSettings({ autoLoad: true })` and `useRenewalFlagIds`: `realGreen/customer` hooks and links, `scheduling` (cover sheets, loadout, prenotify), `prepayLetters` (`usePrepayLettersDeps`, `useRenewalCustomers`), `priceIncrease` (`usePriceIncreaseDeps`, `usePriceIncreaseCustomers`), `priorityService`, `quickSend`, `sanity` (`useSanityDeps`), `components/navBar` (`useNavBarDeps`) | `globalSettings.settings.read` | Pass `canLoad` into `useGlobalSettings` or `useRenewalFlagIds` from the component. Both flags exist and default to allowed. Add `requires` entries to each screen's capabilities. `NavBar` is the one that loads for every user on every page | Done for `scheduling` (session 13: cover sheets, loadout, prenotify and the cover sheet config editor). Still open: the other owning folders, and `components/navBar`, which loads for every page, so do it early |
| `SetRenewalFlagsSection` and `GlobalConfigMenu` (nav bar) | `globalSettings.settings.write` | `GlobalConfigMenu` shows the section by `role === "admin"` or `role === "office"`, and the selects dispatch `updateSettings` with no disabled state. Switch to `allows(settings.write)` and disable the selects | The `components/navBar` folder |
| `usePaceDeps`, `useProductivity`, `plannedTimeOff/calendar/page.tsx` (all call `useHoliday({ autoLoad: true })`), and the selectors `employeeSelect`, `routePlanSelect`, `productivitySelect`, `reliabilitySelect`, `seasonPlanPageSelect` that read `holidaySelect` | `holiday.holidays.read` | Pace is done (`PaceShell` passes `canLoad` and `requires` lists it). `plannedTimeOff/calendar/page.tsx` is done (passes `canLoad`, and `requires` lists the holiday read). Done for `useProductivity` (`ProductivityLayout` passes `canLoad`; no `requires`, since productivity declares nothing). Without the read, holiday and weather day dates are empty, so pace plans and productivity percentages treat every day as a working day | Nothing: the route is migrated. Do it with `plannedTimeOff` |
| `NavMenu.tsx` entry "Productivity" (Time Off Calendar and Pace are done) | `holiday.holidays.read` | These screens also load holidays, but the entries are still on `roles`, and holidays were admin only for delete and admin or office for read | Each screen's own folder |
| `useInventoryDeps` (`inventory`) | `realGreen` product masters, unit configs, program and service codes, and customer recent production reads (none declared) | `useProduct`, `useProgServ` and `useRecentProduction` fire loads with no gate. The `appMethod` and `globalSettings` flags exist (default allowed) but `useInventoryDeps` cannot pass them without a component. Add `canLoad` flags once those folders migrate | The `realGreen` folders. The two flags that exist can be passed from `InventoryWorkspace` now, in the final sweep |
| `bizPlan/products` (Product Forecast) | `inventory.inventoryChecks.read` | Check whether it reads inventory checks. It only imports `bizPlan/selectors/inventorySelectors`, a different module, so probably nothing is needed. Confirm in the final sweep | The final sweep |

| `priceIncrease/config` `FlagMappingsSection` | `globalSettings.settings.write` | Done in the `priceIncrease` folder: the Save button, the exempt flag checkboxes and the manual flag select are disabled by `write`. No `requires` entry on purpose: the flag mappings are a separate edit from the settings documents, so the settings write capability does not need it (see the `priceIncrease` entry) | Nothing |
| `usePaceDeps` (`useCustomerContext`, `useActiveCustomers`, `useProgServ`, `useEmployee`, `useDiscount`) | `realGreen` customer, program, service, employee and discount reads (none declared) | Add the `requires` entries to `pace.assignmentScenarios.read` and `canLoad` flags in `usePaceDeps`. The pace screens are not usable by a non-superuser until these exist | The `realGreen` folders |
| `usePaceDeps` (`usePriorityService`, `usePlannedTimeOff`), and the selectors `prioritiesSelect`, `PrioritiesPage` that read `priorityServiceSelect` | `priorityService.priorityServices.read` and `plannedTimeOff.absences.read` | Both declarations and routes now exist, so this is ready. Pass `canLoad` into both hooks from `PaceShell` (both flags exist and default to allowed) and add both reads to `pace.assignmentScenarios.read` `requires` | Nothing. Do it with the `pace` layout when it is next touched, or in the final sweep |
| `pace/layout.tsx` tabs (Season Plan, Setup) and the "No active season plan" banner | `pace.seasonPlans.read` | The Season Plan tab shows to everyone who passes the layout gate and then shows "You do not have access" inside. Hide the tab by `seasonPlans.read`, and hide the banner when the user cannot read plans (it is misleading then) | Nothing. Do it in the final sweep, or when the `realGreen` folders migrate and the layout is touched again |
| `assignmentGroup` (top-level folder, `AssignmentGroupManager`) | `assignmentGroup.assignmentGroups.*` | `pace/assignmentGroup` now reuses these capabilities. Still to decide: whether the top-level screen is dead code (nothing mounts it) and should be deleted | Nothing. Decide in the final sweep |
| `ringCentral/rcOnboarding.md` | `knowledgeBase.topics.*` | Done: the doc names the three capabilities and no longer says admin or office. Still open: gate the call assist topic screen when it exists (`useTopics` already takes `canLoad`) | The call assist screen, when it is built |
| `useProductivity`, `usePrenotify`, `usePaceDeps` (call `usePlannedTimeOff({ autoLoad: true })`), and the selectors `employeeSelect`, `routePlanSelect`, `reliabilitySelect`, `employeeRoutedStatusSelect` that read `plannedTimeOffSelect` | `plannedTimeOff.absences.read` | Pass `canLoad` into `usePlannedTimeOff` (the flag exists and defaults to allowed) and add `requires` entries to those screens' capabilities. Without the read, absences are empty, so pace plans and reliability treat everyone as present | Nothing: the route is migrated. Done for `pace` and `productivity` (`ProductivityLayout` passes `canLoad`). `usePrenotify` is done too (session 13, `canLoad.absences`). Still open: the selectors' other screens |
| `reliabilityColumns.tsx` `SuspiciousDayEntry` (`productivity`) | `plannedTimeOff.absences.write` | Dispatches `plannedTimeOffActions.upsert` directly with no disabled control. Done: `SuspiciousDayEntry` disables "Record Absence" and Save by `write` | Nothing |
| `usePrepayLettersDeps` (`useProgServ`, `usePriceTable`, `useTaxCode`, `useDiscount`, `useFlag`, `useCompany`), `useRenewalCustomers` (customer mirror or RealGreen load), `RenewalFlagsDisplay` (`flagSelect`) | `realGreen` program and service, price table, tax code, discount, flag, company and customer reads (none declared) | Add the `requires` entries to `prepayLetters.prepayConfigs.read` and `canLoad` flags in `usePrepayLettersDeps` and `useRenewalCustomers`. The prepay screens are not usable by a non-superuser until these exist | The `realGreen` folders |
| `renewalLettersSelect`, `RenewalBatchesPanel`, `useRenewalLetterPdf` | `prepayLetters.*`, `formTemplate.formTemplates.read` | Nothing to gate: they read the stores the layout loads. Without the reads the lists are empty and the Download buttons stay disabled | Nothing. Check in the final sweep |
| `plannedTimeOff/calendar/page.tsx` (`useEmployee({ autoLoad: true })`) | `realGreen` employee read (not declared) | Add the `requires` entry on `absences.read` and a `canLoad` flag. Without it the chips show employee ids instead of names and the employee pickers are empty | The `realGreen` folders |
| `usePriceIncreaseDeps` (`useProgServ`, `usePriceTable`, `useCustomerContext`), `usePriceIncreaseCustomers` (customer mirror or RealGreen load), `usePriceIncreaseCustFlags` (`useCustFlag`) | `realGreen` program and service, price table, customer and customer flag reads (none declared) | Add the `requires` entries to `priceIncrease.increaseSettings.read` and `canLoad` flags in `usePriceIncreaseDeps` and `usePriceIncreaseCustomers`. The price increase screens are not usable by a non-superuser until these exist | The `realGreen` folders |
| `PriorityServiceForm`, `page.tsx` (`usePriorityServiceCustomers`, `useSingleCustomer`, `useProgServ`, `useCustomerContext`) | `realGreen` customer, program and service reads (none declared) | Add the `requires` entries to `priorityService.priorityServices.read` and `canLoad` flags in the page. The screen is not usable by a non-superuser until these exist | The `realGreen` folders |
| `AssignFlagButton`, `AssignAllButton` (`priceIncrease/results`, call `useCustFlag().addFlag` and `addFlags`) | `custFlag.flagAssignments.realGreen.write` | Done: both buttons are disabled by the write, and pass `canLoad` (the customer flags read) into `useCustFlag`. The By Customer view's capability set lists both | Nothing |
| `QuickSendWorkspace` (`useCustomerContext`, `useProgServ`, `usePriceTable`, `usePrepay`, `useZipCode`) | `realGreen` customer, program and service, price table, prepay and zip code reads (none declared) | Add the `requires` entries to `quickSend.storedTemplates.read` and `canLoad` flags in `QuickSendWorkspace`. The screen is not usable by a non-superuser until these exist | The `realGreen` folders |
| `ServCodeCallAheadRow`, `ServCodeCallAheadTab` (`realGreen/callAhead`, call `useProgServ().saveServCodeChanges`) | `realGreen/progServ` service code read and write (not declared) | Done: Save is disabled by `servCodeDocProps.write`, the tab loads only service codes gated by `servCodes.read`, and it shows an inline note without it. The config modal's capability set now lists both. Still open: a `requires` entry on `callAhead.callAheadDocProps.write` if the settings and the tag are meant to be changed together (a product decision, not a dependency) | Nothing |
| `usePrenotify` (`useCallAhead({ autoLoad: true })`, plus `useProgServ`, `useEmployee`) and the prenotify page footer (`CallAheadConfig`) | `callAhead.callAheads.realGreen.read` and `callAhead.keywords.read` | Pass `canLoad` into `useCallAhead` from the prenotify component. The flag exists and defaults to allowed. Hide the settings icon by those reads, and add the `requires` entries to the prenotify screen's capabilities | Done in session 13 except hiding the settings icon: `usePrenotify` passes both flags and the `requires` entries exist. The icon stays because `CallAheadConfig` already shows its own "no access" notices |
| `useCoverSheetDeps` (`useCallAhead({ autoLoad: true })`) | `callAhead.callAheads.realGreen.read` and `callAhead.keywords.read` | Pass `canLoad` into `useCallAhead`. The flag exists and defaults to allowed. Add the `requires` entries to the cover sheet screens' capabilities | Closed by `scheduling` (session 13) |
| `productivity/reliability/page.tsx` (`useCallAhead({ autoLoad: true })`) | `callAhead.callAheads.realGreen.read` and `callAhead.keywords.read` | Pass `canLoad` into `useCallAhead` from the page. The flag exists and defaults to allowed | Nothing: the route is migrated. The `productivity` folder is closed, so do it in the final sweep |
| `useSanityDeps` (`useCallAhead({ autoLoad: false })`, and the direct `callAheadActions.getCallAheads` and `getKeywords` dispatches in `load`) | `callAhead.callAheads.realGreen.read` and `callAhead.keywords.read` | Done in the `sanity` folder: `useSanityDeps` passes `canLoad` objects into `useCallAhead` and guards both direct dispatches. Still open: the `requires` entries (no `sanity` declaration exists to hold them) | The final sweep |
| `sandbox/callLog/page.tsx` (`useCallLog({ custId })`, `refreshForCustomer`) and `sandbox/syncTest/page.tsx` (fetches `/realGreen/callLog/sync/api` directly) | `callLog.callLogs.realGreen.read`, `callLog.callLogSync.write` | Done in the `sandbox` folder: `callLog` passes `canLoad` into `useCallLog` and `useSingleCustomer`, and `syncTest` disables both buttons by `callLogSync.write`. Both are still dev pages, so decide in the final sweep whether to delete them | The final sweep |
| `usePrepayLettersDeps` (`useCompany({ autoLoad: true })`), `renewalLettersSelect` (`companySelect.company`) | `company.companies.realGreen.read` | Pass `canLoad` into `useCompany` from the prepay letters layout, as is done for the form templates. The flag exists and defaults to allowed. Add the `requires` entry to `prepayLetters.prepayConfigs.read`. Without the read the company is missing and the letters' return address is empty | Nothing: the route is migrated. Do it in the final sweep (the `prepayLetters` folder is closed) |
| `useCoverSheetDeps` (`useCondition({ autoLoad: true })`, `useCustFlag`) | `conditionCode.conditionCodes.realGreen.read`, `custFlag.customerFlags.realGreen.read` | Pass `canLoad` into `useCondition` and `useCustFlag`. Both flags exist and default to allowed. Add the `requires` entries to the cover sheet screens' capabilities. Without the condition read the condition text is missing, and without the flag read the flag filter shows nothing | Closed by `scheduling` (session 13) |
| `useNavBarDeps` (`useSelectedCustFlags()`, `useRenewalFlagIds()`) | `custFlag.customerFlags.realGreen.read` | `useSelectedCustFlags` has a `canLoad` flag (default allowed). `useRenewalFlagIds` dispatches `custFlagActions.loadFlagIdCustIds` in its second effect with no flag (its `canLoad` guards only the settings load), so it needs a second flag or a combined one. The nav bar runs on every page, so a user without the read gets a refused request on every page | Nothing: the route is migrated. Do it with the nav bar, together with the `globalSettings` read gate |
| `usePriceIncreaseCustFlags`, `usePrepayLettersDeps` (`useCustFlag`), `useFlagRuleCustFlags` (`useSanityDeps`) | `custFlag.customerFlags.realGreen.read` | Pass `canLoad` into `useCustFlag` from each component or layout that calls it (`usePriceIncreaseCustFlags` has no parameter yet, so it needs one). Add the `requires` entry to `priceIncrease.increaseSettings.read`, `prepayLetters.prepayConfigs.read` and the sanity flag screens. `useFlagRuleCustFlags` also uses `reloadFlagIds`, which is guarded now | Nothing: the route is migrated. Do it in the final sweep, and with `sanity` |
| `sandbox/flagAddTest/page.tsx` (dispatches `custFlagActions.addCustFlag` four ways, one with an invalid customer id) | `custFlag.flagAssignments.realGreen.write` | Done in the `sandbox` folder: all four buttons are disabled by the write, and `useFlag` and `useEmployee` get `canLoad`. This closes its part of the `useFlag` and `useEmployee` caller rows. The page adds real flags to two hard-coded customers, so decide in the final sweep whether to delete it | The final sweep |
| `useActiveCustomers` callers: `bizPlan/customerValue/layout.tsx` (also `useMultiSeasonProduction`, "Load via API" button), `bizPlan/products/page.tsx`, `usePaceDeps`, `useProductivity`, `sandbox/tli/useTliDeps.ts` (also `useLastSeasonProduction`) | `customer.customers.realGreen.read` | Pass `canLoad` (and `canRefreshLive`) into each hook from the component or layout. The flags exist and default to allowed. Add the `requires` entries to the screens' capabilities, or `customers.read` to each bundle. `LoadViaApiButton` also reads `canLoad` from `useMultiSeasonProduction`, which now includes the flag | Nothing: the routes are migrated. Do it with the pace, bizPlan and productivity sweep |
| `usePrintedCustomers` callers: `useCoverSheetDeps`, `usePrenotify` | `customer.customers.realGreen.read` | Pass `canLoad` into `usePrintedCustomers`. The cover sheet and prenotification screens are not usable by a non-superuser until it and the other reads exist | Closed by `scheduling` (session 13): both hooks pass `canLoad.customers` |
| `useRecentProduction` callers: `useInventoryDeps`, `useLoadoutReportDeps` | `customer.customers.realGreen.read` | Pass `{ canLoad }` as the second argument. Add the `requires` entry to `inventory.inventoryChecks.read` (it lists appMethod and globalSettings reads only) and to the loadout report | Nothing: the route is migrated. The loadout report is done (session 13: `useLoadoutReportDeps` passes `{ canLoad: canLoad.customers }`, and the `requires` entries are on `scheduling.loadouts.read`). Still open: `useInventoryDeps` and its `requires` entry (the `inventory` folder is closed), in the final sweep |
| `useByAssignmentCustomers` callers: `useLoadoutPageDeps`, `useLoadoutFeedbackDeps` | `customer.customers.realGreen.read` | Pass `canLoad` into `useByAssignmentCustomers`. Its `loadByServIds` is called from effects in those two hooks | Closed by `scheduling` (session 13) |
| `usePriorityServiceCustomers`, `useSingleCustomer` (`priorityService/page.tsx`, `PriorityServiceForm`, `quickSend/controls/CustomerPanel.tsx`, `sandbox/callLog/page.tsx`) | `customer.customers.realGreen.read`, `customer.liveCustomers.realGreen.read` | Pass `canLoad` for the lookups and `canRefreshLive` for `refreshCustomer`. Add the `requires` entries to `priorityService.priorityServices.read` and `quickSend.storedTemplates.read` (the customer row of the earlier `priorityService` and `quickSend` rows now has its capability) | Nothing: the routes are migrated. Do it in the final sweep |
| `useFullSeasonServices` callers (sanity: `useSanityDeps` and 15 row and panel components that call `refreshCustomer` or `refresh`) | `customer.customers.realGreen.read`, `customer.liveCustomers.realGreen.read` | `useSanityDeps` passes `canLoad`. Each row's refresh icon calls `refreshCustomer`, so hide or disable it by `liveCustomers.read`. Pass `canRefreshLive` from each row, or hide the icon in one shared component | Nothing: the routes are migrated. Do it with `sanity` |
| `sandbox/corruptedRecords` (`useDeps`: `useCorruptedSyncRecord`, `useCorruptedRecordsCustomers`; `employeeCorrupted` and `programsWithoutServices` pages: `useCustomerQuery`) | `customer.corruptedSyncRecords.read`, `customer.customers.realGreen.read` | Done in the `sandbox` folder for `useCorruptedSyncRecord` and `useCorruptedRecordsCustomers` (`useDeps` takes `canLoad`, the layout is a `GatedPanel` on `corruptedSyncRecords.read`). Still open: `useCustomerQuery` on the two sub-pages (see the row below) | The final sweep |
| `sandbox/customerSync/page.tsx` (posts to `/realGreen/customer/sync/api`, `programSync/api` and `serviceSync/api` by `fetch`) | `customer.customerSync.write` | Done in the `sandbox` folder: both buttons of all three panels are disabled by the write. The Sync Utilities page does the same with a lock and a password, so decide in the final sweep whether to delete this one | The final sweep |
| The hydrated customer entity (`centralSelect`, `makeCustomersSelector`, `serviceConditionSelect`) | `custFlag`, `callLog`, `conditionCode`, `callAhead`, `priorityService`, `assignment` and price table reads | The mirror read returns customers, programs and services, but the screens also hydrate flags, call logs, conditions, call-aheads, priority services and assignments from their own routes. None are in `customer.customers.read`'s `requires` yet, because the readiness table wants the target declared, and `priceTable` and `progServ` are not. Add the `requires` entries on `customers.read` once the rest of the `realGreen` folders are done. A user holding only `customers.read` sees customers with no flags, call logs or conditions | The rest of the `realGreen` folders (`priceTable`, `progServ`, ...) |
| `usePaceDeps`, `usePrepayLettersDeps` (`useDiscount({ autoLoad: true })`) | `discount.discounts.realGreen.read` | Pass `canLoad` into `useDiscount` from the layout or component. The flag exists and defaults to allowed. Add the `requires` entries to `pace` and `prepayLetters.prepayConfigs.read`. Without the read the discount list is empty and prices show with no discount applied | Nothing: the route is migrated. Do it in the final sweep (`pace` and `prepayLetters` are closed) |
| `useEmployee` callers: `usePaceDeps`, `plannedTimeOff/calendar/page.tsx`, `useCoverSheetDeps`, `usePrenotify`, `useLoadoutReportDeps`, `useLoadoutFeedbackDeps`, `useLoadoutFormDeps`, `useLoadoutPageDeps`, `timeCard/layout.tsx`, `sandbox/tli/useTliDeps.ts`, `sandbox/flagAddTest/page.tsx` | `employee.employees.realGreen.read` | Pass `canLoad` into `useEmployee` from the component or layout. The flag exists and defaults to allowed. Add the `requires` entries to `absences.read` (the planned time off row now has its capability), the pace screens and the cover sheet and loadout screens. Without the read names show as ids and the employee pickers are empty. This closes the `realGreen` employee part of the earlier `employeeAvailability` and `plannedTimeOff` rows | Nothing: the route is migrated. Done for `scheduling` and `timeCard` (session 13). Still open: the final sweep |
| `usePriceTable` callers: `usePrepayLettersDeps`, `usePriceIncreaseDeps`, `useCustomerValueDeps` (`bizPlan`), `QuickSendPage`, `realGreen/progServ/progCode/page.tsx`. Readers of `priceTableSelect`: `ProgCodeEditPanel`, `progServSelect` | `priceTable.priceTables.realGreen.read` | Pass `canLoad` into `usePriceTable` from the component or layout. The flag exists and defaults to allowed. This extends the prepay letters, price increase and quick send rows above (they already name the price table read as "none declared", which is now false): add the `requires` entries on `prepayLetters.prepayConfigs.read`, `priceIncrease.increaseSettings.read` and `quickSend.storedTemplates.read`, and on the `bizPlan` and `progServ` screens. It is also the read the hydrated customer row above waited on for `customer.customers.read`'s `requires`. Without the read, prices and price tables show empty | Nothing: the route is migrated. Do it with `progServ`, `bizPlan` and the final sweep |
| `useProgServ` callers: `bizPlan/customerValue/useCustomerValueDeps`, `bizPlan/products/page.tsx`, `useInventoryDeps`, `usePaceDeps`, `usePrepayLettersDeps`, `usePriceIncreaseDeps`, `priorityService/page.tsx`, `useProductivity`, `QuickSendPage`, `sandbox/corruptedRecords/useDeps`, `sandbox/tli/useTliDeps`, `useSanityDeps` (also dispatches `getProgCodeDocs` and `getServCodeDocs` directly), `useCoverSheetDeps`, `useLoadoutReportDeps`, `useLoadoutFeedbackDeps`, `useLoadoutFormDeps`, `useLoadoutPageDeps`, `usePrenotify`. Readers of `progServSelect` (programs and services on every customer) | `progServ.progCodes.realGreen.read`, `progServ.servCodes.realGreen.read` | Pass `canLoad` into `useProgServ` (an object: `progCodes`, `servCodes`) from the component or layout. It defaults to allowed. This extends the `useInventoryDeps`, `usePaceDeps`, prepay letters, price increase, priority service and quick send rows above (they name the program and service reads as "none declared", which is now false): add the `requires` entries on `inventory.inventoryChecks.read`, `pace.assignmentScenarios.read`, `prepayLetters.prepayConfigs.read`, `priceIncrease.increaseSettings.read`, `priorityService.priorityServices.read` and `quickSend.storedTemplates.read`, and on the cover sheet, loadout, prenotify, `bizPlan` and `productivity` screens. It is also the other read the hydrated customer row above waited on for `customer.customers.read`'s `requires`. Without the reads the program and service lists are empty, so customers show no programs and no services | Done for `scheduling` (session 13). Still open: `bizPlan`, the nav bar and the final sweep |

| `useProduct` callers: `bizPlan/products/page.tsx` (with `useUnitConfig`), `useInventoryDeps`, `ServCodeEditPanel`, `useProductRules` (`progServ`), `useCoverSheetDeps` (with `useUnitConfig`), `useLoadoutReportDeps`, `useLoadoutFeedbackDeps`, `useLoadoutFormDeps`, `useLoadoutPageDeps` (the last four also with `useUnitConfig`). Readers of `productSelect`: the loadout, cover sheet, inventory, price increase and prepay selectors | `product.products.realGreen.read`, `product.unitConversions.read` | Pass `canLoad` into `useProduct` (an object: `products`, `unitConversions`, `appMethods`) and `useUnitConfig` (a flag) from the component or layout. They default to allowed. Add the `requires` entries on `inventory.inventoryChecks.read`, the cover sheet, loadout and `bizPlan` screens and the `progServ` screens. This also closes the `useInventoryDeps` row above for products and unit configs, and the `useProduct` -> `useAppMethod` row (the `appMethods` flag now exists). Without the reads the product and conversion lists are empty and quantities cannot be worked out | Done for `scheduling` (session 13). Still open: `inventory`, `bizPlan`, `progServ` and the final sweep |


| `useFlag` callers: `useNavBarDeps` (every page), `usePrepayLettersDeps`, `useCoverSheetDeps`, `CoverSheetsConfigEditor`, `useSanityDeps`, `useCustomerValueDeps` (`bizPlan`), `sandbox/flagAddTest/page.tsx`. Readers of `flagSelect`: `GlobalSettingsForm`, `SetRenewalFlagsSection`, `FlagFilterSection`, `GlobalConfigMenu`, `RenewalFlagsDisplay`, `RenewalFlagFilterWarning`, `FlagMappingsSection`, `priceIncreaseConfigSelect`, `customerIncreaseResultsSelect`, `centralSelectors`, `FlagRuleCRUD`, `sanityFlagRuleSelect`, `ZeroCustomerRow`, `useCustFlag`, `useSelectedCustFlags`, `custFlagListeners` | `flag.flags.realGreen.read` | Pass `canLoad` into `useFlag` from the component or layout. The flag exists and defaults to allowed. Add the `requires` entries to `globalSettings.settings.read` (closes the "nothing to declare until `realGreen/flag` migrates" note in its record), `priceIncrease.increaseSettings.read`, `prepayLetters.prepayConfigs.read`, `flagRule.flagRules.read`, the cover sheet, sanity and `customerValue` screens, and `customer.customers.read` (the hydrated customer row above). `useNavBarDeps` loads it on every page, so a user without `read` gets a refused request on every page until the nav bar passes `canLoad`. Without the read the flag list is empty and flags show as ids or not at all | Done for `scheduling` (`useCoverSheetDeps` and `CoverSheetsConfigEditor`, session 13) and `sanity`. Still open: `bizPlan`, the nav bar and the final sweep |
| `QuickSendPage` (`usePrepay({ autoLoad: true })`), `PrepaySelector`, `quickSendSelect` (`prepaySelect`) | `prepay.prepays.realGreen.read` | Pass `canLoad` into `usePrepay` from the page. The flag exists and defaults to allowed. This extends the `QuickSendWorkspace` row above: add the `requires` entry on `quickSend.storedTemplates.read` with the other `realGreen` reads. Without the read the prepay picker is empty and no prepay percent is applied | Nothing: the route is migrated. Do it with the `QuickSendWorkspace` row and the final sweep |
| `useCoverSheetDeps` (`useServiceCondition()`), `centralSelect` (`serviceConditionSelect`) | `serviceCondition.serviceConditions.realGreen.read` | `useServiceCondition` has a `canLoad` flag (default allowed). Pass it from the cover sheet page or layout, next to the `useCondition` and `useCustFlag` flags in the `useCoverSheetDeps` row, and add the read to the cover sheet screens' `requires`. Without it a service shows no conditions. `centralSelect` hydrates conditions into every service, so every screen that shows services shows none without the read | Closed by `scheduling` (session 13) |
| `usePrepayLettersDeps` (`useTaxCode({ autoLoad: true })`), `useZipCode` callers (`useCustomerValueDeps`, `QuickSendPage`, and the nested `useTaxCode`), `centralSelect` and `zipCodeSelectors` (`taxCodeSelect`) | `taxCode.taxCodes.realGreen.read` | `useTaxCode` has a `canLoad` flag (default allowed). Pass it from the prepay letters layout, and add the `requires` entry to `prepayLetters.prepayConfigs.read` (this extends the `usePrepayLettersDeps` row above). `useZipCode` calls `useTaxCode` with only `autoLoad`, so it needs the flag threaded through when the `zipCode` folder migrates. Without the read tax rates are empty | Nothing: the route is migrated. Do it with `zipCode`, `bizPlan`, `quickSend` and the final sweep |
| `realGreen/syncMetadata/realGreenSync.readme.md` (API Route section) | `syncMetadata.lastSyncTimes.read` | The doc still says the `getAll` route is admin only. Update it. The route has no caller (see its record), so decide in the final sweep whether to delete it | The final docs step and sweep |
| `syncUtils/api/route.ts` (`getSyncStatus`, `runDeltaSync` and the full sync ops, on `roles: ["admin"]`) | its own capabilities (not declared) | `syncUtils` is its own top level folder. It reads `syncMetadata` and `syncLock` through server helpers, so those two folders add no capability for it. `forceClearLock` and the password gated full sync wipe are the ops to review first when it migrates | Closed in session 13: `syncUtils` is declared (`syncStatus`, `deltaSync`, `fullSync`, `syncLocks`) and migrated. See its record |
| `useCoverSheetDeps` (`useRouteNotes({ minDate, maxDate })`), `RoutePlanPage` (`useRouteNotes`), `RoutePlanDateCard`, `RoutePlanEmployeeRow` (`useRouteNotes` for the write callbacks), `scheduling/coverSheets/[routeDate]/page.tsx`, `RoutePlanPage` (`routeNoteSelect`) | `routeNotes.routeNotes.read`, `.write`, `.delete` | `useRouteNotes` has a `canLoad` flag (default allowed). Pass it from `useCoverSheetDeps` (with `scheduling`) and `RoutePlanPage` (the `pace` layout), and add the read to the `pace.assignmentScenarios.read` and cover sheet `requires`. `RoutePlanDateCard` and `RoutePlanEmployeeRow` call it only for `upsert` and `deleteOne`, and the editor disables its own Save and Delete, so they need nothing. The note buttons still open the editor for a user with no `write` (see the `routeNotes` record). Without the read the notes are empty | Done for `scheduling` (session 13: `useCoverSheetDeps` passes `canLoad.routeNotes`). Still open: `RoutePlanPage`, which belongs to the `pace` layout, so confirm it in the final sweep |
| `bizPlan/customerValue/useCustomerValueDeps` (`useZipCode({ autoLoad: true })`), `QuickSendPage` (`useZipCode`), `byZipCodeSelect` (`zipCodeSelect`) | `zipCode.zipCodes.realGreen.read`, `taxCode.taxCodes.realGreen.read` | `useZipCode` has `canLoad` and `canLoadTaxCodes` flags (default allowed). Pass both from `useCustomerValueDeps`'s component or layout and from `QuickSendPage`, and add the zip code read to the customer value screens' and `quickSend.storedTemplates.read` `requires` (this extends the `QuickSendPage` row above). Without the read the by zip table has no city names and no tax | Nothing: the route is migrated. Do it with `bizPlan`, `quickSend` and the final sweep |
| `sanity` row refresh buttons (`CustomerRow`, `PrenotificationCustomerRow`, `PrenotificationProgramRow`, `PrenotificationServiceRow`, `ProgramRow`, `InvalidPromiseNoteRow`, `InvalidValuesRow`, `OrphanedNotesRow`, `SizeSanityCustomerRow`, `ZeroCustomerRow`, `ZeroProgramRow`, `ZeroServiceRow`) and the three panels' `useFullSeasonServices()` | `customer.liveCustomers.realGreen.read`, `customer.customers.realGreen.read` | `useFullSeasonServices` has `canRefreshLive` and `canLoad` (default allowed). Each row would select `allows` and pass `canRefreshLive`. A user without the read presses the button and the server refuses. The layout already gates the whole screen on `customers.read` | Nothing: the route is migrated. Do it in the final sweep (or give the rows one shared wrapper hook) |
| `sandbox/corruptedRecords` sub-pages `employeeCorrupted` and `programsWithoutServices` (`useCustomerQuery`), and the broken `activeCustomers` tab | `customer.customers.realGreen.read` | `useCustomerQuery` was not read or changed. Check it has a `canLoad` flag and pass it from each page. The layout gate covers only `corruptedSyncRecords.read`. The tab list names an `activeCustomers` page that does not exist | Nothing. Do it in the final sweep, or delete the sandbox folder |
| `flagRule` `requires` for the `sanity` flag rules screen | `flag.flags.realGreen.read`, `custFlag.customerFlags.realGreen.read` | `flagRules.read` has no `requires` entries, but the Flag Rules tab loads the flag list and the customer flags to evaluate rules. Add both once the sweep decides whether the screen's set belongs on the declaration (no `sanity` declaration exists to hold them) | The final sweep |
| `useTimeCard` callers outside `timeCard`: `productivity/useProductivity.ts` (`fetchPunches`) and `components/timeCardImport/PunchImportWidget.tsx` (`fetchLastImportedDate`, mounted by `ProductivityLayout`). Readers of `timeCardSelect` and `state.timeCard.docs`: `productivitySelect`, `DayTimeline` | `timeCard.punches.read` | `useTimeCard` has a `canLoad` flag (default allowed), and both fetches skip the request when it is false. Pass it from `ProductivityLayout` (which already selects `allows`) and `PunchImportWidget`. Add `timeCard.punches.read` to the productivity screens' needs (productivity declares nothing, so it is only a note in its record). Without the read there are no punches, so labor hours show as zero | Nothing: the route is migrated. Do it in the final sweep |
| `PunchImportWidget` (the "Time Cards" button and sheet, mounted in `ProductivityLayout`) | `timeCard.punches.write` | The widget opens `PunchImportPanel`, whose Import button is now disabled without `write`, so the import itself is covered. The trigger button still opens the sheet for a user with no `write`, who can then parse a CSV and preview it but not save it | Nothing. Hide the button in the final sweep if wanted |
| `scheduling.serviceEtas.read` as the cover sheet and prenotify entry gate | `scheduling.serviceEtas.read` | The two screens own no data, so they borrow `serviceEtas.read` as their entry capability (an ETA is the one thing both of them edit or show). A user who may use cover sheets and prenotification but should not read ETAs cannot be given that today. If the admin screens need to separate the two screens, add `coverSheets` and `prenotify` singleton reads then | Decide in the final review |
















## Effect on existing users

The role-to-bundle migration does not exist yet, so a user who is not a superuser holds no capabilities. Every route listed below as complete now refuses office and admin users until they are assigned the capabilities by hand. This breaks, for example, the QuickBooks pickers on the `importCCTxn` screens for a non-superuser, even though those screens' own routes still pass by role. Assign what a screen needs (its capability set, below) before relying on it.

## Complete folders

### account

**Contract:** `account/api/AccountMappingContract.ts` (route `account/api/route.ts`), ops `getAll`, `upsert`, `remove`.

**Capabilities** (`account/accountCapabilities.ts`): `account.accountMappings.read`, `.write`, `.delete`.

**Done:** declaration registered. Route on `capability:`. Nav entry gated on `accountMappings.read`. `AccountMappingPanel` wrapped in `GatedPanel`. `AccountMappingRow` disables both pickers by `write` and the remove button by `delete`. `useAccount` takes `canLoad` flags for the deposit links and the three QuickBooks reads, set by `AccountMappingEditor` from `allows(...)`, and guards the mount load and `refresh`. `accountMappings.read` `requires` the deposit read and the QuickBooks accounts, customers and vendors reads.

**Decisions made by default:** the page keeps `GatedPanel` (whole-screen gate) because everything on it depends on the account read. The deposit sections use an inline note instead, because a user can hold the account links without the deposit links.

**Screen capability set:** `account.accountMappings.read` plus its `requires` (`depositMapping.depositFieldLinks.read`, `quickbooks.accounts.qbo.read`, `quickbooks.customers.qbo.read`, `quickbooks.vendors.qbo.read`). Add `.write` and `.delete` to edit. RealGreen accounts are still ungated (deferred).

### javelin/depositMapping

**Contract:** `javelin/depositMapping/api/DepositFieldMappingContract.ts` (route `api/route.ts`), ops `getAll`, `upsert`, `remove`. No screen of its own: its two sections render inside `AccountMappingPanel`.

**Capabilities** (`depositMappingCapabilities.ts`): `depositMapping.depositFieldLinks.read`, `.write`, `.delete`.

**Done:** declaration registered. Route on `capability:`. `DepositFieldRow` disables both pickers by `write`, the account remove button by `delete`, and the default-name remove button by `write`. New `DepositMappingSections` shows "You do not have access to the deposit account links." without `read`, instead of empty pickers.

**Decisions made by default:** a separate `depositMapping` feature (not a resource of `account`), so the links can be assigned apart from the account links. An inline note, not `GatedPanel`, which would replace the whole screen.

**Screen capability set:** `depositMapping.depositFieldLinks.read`, plus `.write` and `.delete` to change or remove a link.

### qbo reference data (`account`, `customer`, `employee`, `vendor`)

**Contracts and ops:** `account.getAll`, `customer.getAll`, `employee.getAll`, `vendor.getAll`, `vendor.createVendor`. All routes use `createQboRpcHandler`, which passes `capability` through.

**Capabilities** (`qbo/quickbooksCapabilities.ts`, feature `quickbooks`, source `qbo`):

| Op | Capability |
|---|---|
| `account.getAll` | `quickbooks.accounts.qbo.read` |
| `customer.getAll` | `quickbooks.customers.qbo.read` |
| `employee.getAll` | `quickbooks.employees.qbo.read` |
| `vendor.getAll` | `quickbooks.vendors.qbo.read` |
| `vendor.createVendor` | `quickbooks.vendors.qbo.write` |

**Irreversible op (review first):** `createVendor` creates a real vendor in the live books, and this app cannot rename or delete it. It was admin only, so it has its own capability and a comment in the declaration and the route. Never fold it into a read-only bundle.

**Done:** declaration registered. Four routes on `capability:` (no `roles` left in these four folders). `useAccount` and `useImportCCTxnDeps` take `canLoad` flags for the four reads and set them from the layout or the editor.

**Decisions made by default:** feature named `quickbooks` with `source: "qbo"` (avoids `qbo.x.qbo.read`). `employees` included although only `importCCTxn` loads it. `vendors.write` is separate from `vendors.read`.

**Screen capability set:** the four reads, plus `vendors.write` for whoever creates vendors.

### appMethod

**Contract:** `appMethod/api/AppMethodContract.ts` (route `api/route.ts`), ops `getAll`, `upsert`, `deleteOne`, `checkDependencies`. Gates before: `getAll` admin, office, tech. The other three admin, office.

**Irreversible op (review first):** `deleteOne` with `clearReferences` also pulls the method out of product equipment packages and out of equipment, and putting the method back does not restore those references. It sits under `appMethods.delete`, which nothing else shares. Assign `delete` deliberately.

**Capabilities** (`appMethod/appMethodCapabilities.ts`, feature `appMethod`):

| Op | Capability |
|---|---|
| `getAll` | `appMethod.appMethods.read` |
| `upsert` | `appMethod.appMethods.write` |
| `deleteOne` | `appMethod.appMethods.delete` |
| `checkDependencies` | `appMethod.appMethods.delete` |

**Done:** declaration registered. Route on `capability:` (no `roles` left). `AppMethodCRUD` wrapped in `GatedPanel` (the editor became an inner component, so its mount load never fires without `read`). `AppMethodCreate` disables Save by `write` and the "Delete Application Method" button by `delete`. `AppMethodDeleteSheet` disables its Delete button by `delete`. `useAppMethod` takes a `canLoad` flag (default allowed) that guards the mount load and `refresh`.

**Decisions made by default:** `checkDependencies` is under `delete`, not `read`: only the delete sheet calls it, and it returns equipment records that belong to another feature. `getAll` was open to tech and now needs `read` like everyone else. No `requires` entry yet (see the deferred table).

**Screen capability set:** `appMethod.appMethods.read`, plus `.write` to save and `.delete` to delete. The delete sheet also shows product and equipment data, which is not gated yet (deferred).

### assignment

**Contracts:** `assignment/api/AssignmentContract.ts` (route `api/route.ts`), ops `getByServIds`, `getBySchedDate`, `getAvailableDates`, `getBySchedDateRange`, `saveAssignments`. And `assignment/migrate/api/route.ts` (inline contract), op `migrateAssignments`. Gates before: reads office, admin, tech. `saveAssignments` admin, office. `migrateAssignments` admin.

**Irreversible op (review first):** `migrateAssignments` is a one-time copy of the old embedded assignments into the standalone collection. It overwrites each service's stored assignments, and the page that calls it (`sandbox/assignmentMigrate`) says to run it once. It has its own capability and must never be put in a bundle. Remove the resource with the migrate route once the migration has been run.

**Capabilities** (`assignment/assignmentCapabilities.ts`, feature `assignment`):

| Op | Capability |
|---|---|
| `getByServIds`, `getBySchedDate`, `getAvailableDates`, `getBySchedDateRange` | `assignment.serviceAssignments.read` |
| `saveAssignments` | `assignment.serviceAssignments.write` |
| `migrateAssignments` | `assignment.legacyAssignmentMigration.write` |

**Done:** declaration registered. Both routes on `capability:` (no `roles` left). `UnservDropZone` (the unserviced report upload) showed itself by `role` in admin or office. It now shows by `serviceAssignments.write`. `useAssignments` takes a `canLoad` flag (default allowed) that guards its load.

**Decisions made by default:** the history is append-only (saving never edits or removes an entry), so no `delete` verb. One resource for all four reads. `legacyAssignmentMigration` is a singleton resource of its own so it can never share a capability with the reads. No `requires` entry: the loads that need assignments live in other folders (deferred).

**Screen capability set:** `assignment.serviceAssignments.read` for any screen that shows assignments, plus `.write` to upload the unserviced report. The migrate page needs `legacyAssignmentMigration.write`.

### assignmentGroup

**Contract:** `assignmentGroup/api/AssignmentGroupContract.ts` (route `api/route.ts`), ops `getGroups`, `upsertGroup`, `deleteGroup`. Gates before: `getGroups` admin, office, tech. The other two admin, office.

**Capabilities** (`assignmentGroup/assignmentGroupCapabilities.ts`, feature `assignmentGroup`): `assignmentGroup.assignmentGroups.read` (`getGroups`), `.write` (`upsertGroup`), `.delete` (`deleteGroup`).

**Done:** declaration registered. Route on `capability:` (no `roles` left). `AssignmentGroupManager` wrapped in `GatedPanel` (inner `AssignmentGroupEditor`). New Group and Edit label are disabled by `write`, the delete button by `delete`. `useAssignmentGroup` takes a `canLoad` flag (default allowed).

**Finding for review:** nothing imports `AssignmentGroupManager`, and nothing calls `useAssignmentGroup` with `autoLoad`, so this folder's screen and its `getGroups` load are unreachable today. The pace module has its own copy (`pace/assignmentGroup`, its own route, slice and hook) over the same `AssignmentGroup` model. The folder may be dead code. Decide before assigning these capabilities to anyone.

**Decisions made by default:** a separate feature. `pace/assignmentGroup/api/route.ts` is still on roles and migrates with the `pace` folder, which should either reuse these capabilities (same stored groups) or declare its own.

**Screen capability set:** `assignmentGroup.assignmentGroups.read`, plus `.write` and `.delete`. The group picker also reads service codes, which are not gated yet.

### auth

**Contract:** `auth/_types/AuthContract.ts` (route `api/route.ts`), 14 ops.

| Op | Gate now | Gate before |
|---|---|---|
| `checkEligibility`, `register`, `login`, `logout`, `refresh`, `checkAuth`, `requestPasswordReset` | `'public'` | `roles: ["public"]` |
| `confirmPassword`, `changePassword` | `'public'` | any role including `applied` |
| `createUser`, `deleteUser` | `'superUser'` | already `'superUser'` |
| `getPendingActions` | `auth.accessRequests.read` | admin |
| `approveUser`, `resolvePasswordReset` | `auth.accessRequests.write` | admin |

**Irreversible op (review first):** `approveUser` sets a user's `role`, and roles still gate every route that has not migrated. Anyone holding `accessRequests.write` can therefore make a user an admin on those routes, which is a path to more access than their own capabilities. Assign `write` to superusers or to admins you would trust with that. `resolvePasswordReset` shares the `write` capability, so it can reset another user's password. The existing guard (`canResetPasswordOf`: a kiosk or superuser target needs a superuser caller) stays.

**Capabilities** (`auth/authCapabilities.ts`, feature `auth`): `auth.accessRequests.read`, `.write`.

**Done:** declaration registered. Route on `capability:` (no `roles` left, and the `ROLES` import is gone). `confirmPassword` and `changePassword` are `'public'` because each handler verifies the access cookie itself and refuses a missing session, so a signed-in `applied` user still passes. The inbox button in `NavBar` showed by `role === "admin"`. It now shows by `accessRequests.read`. `AuthInitializer` loaded the pending actions for admins. It now loads them once `accessRequests.read` is allowed, and reruns when the capabilities finish loading after login. `AdminActionModal` disables Approve and the role select by `write`, and Reset Password and Confirm by `write`.

**Decisions made by default:** `approveUser` and `resolvePasswordReset` share `accessRequests.write`. Split password resets into their own resource if they should be assignable apart from approvals. The "applied" state and the role select stay until roles are removed (deferred).

**Screen capability set:** `auth.accessRequests.read` to see the inbox, `.write` to approve or reset. Nothing else is required.

### bizPlan

**No routes, no contracts, no declaration.** The folder holds two screens (`bizPlan/products`, and `bizPlan/customerValue` with its three sub-pages) built from other features' data: customers, programs and services, products, unit config, price tables, zip codes and flags. It has no role checks in components.

**Decisions made by default:** nothing to declare. A capability here would gate no data and grant nothing, and the plan keeps page permissions out of scope. A screen's access is the reads of the features it shows. The `Product Forecast` nav entry in `NavMenu.tsx` stays on `roles: ["admin"]` until those features are declared (deferred).

**Screen capability set:** the union of the reads of the features it loads. It cannot be written down until `realGreen`, `priceIncrease`, `inventory` and the rest are declared.

### csv

**Contract:** `csv/api/csvContract.ts` (route `api/route.ts`), one op: `saveAssignments`. Gate before: admin, office.

**Capabilities:** no declaration. The folder owns no data. `saveAssignments` was moved to `assignment/api/route.ts` and the `csv` route is a stub that stores nothing, so it reuses `assignment.serviceAssignments.write`.

| Op | Capability |
|---|---|
| `saveAssignments` (stub) | `assignment.serviceAssignments.write` |

**Done:** stub route on `capability:` (no `roles` left in the folder). The parsers (`depositParser`, `genLedgerParser`, `unservicedParser`) are pure and call no route. `useCSV` calls `useAssignments().saveAssignments()`, which is the real, already migrated op. Its one caller, `UnservDropZone`, already hides the drop zone by `serviceAssignments.write`.

**Finding for review:** the stub route and `centralDocPropsSlice` (its only caller, registered in `store/reducers/index.ts`) look like dead code. Nothing dispatches `centralDocPropsActions.saveAssignments`. Delete the route, contract, slice and selector together when convenient.

**Decisions made by default:** reuse the real op's capability instead of declaring a `csv` feature that would gate nothing.

**Screen capability set:** `assignment.serviceAssignments.write` to upload the unserviced report. The deposit and general ledger parsers run in the browser and need no capability here (the `javelin` folder gates what they post).

### employeeAvailability

**Contract:** `employeeAvailability/api/EmployeeAvailabilityContract.ts` (route `api/route.ts`), ops `getAll`, `upsert`, `deleteOne`. Gates before: admin, office for all three.

**Capabilities** (`employeeAvailability/employeeAvailabilityCapabilities.ts`, feature `employeeAvailability`):

| Op | Capability |
|---|---|
| `getAll` | `employeeAvailability.availabilityConstraints.read` |
| `upsert` | `employeeAvailability.availabilityConstraints.write` |
| `deleteOne` | `employeeAvailability.availabilityConstraints.delete` |

**Done:** declaration registered. Route on `capability:` (no `roles` left). `EmployeeAvailabilitySheet` disables Save by `write` and both "Remove All Constraints" buttons by `delete`, and shows an inline note without `read` (the stored dates never load then, so a save would replace them unseen). `useEmployeeAvailability` takes a `canLoad` flag (default allowed) that guards the mount load.

**Decisions made by default:** an inline `Notice`, not `GatedPanel`: the sheet is opened from the pace employee setup panel and is not a screen of its own. `deleteOne` has its own `delete` verb. Removing a constraint can be undone by entering the dates again, so it is not treated as irreversible.

**Screen capability set:** `availabilityConstraints.read` to see the dates, `.write` to save, `.delete` to remove. The employee name and id come from `realGreen/employee`, which is not declared yet.

### equipment (with `equipmentPackage`)

**Contracts and ops:** `equipment/api` (`getAll`, `upsert`, `deleteOne`, `checkDependencies`) and `equipment/equipmentPackage/api` (the same four). Gates before: `getAll` admin, office, tech. The other three admin, office.

**Irreversible op (review first):** both `deleteOne` ops can clear references. Deleting equipment with `clearReferences` pulls it out of every equipment package, and deleting a package pulls it out of every product master (`ProductDocPropsModel`). Putting the item back does not restore those references. Each sits under its own `delete` verb, which nothing else shares. Assign `delete` deliberately.

**Capabilities** (`equipment/equipmentCapabilities.ts`, feature `equipment`, two resources):

| Op | Capability |
|---|---|
| `equipment.getAll` | `equipment.equipmentDefinitions.read` |
| `equipment.upsert` | `equipment.equipmentDefinitions.write` |
| `equipment.deleteOne`, `equipment.checkDependencies` | `equipment.equipmentDefinitions.delete` |
| `equipmentPackage.getAll` | `equipment.equipmentPackages.read` |
| `equipmentPackage.upsert` | `equipment.equipmentPackages.write` |
| `equipmentPackage.deleteOne`, `equipmentPackage.checkDependencies` | `equipment.equipmentPackages.delete` |

**Done:** declaration registered, with `requires`: `equipmentDefinitions.read` needs `appMethod.appMethods.read` (the form offers application methods), and `equipmentPackages.read` needs `equipmentDefinitions.read` (the package form offers equipment). Both routes on `capability:` (no `roles` left in the folder). `EquipmentCRUD` and `EquipmentPackageCRUD` are wrapped in `GatedPanel` (the editor became an inner component, so its mount load never fires without `read`). `EquipmentForm` and `EquipmentPackageForm` disable Save by `write` and the delete button by `delete`. Both delete sheets disable their Delete button by `delete`. `useEquipment` and `useEquipmentPackage` take a `canLoad` flag (default allowed) that guards the mount load and `refresh`. `EquipmentPackageEditor` passes `canLoad` from `equipmentDefinitions.read` into its `useEquipment` call, so a user holding only package access fires no refused request.

**Finding for review:** `EquipmentForm` reads `appMethodSelect.appMethodDocs` but does not load them. Its callers load them elsewhere (the product and loadout screens), so a user without `appMethods.read` sees an empty method list in the equipment form. `getAll` was open to tech and now needs `read` like everyone else.

**Decisions made by default:** one `equipment` feature with two resources named for the data (`equipmentDefinitions`, `equipmentPackages`), not two features, because they ship and are assigned together. `checkDependencies` is under `delete`, not `read`, as in `appMethod`: only the delete sheets call it. The package delete sheet also shows product masters from `realGreen/product`, which is not declared yet (deferred).

**Screen capability set:** `equipment.equipmentDefinitions.read` (plus `appMethod.appMethods.read`) for the equipment editor. `equipment.equipmentPackages.read` (plus `equipmentDefinitions.read`) for the package editor. Add `.write` and `.delete` on each to change or remove.

### flagRule

**Contract:** `flagRule/FlagRuleContract.ts` (route `api/route.ts`), ops `getAll`, `upsert`, `deleteOne`. Gates before: `getAll` and `upsert` admin, office. `deleteOne` admin only.

**Capabilities** (`flagRule/flagRuleCapabilities.ts`, feature `flagRule`):

| Op | Capability |
|---|---|
| `getAll` | `flagRule.flagRules.read` |
| `upsert` | `flagRule.flagRules.write` |
| `deleteOne` | `flagRule.flagRules.delete` |

**Done:** declaration registered. Route on `capability:` (no `roles` left). `useFlagRule` takes a `canLoad` flag (default allowed) that guards the mount load. The folder has no components. Its UI is `sanity/flags` (`FlagRuleCRUD`, the rules page and `useSanityDeps`), which is a different top-level folder.

**Decisions made by default:** `deleteOne` stays its own `delete` verb, so the old admin-only delete can be assigned apart from the office-level upsert. No `requires` entry yet: the rule screens also load customers and flags, which are not declared yet (deferred).

**Screen capability set:** `flagRule.flagRules.read`, plus `.write` to save and `.delete` to remove. The sanity flag screens also need the reads of the customer and flag features they evaluate rules against.

### formDataTypes

**No routes, no contracts, no declaration.** The folder holds one file, `formDataTypeRegistry.ts`, a static in-code registry of form data types (today only `PrepayLetter`) with each type's label, sample data, contract and background image. It reads nothing from the server and has no role checks. Its importers are `formTemplate` (the contract file and the page) and `prepayLetters/renewalLetters/useRenewalLetterPdf.tsx`.

**Decisions made by default:** nothing to declare. A capability here would gate no data and grant nothing. Access to what the registry feeds is the stored form templates' own routes, which migrate with the `formTemplate` folder.

**Screen capability set:** none of its own.

### formTemplate

**Contract:** `formTemplate/FormTemplateContract.ts` (route `api/route.ts`), ops `getAll`, `upsert`, `deleteOne`. Gates before: all three admin, office.

**Capabilities** (`formTemplate/formTemplateCapabilities.ts`, feature `formTemplate`):

| Op | Capability |
|---|---|
| `getAll` | `formTemplate.formTemplates.read` |
| `upsert` | `formTemplate.formTemplates.write` |
| `deleteOne` | `formTemplate.formTemplates.delete` |

**Done:** declaration registered. Route on `capability:` (no `roles` left). Nav entry "Form Templates" gated on `formTemplates.read`. `page.tsx` wraps a new inner `FormTemplateWorkspace` in `GatedPanel`, so the mount load never fires without `read`. `FormTemplateFileControls` disables Save by `write`, hides Save As without `write` (`EntityFileControls` has no disabled state for it, so `supportsMultiple` is set from the capability), and disables the Delete menu item and the confirm button by `delete` (still also requiring ownership). `useFormTemplate` takes a `canLoad` flag (default allowed) that guards the mount load. The folder has no role checks in components.

**Decisions made by default:** one `formTemplates` collection with the three verbs. Ownership stays a server rule apart from access: `upsert` derives `templateId` and `saId` from the caller, and `deleteOne` refuses a template the caller does not own, so `write` and `delete` only ever act on the holder's own templates. No `requires`: the editor reads only the static `formDataTypes` registry (in code, no capability). `getAll` returns every user's templates (shared by design), as before.

**Finding for review:** the prepay letter screens read these templates too. `usePrepayLettersDeps` calls `useFormTemplate({ autoLoad: true })` and `renewalLettersSelect` reads `formTemplateSelect.templatesWithDisplayName`. A prepay user who lacks `formTemplates.read` now gets a refused load there (deferred below).

**Screen capability set:** `formTemplate.formTemplates.read` to open the page, plus `.write` to save or Save As and `.delete` to remove own templates.



### globalSettings

**Contract:** `globalSettings/api/GlobalSettingsContract.ts` (route `api/route.ts`), ops `updateSettings`, `getSettings`. Gates before: `updateSettings` admin only, `getSettings` admin, office, tech.

**Capabilities** (`globalSettings/globalSettingsCapabilities.ts`, feature `globalSettings`, one singleton resource):

| Op | Capability |
|---|---|
| `getSettings` | `globalSettings.settings.read` |
| `updateSettings` | `globalSettings.settings.write` |

**Done:** declaration registered. Route on `capability:` (no `roles` left). `/globalSettings` page wrapped in `GatedPanel` (the form loads on mount). `GlobalSettingsForm` disables the season input and Save by `write`, and `RenewalFlagsSection` disables its three selects by `write`. `useGlobalSettings` and `useRenewalFlagIds` take a `canLoad` flag (default allowed) that guards the mount load and `refresh`.

**Finding for review:** `getSettings` was open to tech, and nearly every screen calls it for the current season (about 35 callers across `realGreen/customer`, `scheduling`, `prepayLetters`, `priceIncrease`, `priorityService`, `quickSend`, `sanity` and the nav bar). Every one of those screens now needs `globalSettings.settings.read` for its data to load, and none of them lists it in a `requires` yet. Hand out `read` to anyone who uses those screens, or they get a refused load with no season. `NavBar` loads it for everyone through `useNavBarDeps` -> `useRenewalFlagIds`, so a user without `read` gets a refused request on every page until the nav bar passes `canLoad`.

**Decisions made by default:** a singleton with `read` and `write` (the settings are one stored document, not a list). `write` is one verb for the whole document even though the nav bar, the price increase config and the settings page each edit a different slice of it. Splitting it per section would mean a different server check per key, which the route does not do. No `requires` yet: the form also lists RealGreen flags (`flagSelect`) and loads nothing for them itself, so there is nothing to declare until `realGreen/flag` migrates.

**Screen capability set:** `globalSettings.settings.read` to open the page, plus `.write` to change the season or the renewal flags.


### holiday

**Contract:** `holiday/api/HolidayContract.ts` (route `api/route.ts`), ops `getAll`, `upsert`, `deleteOne`. Gates before: `getAll` and `upsert` admin, office. `deleteOne` admin only.

**Capabilities** (`holiday/holidayCapabilities.ts`, feature `holiday`):

| Op | Capability |
|---|---|
| `getAll` | `holiday.holidays.read` |
| `upsert` | `holiday.holidays.write` |
| `deleteOne` | `holiday.holidays.delete` |

**Done:** declaration registered. Route on `capability:` (no `roles` left). Nav entry "Holidays" gated on `holidays.read` (it was admin only, so it now shows for anyone holding the read). `page.tsx` wraps a new inner `HolidayWorkspace` in `GatedPanel`, so the mount load never fires without `read`. `HolidayForm` disables Save by `write` (through `canSave`) and both delete buttons by `delete`. The "New Holiday" button is disabled by `write`. `useHoliday` takes a `canLoad` flag (default allowed) that guards the mount load.

**Decisions made by default:** `deleteOne` stays its own `delete` verb, so the old admin-only delete can be assigned apart from the office-level upsert. No `requires`: the page loads only holidays. The pace, productivity, time off calendar and employee screens read holidays too, and those are deferred below.

**Screen capability set:** `holiday.holidays.read` to open the page, plus `.write` to add or edit and `.delete` to remove.


### inventory

**Contract:** `inventory/api/InventoryContract.ts` (route `api/route.ts`), ops `getInventoryChecks`, `saveInventoryCheck`. Gates before: both admin only.

**Capabilities** (`inventory/inventoryCapabilities.ts`, feature `inventory`):

| Op | Capability |
|---|---|
| `getInventoryChecks` | `inventory.inventoryChecks.read` |
| `saveInventoryCheck` | `inventory.inventoryChecks.write` |

**Done:** declaration registered, with `requires`: `inventoryChecks.read` needs `appMethod.appMethods.read` (the product list loads its application methods through `useProduct`) and `globalSettings.settings.read` (the recent production load uses the current season). Route on `capability:` (no `roles` left in the routes). Nav entry "Monthly Inventory" gated on `inventoryChecks.read` (it was admin only). The three pages (`/inventory`, `/inventory/history`, `/inventory/[productId]`) are each wrapped in `GatedPanel` through a new inner component, so their mount loads never fire without `read`. The two `role !== "admin"` redirect effects and the `return null` checks in the index and history pages are removed, since `GatedPanel` replaces them. `SaveInventoryButton` disables the footer button and the confirm button by `write`.

**Decisions made by default:** no `delete` verb, because the route has none. A check is replaced only by saving again on the same date, and that replace is the normal edit (the count screen reloads today's check to continue it), so it stays under `write`. The count screen's other actions (add product, add or remove a count, pick a date range) change only the local session in Redux and `localStorage`, so they are not gated.

**Finding for review:** `useInventoryDeps` also loads product masters, unit configs, program and service codes, and customer recent production, none of which are declared yet. A user holding only the inventory capabilities gets refused loads for those until `realGreen/product`, `realGreen/progServ` and `realGreen/customer` migrate, so the screen is not usable by a non-superuser yet. The `requires` list names only what exists today. Also, the old redirect sent a non-admin to `/`, and the new gate shows "You do not have access" in place.

**Screen capability set:** `inventory.inventoryChecks.read` (plus `appMethod.appMethods.read` and `globalSettings.settings.read`) to open the screens, plus `.write` to save a check. The product, unit config, program and service code and customer reads are still needed and are not declarable yet.


### javelin (the `api` route, layout and headers)

**Irreversible op (review first):** `postGenLedger`, `postDeposits` and `postCkDeposits` create real journal entries in the live QuickBooks books, and this app cannot undo or edit them. They hold their own capability, `javelin.journalEntryPostings.qbo.write`, never shared with a preview read. It is one capability for all three post ops because they post through the same server path (`postPlanned`). Split it per kind if General Ledger, credit card deposits and check deposits need to be assigned apart. It was admin only before, so assign it deliberately and keep it out of read-only bundles.

**Contract:** `javelin/api/JavelinContract.ts` (route `api/route.ts`, `createQboRpcHandler`), 7 ops. Gates before: all admin only. `depositMapping` is a separate folder and was done earlier.

**Capabilities** (`javelin/javelinCapabilities.ts`, feature `javelin`):

| Op | Capability |
|---|---|
| `previewGenLedger`, `previewDeposits`, `previewCkDeposits`, `getLatest` | `javelin.entryPlans.read` |
| `postGenLedger`, `postDeposits`, `postCkDeposits` | `javelin.journalEntryPostings.qbo.write` |

**Done:** declaration registered, with `requires`: `journalEntryPostings.write` needs `entryPlans.read` (a post is always run from a preview). Route on `capability:` (no `roles` left). `layout.tsx` replaced its `role !== "admin"` alert with `GatedPanel` on `entryPlans.read`, so `useJavelinDeps` (which loads the latest postings) only mounts for a user who holds it. `JavelinHeader`, `DepositHeader` and `CkDepositHeader` replaced `role === "admin"` with `allows(journalEntryPostings.write)`: the Post button shows only to someone who holds it, and everyone else sees "You cannot post to QuickBooks." The three pages (`page.tsx`, `ccDeposits`, `ckDeposits`) are thin and sit inside the layout gate, so they need no gate of their own. `settings/page.tsx` is `AccountMappingPanel`, which carries its own `account.accountMappings.read` gate.

**Decisions made by default:** `entryPlans` is a collection with only `read`, named for the data the previews return (the plans), not for the screen. `journalEntryPostings` is a singleton with `source: "qbo"` and only `write`, since it is a single action on the books with no data of its own. `getLatest` sits under `entryPlans.read` because it returns the last posted entry and unconfirmed outcomes, which the banner on every tab needs. The layout gate is one `GatedPanel` over the whole shell, not one per tab, because all four tabs (including Settings) sit behind the same shell and its load. There is no nav entry for Javelin in `NavMenu.tsx`, so nothing to gate there. `useJavelin` takes no `canLoad`: it has one caller (`useJavelinDeps`), which is already inside the gate.

**Finding for review:** the server builds each entry from the stored account links, the QuickBooks accounts and earlier postings by itself (`javelinContextServer`, `javelinPlanServer`), so a user holding only the `javelin` capabilities does not also need `account`, `depositMapping` or `quickbooks` reads for the previews and posts to work. They do need them to open the Settings tab and edit the links. `javelin.readme.md` still says the page is admin only: it needs a rewrite at the final docs step.

**Screen capability set:** `javelin.entryPlans.read` to open any tab, check entries and see the latest banner, plus `javelin.journalEntryPostings.qbo.write` to post. The Settings tab also needs the `account` capability set.


### knowledgeBase

**Contract:** `knowledgeBase/api/TopicContract.ts` (route `api/route.ts`), ops `getAll`, `upsert`, `remove`. Gates before: `getAll` admin, office. The other two admin only.

**Capabilities** (`knowledgeBase/knowledgeBaseCapabilities.ts`, feature `knowledgeBase`):

| Op | Capability |
|---|---|
| `getAll` | `knowledgeBase.topics.read` |
| `upsert` | `knowledgeBase.topics.write` |
| `remove` | `knowledgeBase.topics.delete` |

**Done:** declaration registered. Route on `capability:` (no `roles` left). `useTopics` takes a `canLoad` flag (default allowed) that guards the mount load.

**Finding for review:** the folder has no screen, and nothing calls `useTopics` yet (the RingCentral call assist work in `ringCentral/rcOnboarding.md` is the intended consumer). So there is no nav entry, `GatedPanel` or control to gate. `ringCentral/rcOnboarding.md` still lists the old role gates for the three ops.

**Decisions made by default:** a separate feature owned by the folder, one resource named for the data (`topics`), one verb per op. Topics are removed by key and cannot be restored from the app, but they can be entered again, so `remove` is a plain `delete` verb and not treated as irreversible.

**Screen capability set:** none today. When the call assist screen exists it needs `knowledgeBase.topics.read`, plus `.write` and `.delete` to edit the topics.

### legal, loadout, machines (nothing to declare)

- `legal`: two static public pages (`/legal/terms`, `/legal/privacy`) listed in `AUTH_CONST.OPEN_PATHS`. No routes, no data, no gate by design.
- `loadout`: a client data module (slice, selectors, `useLoadout`) with no route of its own. Its thunks call `scheduling/dailyInventory/api`, so its access is that folder's capabilities, which migrate with `scheduling`. Callers outside the folder are all in `scheduling/dailyInventory`.
- `machines`: a static in-code list (`machines` in `MachineTypes.ts`). No routes, no data, no gate.

### pace

**Contracts and ops:** four routes, all ordinary `createRpcHandler`. `pace/assignmentPlan/api` (`getScenarios`, `upsertScenario`, `deleteScenario`, `activateScenario`), `pace/groupSequence/api` (`getSequences`, `upsertSequence`, `deleteSequence`), `pace/seasonPlan/api` (`getSeasonPlans`, `upsertSeasonPlan`, `deleteSeasonPlan`, `activateSeasonPlan`) and `pace/assignmentGroup/api` (`getGroups`, `upsertGroup`, `deleteGroup`). Gates before: every read admin, office, tech. Scenario writes, `deleteSeasonPlan` and the scenario delete admin only. The sequence, season plan and group writes admin, office.

**Capabilities** (`pace/paceCapabilities.ts`, feature `pace`):

| Op | Capability |
|---|---|
| `getScenarios` | `pace.assignmentScenarios.read` |
| `upsertScenario`, `activateScenario` | `pace.assignmentScenarios.write` |
| `deleteScenario` | `pace.assignmentScenarios.delete` |
| `getSequences` | `pace.groupSequences.read` |
| `upsertSequence` | `pace.groupSequences.write` |
| `deleteSequence` | `pace.groupSequences.delete` |
| `getSeasonPlans` | `pace.seasonPlans.read` |
| `upsertSeasonPlan`, `activateSeasonPlan` | `pace.seasonPlans.write` |
| `deleteSeasonPlan` | `pace.seasonPlans.delete` |
| `pace/assignmentGroup` `getGroups`, `upsertGroup`, `deleteGroup` | `assignmentGroup.assignmentGroups.read`, `.write`, `.delete` (reused, no new capability) |

**Done:** declaration registered, with `requires` on `assignmentScenarios.read`: the sequence and season plan reads, `assignmentGroup.assignmentGroups.read`, `holiday.holidays.read`, `employeeAvailability.availabilityConstraints.read` and `assignment.serviceAssignments.read`. All four routes on `capability:` (no `roles` left in the pace routes). Nav entry "Pace" gated on `assignmentScenarios.read`. `layout.tsx` is now a `GatedPanel` on `assignmentScenarios.read` around a new inner `PaceShell`, so `usePaceDeps` only mounts for a user who holds it. `PaceShell` passes `canLoad` flags built from `allows(...)` into `usePaceDeps`, which passes them on to `usePaceAssignmentGroup`, `useGroupSequence`, `usePaceSeasonPlan`, `useHoliday`, `useEmployeeAvailability` and `useAssignments`. The three pace hooks gained a `canLoad` flag (default allowed). `SeasonPlanPage` is wrapped in `GatedPanel` on `seasonPlans.read` (inner `SeasonPlanWorkspace`), with New Plan, Create First Plan, Activate, Copy and Edit disabled by `write` and both delete buttons by `delete`. `PaceScenarioSelector` disables Save, Save As and switching the active scenario by `write`, and both delete buttons by `delete`. `GoalMultiplierSlider` disables "Apply & Save" by `write` (plain Apply only changes local state). Setup groups: `GroupNavPanel` disables New Group by `assignmentGroups.write` and New Sequence by `groupSequences.write`, and the inline sequence name and days inputs, the edit button and the delete button by the sequence `write` and `delete`. `GroupNavItem` and `DeleteGroupDialog` disable delete by `assignmentGroups.delete`. `DeleteSequenceDialog` disables its confirm by `groupSequences.delete`. `GroupDialog` saves only with `assignmentGroups.write` (and `groupSequences.write` too when the group joins an existing sequence, since it also saves that sequence). `SequenceDialog` saves only with `groupSequences.write`. `GroupScheduleDialog` saves only with `seasonPlans.write`. The availability button in `EmployeeAssignmentPanel` is disabled without `availabilityConstraints.read` (the sheet already gates itself).

**Finding for review:** nothing in pace is usable by a non-superuser yet. `usePaceDeps` also loads RealGreen customers, programs and services, employees and discounts, priority services and planned time off, none of which are declared or gated, so a user holding only the pace capabilities gets refused loads for those until those folders migrate (the same situation as `inventory`). Gates changed in effect: every pace read was open to the tech role, and now nobody holds it until it is assigned. Scenario writes, scenario delete and `deleteSeasonPlan` were admin only and are now their own verbs, so assign them deliberately. A user who holds `assignmentScenarios.read` but not `seasonPlans.read` sees the "No active season plan" banner in the layout, because the load is skipped and the plan list stays empty. Deleting a service code group removes it from the local assignment plans (a client-side change) and the plans persist on the next scenario Save, so `assignmentGroups.delete` without `assignmentScenarios.write` leaves the stored plans still pointing at the deleted group until someone with the write saves.

**Decisions made by default:** a separate `pace` feature with one resource per stored collection, named for the data (`assignmentScenarios`, `groupSequences`, `seasonPlans`), and one verb per op that exists. `activateScenario` and `activateSeasonPlan` sit under `write`: they only flip which stored plan is active, and the previous one can be activated again. `pace/assignmentGroup` reuses `assignmentGroup.assignmentGroups.*` (same stored documents, same model name) instead of declaring a duplicate, so granting one grants the same thing on both routes. `assignmentScenarios.read` is the gate for the whole shell (`GatedPanel` in the layout) because the header selector, the engine and every tab depend on the scenarios, and the Season Plan page adds its own `seasonPlans.read` gate. The Setup, Route Plan, Priorities and Burndown pages are thin and sit inside the layout gate, so they need none. Controls that only change local Redux state (reordering, adding and removing group assignments, copying to other employees, the goal inputs in `AssignmentRow` and `GroupGoalPanel`, plain Apply on the goal multiplier) are not gated: the stored data changes only through Save, Save As, Apply & Save and Activate, which are. The scenario Save, Save As, Activate and Apply & Save controls all use `write`. `requires` on `assignmentScenarios.read` lists only what exists today. Its other entries (`groupSequences.read`, `seasonPlans.read`) are this feature's own, written as strings because the constants are not available inside their own declaration (the same as `equipment`).

**Screen capability set:** `pace.assignmentScenarios.read` to open the module, plus its `requires` (`pace.groupSequences.read`, `pace.seasonPlans.read`, `assignmentGroup.assignmentGroups.read`, `holiday.holidays.read`, `employeeAvailability.availabilityConstraints.read`, `assignment.serviceAssignments.read`). Add `pace.assignmentScenarios.write` to save, save as, activate or apply goals, and `.delete` to remove scenarios. Setup groups: `assignmentGroup.assignmentGroups.write` and `.delete`. Sequences: `pace.groupSequences.write` and `.delete`. Season plans: `pace.seasonPlans.write` and `.delete` (also needed to set a group's planned dates). The RealGreen reads, discounts, priority services and planned time off are still needed and are not declarable yet.



### permission

**Contract:** `permission/capabilityBundle/api/CapabilityBundleContract.ts` (route `api/route.ts`), ops `getAll`, `upsert`, `remove`. `permission/userCapabilities/api/UserCapabilitiesContract.ts` (route `api/route.ts`), ops `listUsers`, `getAll`, `getMine`, `assignBundle`, `removeBundle`, `addDirect`, `removeDirect`.

**Capabilities** (`permission/capabilityManagementCapabilities.ts`, feature `capabilityManagement`, already registered):

| Op | Capability |
|---|---|
| `capabilityBundle.getAll` | `capabilityManagement.bundles.read` |
| `capabilityBundle.upsert`, `capabilityBundle.remove` | `'superUser'` |
| `userCapabilities.listUsers`, `getAll` | `capabilityManagement.userCapabilities.read` |
| `userCapabilities.getMine` | `'public'` (verifies the cookie itself through `loadActor`) |
| `assignBundle`, `removeBundle`, `addDirect`, `removeDirect` | `capabilityManagement.userCapabilities.write` |

**Done:** nothing to change. The module was built on capabilities from the start, so no `roles` are left in its routes, components or hooks. Verified: nav entry "Users and Bundles" is on `userCapabilities.read`. The layout gates its two tabs by capability and `'superUser'`, and `usePermissionDeps` takes `loadUsers` and `loadBundles` flags from the layout. Both pages sit in `GatedPanel`. `UserCapabilityEditor` offers its assign, remove and add controls only when `userCapabilities.write` is held and the target is manageable. `CreateUserDialog` and `DeleteUserDialog` are shown by `isSuperUser`.

**Finding for review:** the user editor lists and assigns bundles from the bundle store, which loads only with `bundles.read`. A user holding `userCapabilities.read` and `.write` but not `bundles.read` sees every held bundle as "no longer exists" and an empty bundle picker. `userCapabilities.read` probably should `require` `bundles.read` (a same-feature string, like `pace`). Not changed, since this folder was built before the migration and its declaration has tests.

**Decisions made by default:** nothing was changed here, so no new decisions. `CreateUserDialog` still sets a `role` (this is the "sets a role" case, flagged under `auth`). It stays until roles are removed.

**Screen capability set:** `capabilityManagement.userCapabilities.read` to open Users, plus `.write` to assign or remove. `bundles.read` to see bundle names (see the finding). Bundle editing, user creation and user deletion are superuser only.

### plannedTimeOff

**Contract:** `plannedTimeOff/api/PlannedTimeOffContract.ts` (route `api/route.ts`), ops `getAll`, `upsert`, `deleteOne`. Gates before: all three admin, office.

**Capabilities** (`plannedTimeOff/plannedTimeOffCapabilities.ts`, feature `plannedTimeOff`):

| Op | Capability |
|---|---|
| `getAll` | `plannedTimeOff.absences.read` |
| `upsert` | `plannedTimeOff.absences.write` |
| `deleteOne` | `plannedTimeOff.absences.delete` |

**Done:** declaration registered, with `requires`: `absences.read` needs `holiday.holidays.read` (the calendar draws holidays and weather days). Route on `capability:` (no `roles` left). Nav entry "Time Off Calendar" gated on `absences.read`. The calendar page wraps a new inner `TimeOffCalendarWorkspace` in `GatedPanel`, so the mount loads never fire without `read`. The workspace passes `canLoad` for the holiday read into `useHoliday`. The per-day add button and "Record Unplanned Absence" are disabled by `write`. `PlannedTimeOffSheet` saves only with `write` (through `canSave`) and disables both delete buttons by `delete`. `UnplannedAbsenceSheet` saves only with `write`. `usePlannedTimeOff` gained a `canLoad` flag (default allowed).

**Decisions made by default:** one `absences` resource, because planned time off and unplanned absences are one stored list told apart by `requestType`. They share a verb set, not separate capabilities. `deleteOne` is its own `delete` verb, since it removes a record outright and can then be assigned apart from `write`. The page shows employee names from RealGreen (`useEmployee`), which is not declared, so `requires` lists only the holiday read for now.

**Screen capability set:** `plannedTimeOff.absences.read` plus `holiday.holidays.read` to open the calendar. Add `.write` to add, edit or record an absence and `.delete` to remove one. RealGreen employees are still ungated (deferred).


### prepayLetters

**Contract:** `prepayLetters/config/prepayConfigContract.ts` (route `config/api/route.ts`), ops `getConfigs`, `saveConfig`, `deleteConfig`. `prepayLetters/upsellPriorities/upsellPrioritiesContract.ts` (route `upsellPriorities/api/route.ts`), ops `getUpsellPriorities`, `saveUpsellPriorities`, `deleteUpsellPriorities`. The `renewalLetters`, `pricing` and `template` folders have no routes. Gates before: every op admin, office, tech. `deleteConfig` also let an admin delete another user's config (ownership check skipped for the admin role).

**Capabilities** (`prepayLetters/prepayLettersCapabilities.ts`, feature `prepayLetters`):

| Op | Capability |
|---|---|
| `getConfigs` | `prepayLetters.prepayConfigs.read` |
| `saveConfig` | `prepayLetters.prepayConfigs.write` |
| `deleteConfig` | `prepayLetters.prepayConfigs.delete` |
| `getUpsellPriorities` | `prepayLetters.upsellPriorities.read` |
| `saveUpsellPriorities` | `prepayLetters.upsellPriorities.write` |
| `deleteUpsellPriorities` | `prepayLetters.upsellPriorities.delete` |

**Done:** declaration registered, with `requires`: `prepayConfigs.read` needs `prepayLetters.upsellPriorities.read`, `formTemplate.formTemplates.read` and `globalSettings.settings.read`. All six ops on `capability:` (no `roles` left in the routes). `deleteConfig` no longer calls `assertRole`: its admin override is now a confirmed superuser (`loadVerifiedCaller`, verified from the cookie and the user document). Nav entry "Prepay Letters" gated on `prepayConfigs.read`. `layout.tsx` is a `GatedPanel` on `prepayConfigs.read` around a new inner `PrepayLettersShell`, so `usePrepayLettersDeps` only mounts for a user who holds it. The shell passes `canLoad` flags for the upsell lists, form templates and global settings (`useUpsellPriorities` gained the flag, default allowed; `useFormTemplate` and `useGlobalSettings` already had it). The Upsells page is wrapped in `GatedPanel` on `upsellPriorities.read`. `PrepayConfigFileControls` and `UpsellPrioritiesFileControls` disable Save by `write`, hide Save As without `write` (`EntityFileControls` has no disabled state for it, same as `formTemplate`), and disable the Delete menu item and the confirm button by `delete` (still also requiring ownership). `PrepayConfigPage` replaced `role === "admin"` with the `'superUser'` requirement for opening another user's config for editing. `RenewalSettingsPanel` hides the "Create a Prepay Letter template" link without the form template read and passes the global settings flag into `useRenewalCustomers` (new `canLoadGlobalSettings`, default allowed).

**Decisions made by default:** two resources, `prepayConfigs` and `upsellPriorities`, because they are separate stored lists with separate routes, so they can be assigned apart. Each has the three verbs. No capability for the Renewals tab: it has no stored data and only reads the other two lists plus form templates, so it sits inside the layout gate (which `requires` covers). Ownership stays a server rule apart from the capabilities (the id and `saId` come from the caller), so `write` and `delete` only ever act on the holder's own records, as in `formTemplate`. The old admin override on `deleteConfig` maps to the superuser, since roles are going away and a superuser bypass is the only override the capability model has. `deleteUpsellPriorities` never had an override (owner only), so none was added.

**Finding for review:** the module is not usable by a non-superuser yet. Every tab also loads RealGreen data (programs, price tables, tax codes, discounts, flags, company, and the customers the renewal batches use) that is not declared, so a user holding only the prepay capabilities gets refused loads for those until the `realGreen` folders migrate (the same as `inventory` and `pace`). The tech role could use every prepay op before, and now nobody holds these until they are assigned.

**Screen capability set:** `prepayLetters.prepayConfigs.read` plus its `requires` (`prepayLetters.upsellPriorities.read`, `formTemplate.formTemplates.read`, `globalSettings.settings.read`) to open the module. Add `.write` and `.delete` on `prepayConfigs` and `upsellPriorities` to save, save as and delete. RealGreen reads are still needed and are not declarable yet.


### priceIncrease

**Contract:** `priceIncrease/seasonIncreases/api/SeasonIncreasesContract.ts` (route `api/route.ts`), ops `getAll`, `upsert`, `remove`. `priceIncrease/settings/api/PriceIncreaseSettingsContract.ts` (route `api/route.ts`), ops `getAll`, `upsert`, `setActive`, `remove`. The flag mappings, exempt flags and manual flag have no route of their own: they are saved with `globalSettings.updateSettings`. Gates before: both reads admin, office. Every write and delete admin only.

**Capabilities** (`priceIncrease/priceIncreaseCapabilities.ts`, feature `priceIncrease`):

| Op | Capability |
|---|---|
| `seasonIncreases.getAll` | `priceIncrease.increasePlans.read` |
| `seasonIncreases.upsert` | `priceIncrease.increasePlans.write` |
| `seasonIncreases.remove` | `priceIncrease.increasePlans.delete` |
| `settings.getAll` | `priceIncrease.increaseSettings.read` |
| `settings.upsert`, `settings.setActive` | `priceIncrease.increaseSettings.write` |
| `settings.remove` | `priceIncrease.increaseSettings.delete` |

**Done:** declaration registered, with `requires`: `increaseSettings.read` needs `priceIncrease.increasePlans.read` and `globalSettings.settings.read`. All seven ops on `capability:` (no `roles` left in the routes). `layout.tsx` is a `GatedPanel` on `increaseSettings.read` around a new inner `PriceIncreaseShell`, so `usePriceIncreaseDeps` only mounts for a user who holds it. The shell passes `canLoad` flags for the increase plans and the global settings (`useSeasonIncreases` gained the flag, default allowed, and `usePriceIncreaseCustomers` gained `canLoadGlobalSettings`, default allowed; `useGlobalSettings` already had its flag). `SettingsSection` disables New and Set Active by `increaseSettings.write`, and both Delete buttons by `increaseSettings.delete`. `SettingsSheet` and `ActiveSettingsPanel` disable Save by `increaseSettings.write` and the new plan button by `increasePlans.write`. `InlinePlanEditor` disables Save Plan by `increasePlans.write`. `FlagMappingsSection` disables Save Changes, the exempt flag checkboxes and the manual flag select by `globalSettings.settings.write` (this closes a deferred row from `globalSettings`). The readme's two `roles` lines now name the capabilities. There is no nav entry for the module (it is reached by URL), so `NavMenu.tsx` is unchanged.

**Decisions made by default:** two resources, `increasePlans` and `increaseSettings`, because they are separate stored lists with separate routes. Each has the three verbs. `setActive` stays under `increaseSettings.write` because it only flips which stored settings are active and can be flipped back (same reasoning as activating a pace scenario). The settings read is the entry capability for the whole module, since the active settings drive every tab. The three flag controls use `globalSettings.settings.write`, not a `priceIncrease` capability, because that is what the route they call checks. No `requires` was added from `increaseSettings.write` to it: editing the settings documents and editing the flag mappings are separate saves, and a user can hold either.

**Finding for review:** the module is not usable by a non-superuser yet. Every tab also loads RealGreen data (programs, price tables, the active customers and their customer flags) that is not declared, so a user holding only the price increase capabilities gets refused loads for those until the `realGreen` folders migrate (the same as `inventory`, `pace` and `prepayLetters`). The write-back of flags to customers (`AssignFlagButton`, `AssignAllButton`) goes through `custFlag`, which is a RealGreen route and is not declared either, so those two buttons stay ungated (deferred below). Gates changed in effect: writes were admin only, so no office user could save before, and now nobody holds them until they are assigned.

**Screen capability set:** `priceIncrease.increaseSettings.read` plus its `requires` (`priceIncrease.increasePlans.read`, `globalSettings.settings.read`) to open the module. Add `increaseSettings.write` and `.delete` to manage settings, `increasePlans.write` and `.delete` to manage plans, and `globalSettings.settings.write` to change the flag mappings, exempt flags and manual flag. The RealGreen reads and the customer flag write are still needed and are not declarable yet.


### priorityService

**Contract:** `priorityService/api/PriorityServiceContract.ts` (route `api/route.ts`), ops `getAll`, `upsert`, `deleteOne`. Gates before: all three admin, office.

**Capabilities** (`priorityService/priorityServiceCapabilities.ts`, feature `priorityService`):

| Op | Capability |
|---|---|
| `getAll` | `priorityService.priorityServices.read` |
| `upsert` | `priorityService.priorityServices.write` |
| `deleteOne` | `priorityService.priorityServices.delete` |

**Done:** declaration registered, with `requires`: `priorityServices.read` needs `globalSettings.settings.read` (the form builds its customer lookup from the current season). Route on `capability:` (no `roles` left). Nav entry "Priority Scheduling" gated on `priorityServices.read`. `page.tsx` wraps a new inner `PriorityServiceWorkspace` in `GatedPanel`, so the mount loads never fire without `read`. The workspace and `PriorityServiceForm` pass `canLoad` for the global settings read into `useGlobalSettings`. "New Entry" is disabled by `write`. `PriorityServiceForm` saves only with `write` (through `canSave`) and disables both delete buttons by `delete`. `usePriorityService` gained a `canLoad` flag (default allowed) that guards the mount load. The folder has no role checks in components.

**Decisions made by default:** one `priorityServices` collection with the three verbs. `deleteOne` is its own `delete` verb, because it removes the flag outright and can then be assigned apart from `write`. The page also loads RealGreen programs, customers and services (`useProgServ`, `useCustomerContext`, `usePriorityServiceCustomers`, `useSingleCustomer`), which are not declared, so `requires` lists only the global settings read for now.

**Finding for review:** the screen is not usable by a non-superuser yet, for the same reason as `pace`, `prepayLetters` and `priceIncrease`: the RealGreen reads it depends on do not exist as capabilities yet. Also, the pace Priorities tab reads these flags (see the deferred table), so a pace user without `priorityServices.read` sees no manual priority flags.

**Screen capability set:** `priorityService.priorityServices.read` plus `globalSettings.settings.read` to open the page. Add `.write` to add or edit a flag and `.delete` to remove one. The RealGreen reads are still needed and are not declarable yet.


### productivity (nothing to declare)

**No routes, no contracts, no declaration.** The folder holds the By Employee, By Date and Reliability tabs under one layout (`useProductivity`, `productivitySlice`, `productivitySelect`, `reliabilitySelect`). It is a read-and-report module: every number is computed client-side from other features' data. Nothing outside the folder uses its hook, slice or selectors. The `PunchImportWidget` in its header belongs to `timeCard`.

**Done:** `useProductivity` gained a `canLoad` flag (default allowed) for the three loads whose routes are migrated: `holidays` (`holiday.holidays.read`), `absences` (`plannedTimeOff.absences.read`) and `assignments` (`assignment.serviceAssignments.read`, which guards the direct `getBySchedDateRange` dispatch). `ProductivityLayout` builds the flags with `allows(...)` and passes them in. `reliabilityColumns.tsx` `SuspiciousDayEntry` disables "Record Absence" and Save by `plannedTimeOff.absences.write` (it dispatched the upsert with no control before). The folder has no role checks in components.

**Decisions made by default:** nothing to declare. A capability here would gate no data and grant nothing, the same as `bizPlan`. The screen's access is the reads of the features it shows, and there is no `requires` to write because there is no declaration to hang it on. No `GatedPanel` on the layout for the same reason: there is no single capability that means "may open this screen". A user who lacks one of the three reads above sees that data empty without a refused request or toast, so completion percentages treat every day as a working day (no holiday read) and every employee as present (no absence read). The `Productivity` nav entry in `NavMenu.tsx` stays on `roles: ["admin", "office"]` until the RealGreen reads it depends on are declared (deferred).

**Finding for review:** the screens are not usable by a non-superuser yet. `useProductivity` also loads RealGreen active customers, programs and services, and punches (`timeCard` route, still on `roles`), and the Reliability tab loads call-aheads. None of those are declared or gated, so a user holding only the three reads above gets refused loads for them until the `realGreen` and `timeCard` folders migrate (the same situation as `pace` and `inventory`).

**Screen capability set:** `holiday.holidays.read`, `plannedTimeOff.absences.read` and `assignment.serviceAssignments.read`, plus `plannedTimeOff.absences.write` to record an absence from the Reliability tab. The RealGreen and time card reads are still needed and are not declarable yet.



### qbo/connection

**Contract:** `qbo/connection/api/QboConnectionContract.ts` (route `api/route.ts`, `createQboRpcHandler`), ops `status`, `startConnect`, `disconnect`, `testConnection`. Gates before: all four admin only. Not an RPC and given no capability: `api/callback/route.ts` (see Finding for review).

**Irreversible op (review first):** `disconnect` revokes the app's access at Intuit and deletes the stored tokens. Every QuickBooks screen stops until someone with a QuickBooks admin login connects again, and this app cannot undo it. It has its own capability, `qboConnection.connectionRevocation.write`, never shared with a read, and it is not part of any read-only bundle. `startConnect` is `connection.write`: it only begins the OAuth round trip, but the callback then replaces the stored connection, so it decides which company every QuickBooks screen talks to. Assign both deliberately.

**Capabilities** (`qbo/connection/qboConnectionCapabilities.ts`, feature `qboConnection`, two singleton resources):

| Op | Capability |
|---|---|
| `status`, `testConnection` | `qboConnection.connection.read` |
| `startConnect` | `qboConnection.connection.write` |
| `disconnect` | `qboConnection.connectionRevocation.write` |

**Done:** declaration registered, with `requires`: `connectionRevocation.write` needs `qboConnection.connection.read` (written as a string, since the constants are not available inside their own declaration, the same as `pace`). All four ops on `capability:` (no `roles` left in the route). `QboConnectionPanel` is now a `GatedPanel` on `connection.read` around an inner `QboConnectionWorkspace`, so `useQboConnection` (which forces the status load on mount) only mounts for a user who holds the read. The role check (`role !== "admin"`, the "Admins only" alert) is gone. The workspace passes `canConnect` (`connection.write`) and `canDisconnect` (`connectionRevocation.write`) into `QboConnectionCard`, which disables Connect/Reconnect and the Disconnect trigger by them (Test connection is a read, so it stays open). Nav entry "Connection" gated on `connection.read`. The permission tests pass (246), including the registry drift test.

**Finding for review:** `_lib/qboCallbackServer.ts` checked `user.role !== "admin"` on the user named by the one-time `state`. The callback has no cookie, so it cannot use the RPC gate. It now calls `evaluateCapability` (with `capabilityLoaders`, the same decision an RPC op makes) for that user and requires `connection.write`. A superuser is confirmed against the user document, not the token. A user who lost the capability after starting the round trip gets the existing `invalid_state` result. The callback route itself is unchanged and still authenticates through the `state`. The only other file under `qbo/connection` that is not part of this screen, `_lib/qboConnectionServer.ts`, is called only from the route above.

**Decisions made by default:** a separate `qboConnection` feature, not more verbs on `quickbooks` (the stored token record is its own data, and the reference data capabilities are read-only lists). A singleton `connection`, since there is one connection. No `source: "qbo"` on it: the record is our own stored tokens, not QuickBooks data (`testConnection` makes a live read, but it only reads and stays under `read`). `startConnect` sits under `write`, not its own capability: it can be repeated, and the callback only replaces the connection with one the same user authorized at Intuit. No `canLoad` flag on `useQboConnection`: its only caller is the panel, which now sits inside the gate.

**Screen capability set:** `qboConnection.connection.read` to open the page and run Test connection, plus `qboConnection.connection.write` to Connect or Reconnect, and `qboConnection.connectionRevocation.write` to Disconnect. A user holding none of them sees "You do not have access". Every user who was an admin holds nothing until assigned, since the role-to-bundle migration does not exist yet.


### qbo/importCCTxn (with `rows`, `decisions`, `post`)

**Contract:** four routes, all `createQboRpcHandler`. `importCCTxn/api/ImportCCTxnMappingContract.ts` (12 ops: `getFormatAccounts`, `upsertFormatAccount`, `getAssignableUsers`, `getCardAssignments`, `upsertCardAssignment`, `getMerchantMappings`, `upsertMerchantMapping`, `confirmMerchant`, `deleteMerchantMapping`, `getSkipRules`, `upsertSkipRule`, `deleteSkipRule`), `rows/api/ImportRowContract.ts` (`previewImport`, `commitImport`, `getOpenRows`, `setRowSkip`, `setRowAccount`), `decisions/api/ImportDecisionContract.ts` (`saveDecisions`) and `post/api/ImportPostContract.ts` (`previewPost`, `previewBatch`, `postRows`, `reconcileRow`). Gates before: every op admin and office, except `upsertFormatAccount` and all four `post` ops, which were admin only.

**Irreversible op (review first):** `postRows` creates real credit card expenses in the live QuickBooks books, and this app cannot undo or edit them. It has its own capability, `importCCTxn.expensePostings.qbo.write`, never shared with a read, and it is not part of any read-only bundle. `reconcileRow` shares it: it never posts, but it settles a row left unknown (found in QuickBooks, or returned to pending so `postRows` can retry it), so it sits with the poster. The two previews are a separate `expensePostings.qbo.read` (they ask QuickBooks what a post would do and send nothing). `upsertFormatAccount` (was admin only) is its own resource, `formatAccounts.write`, because it decides which QuickBooks card account every import posts to. Assign all three deliberately.

**Capabilities** (`qbo/importCCTxn/importCCTxnCapabilities.ts`, feature `importCCTxn`):

| Op | Capability |
|---|---|
| `getOpenRows` | `importCCTxn.importRows.read` |
| `previewImport`, `commitImport`, `setRowSkip`, `setRowAccount` | `importCCTxn.importRows.write` |
| `getFormatAccounts` | `importCCTxn.formatAccounts.read` |
| `upsertFormatAccount` | `importCCTxn.formatAccounts.write` |
| `getCardAssignments`, `getAssignableUsers` | `importCCTxn.cardAssignments.read` |
| `upsertCardAssignment` | `importCCTxn.cardAssignments.write` |
| `getMerchantMappings` | `importCCTxn.merchantMappings.read` |
| `upsertMerchantMapping`, `confirmMerchant` | `importCCTxn.merchantMappings.write` |
| `deleteMerchantMapping` | `importCCTxn.merchantMappings.delete` |
| `getSkipRules` | `importCCTxn.skipRules.read` |
| `upsertSkipRule` | `importCCTxn.skipRules.write` |
| `deleteSkipRule` | `importCCTxn.skipRules.delete` |
| `saveDecisions` | `importCCTxn.mapDecisions.write` |
| `previewPost`, `previewBatch` | `importCCTxn.expensePostings.qbo.read` |
| `postRows`, `reconcileRow` | `importCCTxn.expensePostings.qbo.write` |

**Done:** declaration registered, with `requires` (see the screen's capability set). All 22 ops on `capability:` (no `roles` left in the four routes). `layout.tsx` is now a `GatedPanel` on `importRows.read` around a new inner `ImportCCTxnShell`, so `useImportCCTxnDeps` only mounts for a user who holds it. The shell passes `canLoad` flags into `useImportCCTxnDeps` for the four QuickBooks reference lists (already there) and the new ones: the four mapping lists (`useImportCCTxnMapping` gained a `canLoad` object, default allowed, and the assignable users follow the card assignment read) and the open rows (`useImportRow` gained `canLoad`, default allowed). `PostPanel` is a `GatedPanel` on `expensePostings.read` around a new inner `PostWorkspace` (the role check and "Admins only" alert are gone), and `SettingsPanel` is a `GatedPanel` on `formatAccounts.read`. Nav entry "Import Credit Cards" gated on `importRows.read`. The permission and qbo tests pass (821), including the registry drift test.

**Controls gated:** `ImportPanel` replaces the dropzone with a notice and disables Import without `importRows.write` (the dropzone has no disabled state, and a dropped file asks the server to preview it). `CardAssignmentRow` Save by `cardAssignments.write`. `MapSaveBar` Save by `mapDecisions.write`. `ConfirmMerchantCheckbox` by `merchantMappings.write`. `RowAccountPicker` shows plain text instead of the picker without `importRows.write`. `PostRowLine` disables Skip by `importRows.write` and "Look in QuickBooks" by `expensePostings.write`. `SkippedRowsSection` Restore by `importRows.write`. `SkippedMerchantsCard` Remove by `skipRules.delete`. `FormatAccountEditor` disables the checkboxes, the default radios and Save by `formatAccounts.write`. `PostConfirmDialog` and `BatchConfirmDialog` disable their Post button by `expensePostings.write`. `MapRowVendorPicker` shows the "New vendor" button by `quickbooks.vendors.qbo.write` instead of `role === "admin"` (this closes a deferred row from `qbo/account`).

**Finding for review:** `useImportPost.postRows` and `reconcileRow` reload the open rows and the merchant mappings after a post. Those two reloads dispatch with no `canLoad`, so a user who holds `expensePostings.write` but not `merchantMappings.read` gets one refused reload and a toast after each post (deferred below). `getImportingUserName` (used by `commitImport`, `postRows` and `reconcileRow`) reads the `x-user-id` header the proxy injects, as before, and has no role check of its own.



**Decisions made by default:** a separate `importCCTxn` feature with one resource per stored list, named for the data (`importRows`, `formatAccounts`, `cardAssignments`, `merchantMappings`, `skipRules`), and one verb per op that exists. `previewImport` sits under `importRows.write`: it writes nothing but is only the first step of an import, so a read-only holder cannot start one. `confirmMerchant` is under `merchantMappings.write` (it only adds a description next to the vendor and never changes the vendor or accounts). `saveDecisions` is its own `mapDecisions.write` singleton, because one request saves mappings, row accounts, row skips and skip rules, and borrowing `merchantMappings.write` would let someone skip rows or add skip rules through it. `getAssignableUsers` follows `cardAssignments.read` (staff names for the picker). `expensePostings` is a singleton with `source: "qbo"` (the data lives in the books). `reconcileRow` is under `write`, not a separate verb: it shares the poster's trust and the same QuickBooks lookups. `setRowAccount` is `importRows.write`, not the posting capability: choosing an account is a mapping decision, as the old route comment said. The text "Only an admin can change it" on the Settings tab now says changing it needs its own permission.

**Screen capability set:** `importCCTxn.importRows.read` to open the module, plus its `requires` (`formatAccounts.read`, `cardAssignments.read`, `merchantMappings.read`, `skipRules.read`, and the `quickbooks` accounts, vendors, customers and employees reads). Add `importRows.write` to import a file, skip, restore and choose a row's account, `cardAssignments.write` to assign a card, `mapDecisions.write` to Save on the Map tab (also `merchantMappings.read` and `skipRules.read`), `merchantMappings.write` to confirm a merchant, `skipRules.delete` to remove a skip rule, `formatAccounts.write` to change the card accounts, `quickbooks.vendors.qbo.write` for "New vendor", `expensePostings.qbo.read` to open the Post tab, and `expensePostings.qbo.write` to post or look in QuickBooks. `merchantMappings.delete` and `skipRules.write` have no screen control today (only `saveDecisions` and the Map tab write skip rules).


### qbo/journalEntry

**Contract:** `qbo/journalEntry/api/QboJournalEntryContract.ts` (route `api/route.ts`, `createQboRpcHandler`), ops `postMany`, `reconcile`, `getByDateRange`. Gates before: all three admin only.

**Irreversible op (review first):** `postMany` creates real journal entries in the live QuickBooks books, and this app cannot undo or edit them. It has its own capability, `qboJournalEntry.journalEntryPostings.qbo.write`, never shared with a read, and it is not part of any read-only bundle. `reconcile` shares it: it never posts, but it settles entries left unknown or unverified (found in QuickBooks, or returned so they can be retried), so it sits with the poster. Assign it deliberately.

**Capabilities** (`qbo/journalEntry/qboJournalEntryCapabilities.ts`, feature `qboJournalEntry`):

| Op | Capability |
|---|---|
| `postMany`, `reconcile` | `qboJournalEntry.journalEntryPostings.qbo.write` |
| `getByDateRange` | `qboJournalEntry.postingHistory.read` |

**Done:** declaration registered. Route on `capability:` (no `roles` left). The permission tests pass (246), including the registry drift test.

**Finding for review:** nothing calls this route. `useQboJournalEntry`, `qboJournalEntrySlice` and `qboJournalEntrySelect` are imported by nothing outside the folder except the store's `combineReducers`, and the folder has no page, panel or nav entry. It looks like dead code, left from before Javelin took over posting journal entries (Javelin imports only this folder's types, pure helpers and server functions, through its own `javelin` route). It is gated anyway, with no UI to gate. `javelin.journalEntryPostings.qbo.write` is a different capability on a different route, so holding one grants nothing on the other (see the comment in the declaration).

**Decisions made by default:** a separate `qboJournalEntry` feature, not verbs on `javelin` (the routes are different and can be assigned apart). `journalEntryPostings` is a singleton with `source: "qbo"` (the data lives in the books) and `postingHistory` a collection (our own stored postings, no call to QuickBooks). `reconcile` is under `write`, not a separate verb: it shares the poster's trust, the same as `importCCTxn`. No `requires`: nothing loads another feature's data. No `canLoad` flag on `useQboJournalEntry`: it has no `autoLoad` and no caller.

**Screen capability set:** none. There is no screen. If one is added, it needs `postingHistory.read` to list and `journalEntryPostings.qbo.write` to post or reconcile.


### qbo/purchase

**Contract:** `qbo/purchase/api/QboPurchaseContract.ts` (route `api/route.ts`, `createQboRpcHandler`), op `getByDateRange`. Gate before: admin, office.

**Capabilities** (`qbo/purchase/qboPurchaseCapabilities.ts`, feature `qboPurchase`):

| Op | Capability |
|---|---|
| `getByDateRange` | `qboPurchase.purchases.qbo.read` |

**Done:** declaration registered. Route on `capability:` (no `roles` left). The permission and qbo tests pass (821), including the registry drift test.

**Finding for review:** nothing calls this route. `useQboPurchase`, `qboPurchaseSlice` and `qboPurchaseSelect` are imported by nothing outside the folder except the store's `combineReducers`, and the folder has no page, panel or nav entry. It looks like dead code, the same as `qbo/journalEntry`. The `importCCTxn` server code imports this folder's types and `buildDocNumberWhere`, and reads QuickBooks purchases itself on the server, so it does not need this capability. It is gated anyway, with no UI to gate.

**Decisions made by default:** a separate `qboPurchase` feature with one read-only collection, `purchases`, with `source: "qbo"` (the data lives in the books). Read only: the contract has no write, and the writes that create purchases are `importCCTxn.expensePostings.qbo.write`. No `requires`, and no `canLoad` flag on `useQboPurchase`: it has no caller.

**Screen capability set:** none. There is no screen. If one is added, it needs `qboPurchase.purchases.qbo.read`.

### qbo (summary)

All 11 RPC routes and 35 ops under `qbo` are now on `capability:`. Not an RPC and given no capability: `connection/api/callback/route.ts`, a GET that Intuit redirects the browser to. It has no login by design and authenticates through a one-time `state`, and it now checks `connection.write` for the user the state names (see `qbo/connection`). Outside `qbo`, only `account`, `javelin` and `auth/_lib/deleteUserReferences.ts` import from it.

### quickSend

**Contract:** `quickSend/storedTemplates/storedTemplatesContract.ts` (route `storedTemplates/api/route.ts`), ops `getTemplates`, `getGroups`, `saveTemplate`, `deleteTemplate`, `createGroup`, `renameGroup`, `deleteGroup`, `moveTemplate`. Gates before: `renameGroup` and `deleteGroup` admin only. The other six admin, office, tech. (The nav entry was admin, office.) The rest of the folder (slice, selectors, mentions, program pricing) is client state with no routes.

**Capabilities** (`quickSend/quickSendCapabilities.ts`, feature `quickSend`):

| Op | Capability |
|---|---|
| `getTemplates` | `quickSend.storedTemplates.read` |
| `saveTemplate`, `moveTemplate` | `quickSend.storedTemplates.write` |
| `deleteTemplate` | `quickSend.storedTemplates.delete` |
| `getGroups` | `quickSend.templateGroups.read` |
| `createGroup`, `renameGroup` | `quickSend.templateGroups.write` |
| `deleteGroup` | `quickSend.templateGroups.delete` |

**Done:** declaration registered. Route on `capability:` (no `roles` left, and no `assertRole`). Nav entry "QuickSend" gated on `storedTemplates.read`. `QuickSend` now wraps a new inner `QuickSendWorkspace` in `GatedPanel`, so the mount loads never fire without `read`. `useStoredTemplates` takes a `canLoad` flag (`templates`, `groups`, default allowed) that guards the mount loads, and the workspace sets them from `allows(...)`. `useGlobalSettings` is passed `canLoad` from `globalSettings.settings.read` (closes this folder's part of the `globalSettings` callers row). `QuickSendMenubar` no longer reads `authSelect.role`: Save and Save As are disabled by `storedTemplates.write`, Move to Group needs `write` plus ownership, Delete is disabled by `storedTemplates.delete` plus ownership, Create Group is disabled by `templateGroups.write`, and the Rename Group and Delete Group submenus show by `templateGroups.write` and `.delete`.

**Decisions made by default:**

- Ownership stays a server rule apart from the capabilities, as in `formTemplate` and `prepayLetters`. `saveTemplate` derives the id and `saId` from the caller, and `deleteTemplate` and `moveTemplate` refuse a template the caller does not own.
- The admin override of ownership became the confirmed superuser. The route's `isCurrentUserAdmin` (`assertRole(["admin"])`) is now `isCurrentUserSuperUser` (`loadVerifiedCaller`). The menubar reads `allows("superUser")` for the same rule. A user who was an admin loses the right to delete or move other people's templates until they are made a superuser.
- Templates and groups are two resources, not one, because `getGroups` and the group ops are a separate thing a user may hold apart (groups were admin only to rename and delete, and open to three roles to create). `moveTemplate` is a template `write`, since it changes the template's `groupId`.
- `renameGroup` was admin only and `createGroup` was admin, office, tech. Both are now `templateGroups.write`, so they cannot be told apart by capability. Review whether renaming should be its own verb. It stays `write` for now because the verb set is read, write, delete.
- `deleteGroup` is `templateGroups.delete` (it refuses a group that still has templates, so it removes no template data).
- `storedTemplates.read` `requires` `templateGroups.read` (the Open menu files templates under groups) and `globalSettings.settings.read` (the preview resolves against the current season). No test checks `requires` against the hook flags.
- The RealGreen loads on the page (`useCustomerContext`, `useProgServ`, `usePriceTable`, `usePrepay`, `useZipCode`) are not gated, because those features are not declared (deferred).
- The menubar's two edit controls were shown to everyone before and refused by the server. They are now disabled or hidden by capability, so a user without `write` sees a disabled Save.

**Screen capability set:** `quickSend.storedTemplates.read` plus its `requires` (`quickSend.templateGroups.read`, `globalSettings.settings.read`). Add `storedTemplates.write` to save and move, `.delete` to remove, and `templateGroups.write` and `.delete` to manage groups. The page is not usable by a non-superuser until the `realGreen` customer, program and service, price table, prepay and zip code reads exist.


### realGreen/rgAccount

**Contract:** `realGreen/rgAccount/api/RgAccountContract.ts` (route `api/route.ts`, `createRealGreenRpcHandler`), op `getAll`. Gate before: admin, office.

**Capabilities** (`realGreen/rgAccount/rgAccountCapabilities.ts`, feature `rgAccount`):

| Op | Capability |
|---|---|
| `getAll` | `rgAccount.rgAccounts.realGreen.read` |

**Done:** declaration registered. Route on `capability:` (no `roles` left). `useRgAccount` takes a `canLoad` flag (default allowed) that guards the mount load and `refresh`. The folder has no components. Its only caller is `account` (`useAccount` and `accountSelect`), which now passes the flag, and `account.accountMappings.read` now `requires` this read. That closes the first row of the deferred table.

**Decisions made by default:** a separate `rgAccount` feature with one read-only collection, `rgAccounts`, with `source: "realGreen"` (the accounts live in RealGreen and nothing is stored here). Read only: the contract has no write. The feature key is `rgAccount` (the folder's name, as `account` and `appMethod` do), not `realGreen`, so the other `realGreen` sub-folders can each own a feature.

**Screen capability set:** none of its own. The account mapping screen needs `rgAccount.rgAccounts.realGreen.read` (now part of that screen's set, see `account`).

### realGreen/callAhead

**Contract:** `realGreen/callAhead/api/CallAheadContract.ts` (route `api/route.ts`, `createRealGreenRpcHandler`), ops `getAll`, `upsertDocProps`, `getKeywords`, `upsertKeyword`, `deleteKeyword`. Gates before: all five admin, office.

**Capabilities** (`realGreen/callAhead/callAheadCapabilities.ts`, feature `callAhead`):

| Op | Capability |
|---|---|
| `getAll` | `callAhead.callAheads.realGreen.read` |
| `upsertDocProps` | `callAhead.callAheadDocProps.write` |
| `getKeywords` | `callAhead.keywords.read` |
| `upsertKeyword` | `callAhead.keywords.write` |
| `deleteKeyword` | `callAhead.keywords.delete` |

**Done:** declaration registered. Route on `capability:` (no `roles` left). `useCallAhead` takes a `canLoad` flag (`callAheads`, `keywords`, default allowed) that guards the mount loads and `refresh`. `CallAheadConfig` (the modal) sets the flags from `allows(...)` and shows an inline note on the Config tab when the list read is missing and on the Keyword Messages tab when the keyword read is missing. `DocPropsConfig` disables Save by `callAheadDocProps.write`, `KeywordCreate` and `KeywordEdit` disable Create and Save by `keywords.write`, and `KeywordEdit` disables Delete by `keywords.delete`. The folder has no role checks in components.

**Decisions made by default:**

- `deleteKeyword` stays its own `delete` verb. Call-aheads may still point at the keyword, and they then show no message.
- `getAll` returns the RealGreen call-ahead list merged with the stored doc props, so `callAheads` is a `realGreen` collection with a read only. `callAheadDocProps` is this app's own data but has no read of its own, because it is never loaded apart from `getAll`. Its `write` lists `callAheads.realGreen.read` and `keywords.read` in `requires` (you cannot change a call-ahead's settings without seeing the list and the keywords to pick from).
- `upsertDocProps` and `upsertKeyword` are both `write` (an upsert is a create or an update).
- No `requires` on `keywords.write`: the keyword read is implied.
- The inline note shows by tab, not `GatedPanel`, because the modal's three tabs depend on different reads, and the Service Codes tab depends on the `realGreen/progServ` route (deferred).

**Finding for review:** the Service Codes tab (`ServCodeCallAheadTab`, `ServCodeCallAheadRow`) saves a service code's `callAheadTag` through `useProgServ().saveServCodeChanges`, which calls the `realGreen/progServ` route, not this one. That op is not declared yet, so the tab's Save is not gated and `requires` does not list it (deferred). `DocPropsConfig` also keeps its `MultiSelect` pickers and ETA toggle enabled for a user without `write` (the deprecated `MultiSelect` has no disabled prop). Only the Save button is disabled, so such a user can change the local selection but never save it.

**Screen capability set:** `callAhead.callAheads.realGreen.read` and `callAhead.keywords.read` for the config modal (opened from the prenotify page footer). Add `callAheadDocProps.write` to change a call-ahead's settings, `keywords.write` to create and edit messages, and `keywords.delete` to remove them. The Service Codes tab also needs the `realGreen/progServ` read and write, which are not declared yet.

### realGreen/callLog

**Contract:** `realGreen/callLog/api/CallLogContract.ts` (route `api/route.ts`, `createRealGreenRpcHandler`), op `getCallLogsForCustomer`. Gate before: admin, office. `realGreen/callLog/sync/CallLogSyncContract.ts` (route `sync/api/route.ts`), op `syncCallLogs`. Gate before: admin only.

**Irreversible op (review first):** `syncCallLogs` has its own capability, `callLog.callLogSync.write`, a singleton resource apart from the call log read. A forced run reloads every call log from RealGreen and replaces each record's notes in the mirror, takes no sync lock (so it can overlap the cron job) and spends RealGreen API calls. It was admin only. Assign it deliberately and never fold it into a read-only bundle. The supported way to sync is the Sync Utilities page, which is a separate folder.

**Capabilities** (`realGreen/callLog/callLogCapabilities.ts`, feature `callLog`):

| Op | Capability |
|---|---|
| `getCallLogsForCustomer` | `callLog.callLogs.realGreen.read` |
| `syncCallLogs` | `callLog.callLogSync.write` |

**Done:** declaration registered. Both routes on `capability:` (no `roles` left). `useCallLog` takes a `canLoad` flag (default allowed) that guards the mount load and `refreshForCustomer`. The folder has no role checks and no screen of its own: `page.tsx` is a static placeholder that loads nothing (it is not in the nav and has no data to gate), and `layout.tsx` is a bare `PageLayout`.

**Finding for review:** the call logs the app actually shows come from the MongoDB mirror, through the customer module (`callLogSelect.callLogsByCustId` in `centralSelectors`, filled by the sync), not from `getCallLogsForCustomer`. The live route's only caller is `useCallLog`, and that is used by nothing outside the sandbox (`sandbox/callLog/page.tsx`). Gating the customer's call logs belongs to the `realGreen/customer` folder, and `callLog.callLogs.realGreen.read` does not cover it. The `/syncUtils` page and the `mirrorSync` cron sync call logs through other routes (see the `syncUtils` and `vercelCron` folders), not through `syncCallLogs`. The legacy `sandbox/syncTest` page is the only caller of `syncCallLogs`.

**Decisions made by default:**

- Two resources, because the two ops are unrelated and a read-only user must not pick up the sync. `callLogs` is a `realGreen` collection with a read only (live fetch, nothing stored). `callLogSync` is a singleton (it has no data of its own) with a `write` only.
- No `requires`: the live fetch needs nothing beyond itself. The sandbox page also loads a customer through `useSingleCustomer`, which belongs to the `realGreen/customer` folder (deferred).
- The sandbox page keeps calling `useCallLog` with no `canLoad`. It belongs to the `sandbox` folder and is not edited here (see the deferred table).

**Screen capability set:** none of its own (no screen). The sandbox page needs `callLog.callLogs.realGreen.read`, plus the customer reads that are not declared yet.
### realGreen/company

**Contract:** `realGreen/company/api/CompanyContract.ts` (route `api/route.ts`, `createRealGreenRpcHandler`), op `getAll`. Gate before: admin, office.

**Capabilities** (`realGreen/company/companyCapabilities.ts`, feature `company`):

| Op | Capability |
|---|---|
| `getAll` | `company.companies.realGreen.read` |

**Done:** declaration registered. Route on `capability:` (no `roles` left). `list/page.tsx` now wraps a new inner `CompanyList` in `GatedPanel`, so the mount load never fires without `read`. `useCompany` takes a `canLoad` flag (default allowed) that guards the mount load and `refresh`. The folder has no write controls and no role checks in components. The page is not in the nav (no entry names it), so no nav gate was added.

**Finding for review (not about permissions, not changed):** the company list page's outermost element is `Container variant="centered"` (`min-h-screen`, no scroll context). The root layout clips overflow, so a long company list may be cut off. The page-scroll convention in `AGENTS.md` wants `h-full overflow-y-auto` on the outermost element.

**Decisions made by default:** a separate `company` feature with one read-only collection, `companies`, with `source: "realGreen"` (the companies live in RealGreen and nothing is stored here). Read only: the contract has no write. `GatedPanel` (whole screen) because the page shows nothing but the company read. The only outside caller is `prepayLetters` (`usePrepayLettersDeps`, and `companySelect.company` in `renewalLettersSelect`), which fills the letter's return address. It is not edited here (see the deferred table).

**Screen capability set:** `company.companies.realGreen.read` for the company list page.



### realGreen/conditionCode

**Contract:** `realGreen/conditionCode/api/ConditionContract.ts` (route `api/route.ts`, `createRealGreenRpcHandler`), op `getAll`. Gate before: admin, office.

**Capabilities** (`realGreen/conditionCode/conditionCodeCapabilities.ts`, feature `conditionCode`):

| Op | Capability |
|---|---|
| `getAll` | `conditionCode.conditionCodes.realGreen.read` |

**Done:** declaration registered. Route on `capability:` (no `roles` left). `useCondition` takes a `canLoad` flag (default allowed) that guards the mount load and `refresh`. The folder has no components and no role checks.

**Decisions made by default:** a separate `conditionCode` feature with one read-only collection, `conditionCodes`, `source: "realGreen"`. Read only: the contract has no write. No `GatedPanel` and no write gating, because there is no screen. The only outside caller is `useCoverSheetDeps` (and `serviceConditionSelect`, which hydrates from `conditionSelect.conditionDocMap`). It is not edited here (see the deferred table).

**Screen capability set:** none of its own. The cover sheet screens need `conditionCode.conditionCodes.realGreen.read` to show a service's condition text, and without it the condition descriptions are missing.

### realGreen/custFlag (with `add`)

**Contracts and ops:** `custFlag/api/CustFlagContract.ts` (`loadFlagIdCustIds`, `refreshCustFlags`, route `api/route.ts`) and `custFlag/add/CustFlagAddContract.ts` (`addCustFlag`, route `add/api/route.ts`). Both use `createRealGreenRpcHandler`. Gates before: the two reads admin, office, tech. `addCustFlag` admin, office.

**Irreversible op (review first):** `addCustFlag` puts a flag on real customers in RealGreen, and this app has no op to take a flag back off. The price increase "Assign All" button assigns flags in bulk. It has its own singleton capability, `flagAssignments.realGreen.write`, which nothing else shares. It was office and admin before, so assign it deliberately and never inside a read-only bundle.

**Capabilities** (`realGreen/custFlag/custFlagCapabilities.ts`, feature `custFlag`, two resources):

| Op | Capability |
|---|---|
| `loadFlagIdCustIds`, `refreshCustFlags` | `custFlag.customerFlags.realGreen.read` |
| `addCustFlag` | `custFlag.flagAssignments.realGreen.write` |

**Done:** declaration registered. All three ops on `capability:` (no `roles` left in the two routes). `useCustFlag` takes a `canLoad` flag (default allowed) that guards the mount load, `reloadFlagIds` and `reloadFlagId`. It does not guard `addFlag` and `addFlags`, because the controls that call them are disabled by the write. `useSelectedCustFlags` takes a `canLoad` flag (default allowed) too. `custFlagListeners` (the refresh after every customer refresh) cannot take a flag from a component, so it reads `userCapabilitiesSelect.allows(state)` and returns without the read. `AssignFlagButton` and `AssignAllButton` (`priceIncrease/results`) disable themselves without `flagAssignments.write`, with a "You do not have access to assign flags" tooltip or note, and pass `canLoad` (the customer flags read) into `useCustFlag`. This closes the `AssignFlagButton` deferred row from `priceIncrease`.

**Finding for review:** `useRenewalFlagIds` (the nav bar, `useNavBarDeps`) dispatches `custFlagActions.loadFlagIdCustIds` directly in its second effect, with no flag. Its `canLoad` guards only the settings load. A user without `customerFlags.read` gets a refused request on every page, not only the price increase screens (deferred below). The listener's read check means a user with no capabilities loaded yet skips the first reconcile after a customer refresh. The next refresh does it.

**Decisions made by default:** two resources, because loading flags and assigning them are separate concerns. `customerFlags` is a collection and `flagAssignments` is a singleton (there is nothing to list, only an act). `refreshCustFlags` sits under the read: it only reads RealGreen. The flag definitions (`realGreen/flag`) are a different folder and a different read. No `requires`: the screens that filter by flag also need `flag` reads, which are not declared (deferred below). The `sandbox/flagAddTest` page calls `custFlagActions.addCustFlag` with no gate (deferred below).

**Screen capability set:** none of its own. The price increase By Customer view needs `custFlag.customerFlags.realGreen.read` to load flags and `custFlag.flagAssignments.realGreen.write` to press "Assign All" or the per-customer flag button. Every screen that filters by flag needs the read.


### realGreen/customer (with `mirror`, `sync`, `corruptedRecords`)

**Contracts and ops:** `customer/api/CustomerContract.ts` (`refreshCustomer`, `runSearchScheme`, route `api/route.ts`), `customer/mirror/CustomerMirrorContract.ts` (`getMirrorCustomers`, `mirror/api/route.ts`), `customer/sync/CustomerSyncContract.ts`, `ProgramSyncContract.ts` and `ServiceSyncContract.ts` (`syncCustomers`, `syncPrograms`, `syncServices`, routes `sync/api`, `sync/programSync/api`, `sync/serviceSync/api`) and `customer/sync/corruptedRecords/CorruptedSyncRecordContract.ts` (`getCorruptedSyncRecords`, `corruptedRecords/api/route.ts`). Gates before: `refreshCustomer`, `runSearchScheme` and `getMirrorCustomers` admin, office, tech. The three syncs and `getCorruptedSyncRecords` admin only.

**Irreversible op (review first):** the three legacy sync ops share one singleton capability, `customerSync.write`, which nothing else uses. A forced run (`force: true`) reloads every record in the mirror and takes no sync lock, so it can overlap the cron job. It spends RealGreen API calls and can be repeated, but it is not a read. It was admin only, so assign it deliberately. The Sync Utilities page (`syncUtils`) is the supported way to sync and is a separate folder.

**Capabilities** (`realGreen/customer/customerCapabilities.ts`, feature `customer`, four resources):

| Op | Capability |
|---|---|
| `getMirrorCustomers` | `customer.customers.realGreen.read` |
| `refreshCustomer`, `runSearchScheme` | `customer.liveCustomers.realGreen.read` |
| `syncCustomers`, `syncPrograms`, `syncServices` | `customer.customerSync.write` |
| `getCorruptedSyncRecords` | `customer.corruptedSyncRecords.read` |

**Done:** declaration registered. All 7 ops on `capability:` (no `roles` left in the six routes). The folder has no write or delete controls of its own and no role checks in components. Every hook that loads gained a flag that defaults to allowed:
- `canLoad` (the mirror read) on `useActiveCustomers`, `usePrintedCustomers`, `useFullSeasonServices`, `useLastSeasonProduction`, `useRecentProduction` (second argument), `useMultiSeasonProduction`, `useByAssignmentCustomers`, `usePriorityServiceCustomers`, `useSingleCustomer` (guards `lookup`), `useCustomerQuery` (guards `reload`), `useCorruptedRecordsCustomers` (second argument) and `useCorruptedSyncRecord`. It guards the mount load and `refresh`, or `load` and `loadByServIds` where a hook has no mount load.
- `canRefreshLive` (the live read) on the seven hooks that have a `refreshCustomer`: `useActiveCustomers`, `usePrintedCustomers`, `useFullSeasonServices`, `useLastSeasonProduction`, `useRecentProduction`, `useMultiSeasonProduction` and `useSingleCustomer`. It guards `refreshCustomer` only. `useMultiSeasonProduction` already returned a `canLoad` (whether a season is set), and it now returns `canLoad` AND the new flag.

**Finding for review:** the custFlag listener (`custFlagListeners.ts`) runs after every customer refresh, and the refresh is a live RealGreen call. That is now behind `liveCustomers.read`, so a user without it cannot trigger the listener's flag reconcile through the refresh. Nothing else changes there.

**Finding for review:** the screens' data are the mirror reads, so almost every screen needs `customers.read`. `refreshCustomer` (the spinner icon on a customer row in the sanity and pace screens) is a separate capability, `liveCustomers.read`. A user with only `customers.read` sees the data and the icon does nothing. The icons are not hidden yet (deferred below).

**Finding for review:** `PIPELINE` in `customerSlices.ts` can put any context back on the RealGreen pipeline, which goes through `runSearchScheme`. All contexts are on `"mirror"` today. A context flipped back to `"realGreen"` would then need `liveCustomers.read` for its initial load, not `customers.read`. The hooks' `canLoad` flag does not know which one applies, so flip a context back only together with its callers' flags.

**Finding for review:** `sandbox/customerSync/page.tsx` posts to the three sync routes with no gate and no disabled button (deferred below).

**Decisions made by default:**
- One feature, `customer`, for the whole folder (the mirror, the live reads, the legacy sync and the corrupted records), because the readme treats Customers -> Programs -> Services as one module and the single mirror read returns all three.
- `customers` (the mirror) and `liveCustomers` (live RealGreen) are separate resources, because they cost differently. A mirror query is cheap and the live scheme run takes about 38 seconds of RealGreen API time.
- `refreshCustomer` shares `liveCustomers.read` with `runSearchScheme`. It reads one customer live and writes nothing.
- The three sync ops share one capability, because they do the same thing to three entities and are always run together. `corruptedSyncRecords` is its own read: it is our own log of skipped records and is admin only, so a screen that needs customers should not also grant it.
- No `requires` on any of them: the customer module also needs the call log, flag, company, price table and program-service data to hydrate, and those are not declared yet (deferred below).
- No `GatedPanel` and no nav gate: the folder has no screen of its own. `CustomerLink` and `ProgramLink` are plain links. The sandbox corrupted records pages (their own folder) show the data.
- `runDeltaSync` and `runFullSync` (and the `mirrorSync` cron) call the sync functions directly, not the routes, so they are not affected. `syncUtils` has its own route (a separate folder).

**Screen capability set:** none of its own. Most screens need `customer.customers.realGreen.read`. Add `customer.liveCustomers.realGreen.read` for any screen with a per-customer refresh icon. The corrupted records sandbox pages need `customer.corruptedSyncRecords.read` and `customers.read`.


### realGreen/discount

**Contract:** `realGreen/discount/api/DiscountContract.ts` (route `api/route.ts`, `createRealGreenRpcHandler`), op `getAll`. Gate before: admin, office.

**Capabilities** (`realGreen/discount/discountCapabilities.ts`, feature `discount`):

| Op | Capability |
|---|---|
| `getAll` | `discount.discounts.realGreen.read` |

**Done:** declaration registered. Route on `capability:` (no `roles` left). `useDiscount` takes a `canLoad` flag (default allowed) that guards the mount load and `refresh`. The folder has no components and no role checks.

**Decisions made by default:** a separate `discount` feature with one read-only collection, `discounts`, `source: "realGreen"`. Read only: the contract has no write. No screen, so no `GatedPanel`. Two outside callers, `usePaceDeps` and `usePrepayLettersDeps`, load it to price services after discount. They are not edited here (see the deferred table). `ServiceUtils` and `pricingFuncs` take the loaded discounts and call no route.

**Screen capability set:** none of its own. The pace and prepay letter screens need `discount.discounts.realGreen.read` to show prices after discount. Without it the discount list is empty, and every price shows with no discount applied.

### realGreen/employee

**Contract:** `realGreen/employee/api/EmployeeContract.ts` (route `api/route.ts`, `createRealGreenRpcHandler`), op `getAll`. Gate before: admin, office.

**Capabilities** (`realGreen/employee/employeeCapabilities.ts`, feature `employee`):

| Op | Capability |
|---|---|
| `getAll` | `employee.employees.realGreen.read` |

**Done:** declaration registered. Route on `capability:` (no `roles` left). `viewActive/page.tsx` now wraps a new inner `ActiveEmployees` in `GatedPanel`, so the mount load never fires without `read`. `useEmployee` takes a `canLoad` flag (default allowed) that guards the mount load and `refresh`. The folder has no write controls and no role checks in components. The page is not in the nav (no entry names it), so no nav gate was added.

**Finding for review (not about permissions, not changed):** `viewActive/page.tsx` selects `employees` and never uses it, and shows only a sentence. It looks like an unfinished stub. The outermost element is `Container variant="page"`, so check it against the page-scroll convention in `AGENTS.md` once the page has content.

**Decisions made by default:** a separate `employee` feature with one read-only collection, `employees`, `source: "realGreen"` (the employees live in RealGreen and only the stored properties are kept here). Read only: the contract has no write. `GatedPanel` (whole screen) because the page shows nothing but the employee read. About 13 outside callers load the employees to show a name instead of an id, and they are not edited here (see the deferred table).

**Screen capability set:** `employee.employees.realGreen.read` for the view active employees page.

### realGreen/flag

**Contract:** `realGreen/flag/api/FlagContract.ts` (route `api/route.ts`, `createRealGreenRpcHandler`), op `getAll`. Gate before: office, admin.

**Capabilities** (`realGreen/flag/flagCapabilities.ts`, feature `flag`):

| Op | Capability |
|---|---|
| `getAll` | `flag.flags.realGreen.read` |

**Done:** declaration registered. Route on `capability:` (no `roles` left). `list/page.tsx` now wraps a new inner `FlagList` in `GatedPanel`, so the mount load never fires without `read`. `useFlag` takes a `canLoad` flag (default allowed) that guards the mount load and `refresh`. The folder has no write controls and no role checks in components. The list page is not in the nav (no entry names it), so no nav gate was added.

**Finding for review (not about permissions, not changed):** `list/page.tsx` shows only the selected flag's description. It looks like an unfinished stub. Its outermost element is `Container variant="page"`, so check it against the page-scroll convention in `AGENTS.md` once the page has content.

**Decisions made by default:** a separate `flag` feature (the flag definitions) with one read-only collection, `flags`, `source: "realGreen"`. It stays apart from `custFlag` (which customers carry a flag, and assigning one). Read only: the contract has no write. `GatedPanel` (whole screen) because the page shows nothing but the flag read. Seven outside callers load the flags, and about twenty files select `flagSelect` to show a flag's description instead of its id. They are not edited here (see the deferred table).

**Screen capability set:** `flag.flags.realGreen.read` for the flag list page.

### realGreen/prepay

**Contract:** `realGreen/prepay/api/PrepayContract.ts` (route `api/route.ts`, `createRealGreenRpcHandler`), op `getAll`. Gate before: office, admin.

**Capabilities** (`realGreen/prepay/prepayCapabilities.ts`, feature `prepay`):

| Op | Capability |
|---|---|
| `getAll` | `prepay.prepays.realGreen.read` |

**Done:** declaration registered. Route on `capability:` (no `roles` left). `usePrepay` takes a `canLoad` flag (default allowed) that guards the mount load and `refresh`. The folder has no components and no role checks.

**Decisions made by default:** a separate `prepay` feature (the prepay codes RealGreen offers) with one read-only collection, `prepays`, `source: "realGreen"`. It stays apart from `prepayLetters`, which only uses the codes. Read only: the contract has no write. No screen, so no `GatedPanel`. One outside caller, `QuickSendPage`, loads it, and `PrepaySelector` and `quickSendSelect` read `prepaySelect`. They are not edited here (see the deferred table).

**Screen capability set:** none of its own. The quick send screen needs `prepay.prepays.realGreen.read` to offer prepay codes and to price a letter with its prepay percent. Without it the prepay list is empty.


### realGreen/priceTable

**Contract:** `realGreen/priceTable/api/PriceTableContract.ts` (route `api/route.ts`, plain `createRpcHandler`, not the RealGreen handler), op `getPriceTableDocs`. Gate before: office, admin.

**Capabilities** (`realGreen/priceTable/priceTableCapabilities.ts`, feature `priceTable`):

| Op | Capability |
|---|---|
| `getPriceTableDocs` | `priceTable.priceTables.realGreen.read` |

**Done:** declaration registered. Route on `capability:` (no `roles` left). `usePriceTable` takes a `canLoad` flag (default allowed) that guards the mount load and `refresh`. The folder has no components and no role checks.

**Decisions made by default:** a separate `priceTable` feature with one read-only collection, `priceTables`, `source: "realGreen"`. Read only: the contract has no write. The route also writes a Mongo cache (`cachePriceTableDocs`) when the cache is stale, but that is a side effect of reading, not a change the user asks for, so it is not a `write` verb. No screen, so no `GatedPanel`. Six outside callers load it or read `priceTableSelect`, and the price table feeds the pricing of every program and service. They are not edited here (see the deferred table).

**Screen capability set:** none of its own. Every screen that shows what a service costs needs `priceTable.priceTables.realGreen.read`. Without it the price table list is empty and prices cannot be worked out.



### realGreen/product (with `unitConfig`)

**Contracts:** `realGreen/product/api/ProductContract.ts` (route `api/route.ts`, `createRealGreenRpcHandler`), ops `getAll`, `saveCategory`, `saveMasterSubProducts`, `saveUnit`, `saveMasterEquipmentPackages`. And `realGreen/product/unitConfig/api/UnitConfigContract.ts` (route `api/route.ts`, plain `createRpcHandler`), ops `getAll`, `saveConfig`. Gates before: both `getAll` ops and `saveConfig` office, admin. The four product saves admin only.

**Capabilities** (`realGreen/product/productCapabilities.ts`, feature `product`):

| Op | Capability |
|---|---|
| `product getAll` | `product.products.realGreen.read` |
| `saveCategory` | `product.productCategories.write` |
| `saveUnit` | `product.productUnits.write` |
| `saveMasterSubProducts` | `product.subProductConfigs.write` |
| `saveMasterEquipmentPackages` | `product.masterEquipmentPackages.write` |
| `unitConfig getAll` | `product.unitConversions.read` |
| `unitConfig saveConfig` | `product.unitConversions.write` |

**Done:** declaration registered. Both routes on `capability:` (no `roles` left). `list/page.tsx` and `mixChart/page.tsx` are each a `GatedPanel` over a new inner component (`ProductList`, `MixChart`), so their mount loads never fire without `products.read`. Save buttons are disabled by their write: `SingleEditPanel`, `SubEditPanel` and `EditAttributesPanel` (category and unit), `MasterEditPanel` (category, unit, sub products and equipment packages) and `ConversionList` (each row). `useProduct` takes a `canLoad` object (`products`, `unitConversions`, `appMethods`) and `useUnitConfig` takes a flag, all defaulting to allowed. The list and mix chart pages pass them from `allows(...)`, and the mix chart page also passes `equipmentDefinitions.read` to `useEquipment`. `MasterEditPanel` passes `equipmentPackages.read` to `useEquipmentPackage`. `ProductsFooter` hides each of its three badges unless the user holds that feature's read. This closes the `AppMethodCRUD` and `ProductsFooter` deferred rows. The Products and Mix Charts nav entries moved to `products.read`. `equipment.equipmentPackages.delete` now `requires` `products.read` (a comment in `equipmentCapabilities.ts` says why it is a string).

**Finding for review:** the nav entries were admin only (Products) and admin, office and tech (Mix Charts). They now share one capability, so Mix Charts is no longer open to a tech by role. Assign `products.read` to whoever should see both.

**Finding for review:** `MasterEditPanel`, `ConversionsTab` and the edit panels select `productSelect` and the unit config store, which hold data loaded by the page. Without `unitConversions.read` the conversions tab shows each product's built-in defaults rather than its stored ones, and a save from there would overwrite the stored config with those defaults. The tab is not gated by that read, only its save buttons by the write.

**Decisions made by default:** one `product` feature. `products` is a read-only RealGreen collection. The four product writes are separate native resources (`productCategories`, `productUnits`, `subProductConfigs`, `masterEquipmentPackages`) because each changes different data: a category rename or a unit change reaches every product using it, while the sub product and package saves change one master. They have no read of their own because they are only loaded merged into `getAll` (the same shape as `callAheadDocProps`), and each `requires` the products read. `unitConversions` has its own read and write because `unitConfig` is its own route and its own load. Nothing here is irreversible: each save can be undone by saving the old value, so no op got a one-off capability. The commented-out one-time migration block in `getAll` is dead code and is not a route. `saveConfig` was open to office and is now under `unitConversions.write` with the other writes. The unit config shares a feature with the products because the screens that edit one show the other.

**Screen capability set:** `product.products.realGreen.read` to open the product list or the mix chart, plus `.unitConversions.read`, `appMethod.appMethods.read` (a sub product's rate), `equipment.equipmentDefinitions.read` and `equipment.equipmentPackages.read` (the `requires` of `products.read`) for the data they show. The writes are `productCategories.write` and `productUnits.write` (category and unit on every tab), `subProductConfigs.write` and `masterEquipmentPackages.write` (the master panel) and `unitConversions.write` (the conversions tab).

### realGreen/progServ

**Contract:** `realGreen/progServ/api/ProgServContract.ts` (route `api/route.ts`, `createRealGreenRpcHandler`), ops `getProgCodes`, `getServCodes`, `saveServCodeChanges`, `saveProgCodeChanges`. Gates before: both reads office, admin. Both saves admin only.

**Capabilities** (`realGreen/progServ/progServCapabilities.ts`, feature `progServ`):

| Op | Capability |
|---|---|
| `getProgCodes` | `progServ.progCodes.realGreen.read` |
| `getServCodes` | `progServ.servCodes.realGreen.read` |
| `saveProgCodeChanges` | `progServ.progCodeDocProps.write` |
| `saveServCodeChanges` | `progServ.servCodeDocProps.write` |

**Done:** declaration registered. Route on `capability:` (no `roles` left). `progCode/page.tsx` and `servCode/page.tsx` are each a `GatedPanel` over a new inner component (`ProgCodes`, `ServCodes`), so their mount loads never fire without the read. The program code page passes `canLoad` to `useProgServ` (both lists) and `usePriceTable`. The service code page loads only the service codes. `useProgServ` takes a `canLoad` object (`progCodes`, `servCodes`) that skips each dispatch, and `useProductRules` passes a `canLoad` through to `useProduct` (the new exported type `ProductCanLoad`). `ServCodeEditPanel` passes `products`, `unitConversions` and `appMethods` flags. The save controls are disabled by their write: the "Save Changes" button in `ProgCodeEditPanel`, the one in `ServCodeTab`, and the Save in `ServCodeCallAheadRow`. `ServCodeCallAheadTab` loads only service codes (gated by the read) and shows an inline note without it. The Program Codes and Service Codes nav entries moved to their reads. This closes the `ServCodeCallAheadRow` deferred row from `callAhead`.

**Finding for review:** the edit panels change a draft in the store, and only the Save button writes. So a user without the write can still change the fields on screen, and only the save is refused (the button is disabled). The unsaved draft stays in the store until the page is reloaded. Disabling each field would mean threading the flag through about fifteen controls in `ServCodeEditPanel` alone, so it was left to the save control as the rest of the migration does.

**Finding for review:** `getProgCodes` also syncs the program-to-service links into Mongo (`syncProgServ`) when the cache is over 12 hours old, so a read by one user can write for all. That is a cache refresh, not a user choice, and is under the read as in `priceTable`.

**Finding for review:** `progServSelect` hydrates employees (`employeeSelect`) and assignment plans (`assignmentPlanSelect`) into each service code. Neither is loaded by these screens. They show whatever other screens loaded, so without those reads the assigned-to values are empty. They are not in `requires`.

**Decisions made by default:** one `progServ` feature, because the two lists share one route, one slice and one sync. Both lists are read-only RealGreen collections. The two saves are native resources (`progCodeDocProps`, `servCodeDocProps`), each requiring its own list read, because a program's price tables and a service's rules and call-ahead tag are different data. They have no read of their own because they are only loaded merged into the lists (the same shape as `callAheadDocProps`). Nothing is irreversible: both saves are upserts of settings that can be saved back, so no op got a one-off capability. `saveServCodeChanges` is shared by the service code page and the call-ahead service codes tab, which both edit settings of the same documents, so the tab did not get a capability of its own. The tab needs `servCodeDocProps.write` as well as `callAheads` access to use its Save.

**Screen capability set:** `progServ.progCodes.realGreen.read` for Program Codes (with `servCodes.read` for the service code counts, and `priceTable.priceTables.realGreen.read` for the price table pickers, which `progCodes.read` requires), plus `.progCodeDocProps.write` to save. `progServ.servCodes.realGreen.read` for Service Codes (with `product.products.realGreen.read` for the product rule picker, which `servCodes.read` requires), plus `.servCodeDocProps.write` to save. The call-ahead config Service Codes tab needs `servCodes.read` and `servCodeDocProps.write`.



### realGreen/rgApiLog

**Contract:** none. The folder has no route and no `*Contract.ts`. It holds `RgApiLogModel.ts`, `RgApiLogTypes.ts` and `rgApiLogFunc.ts` (`logRgApiOperation`), which `createRealGreenRpcHandler` and `customer/api/route.ts` call on the server to count RealGreen calls per operation.

**Decisions made by default:** no declaration. The log is written by the server as a side effect of every RealGreen call, never by a user, and nothing reads it back (the "Future: Admin UI" section in `_lib/api/realGreenApiLogPlan.md` is not built). A capability for it would grant nothing. When the admin page is built, it needs its own read (probably a `rgApiLog` feature with a read only collection), and the data is sensitive (the `mongo-read` skill treats `rgapilogs` as raw API traffic).

**Screen capability set:** none. No screens.

### realGreen/serviceCondition

**Contract:** `realGreen/serviceCondition/api/ServiceConditionContract.ts` (route `api/route.ts`, `createRealGreenRpcHandler`), op `getServiceConditions`. Gate before: admin, office, tech.

**Capabilities** (`realGreen/serviceCondition/serviceConditionCapabilities.ts`, feature `serviceCondition`):

| Op | Capability |
|---|---|
| `getServiceConditions` | `serviceCondition.serviceConditions.realGreen.read` |

**Done:** declaration registered. Route on `capability:` (no `roles` left). `useServiceCondition` takes an optional `{ canLoad }` object (default allowed) that skips the load effect, and the call with no argument still works. The folder has no components and no role checks. `serviceConditions.read` `requires` `conditionCode.conditionCodes.realGreen.read`, because a service condition only carries a condition id and the text shown comes from the condition code list.

**Decisions made by default:** a separate `serviceCondition` feature with one read only collection, `serviceConditions`, `source: "realGreen"`. Read only: the contract has no write. No `GatedPanel` and no write gating, because there is no screen. The one hook caller is `useCoverSheetDeps`, and `centralSelect` reads `serviceConditionSelect`. Neither is edited here (see the deferred table). The route was open to tech by role, so a tech user needs this capability assigned (with the condition code read it requires) to keep the cover sheet conditions.

**Screen capability set:** none of its own. The cover sheets need `serviceCondition.serviceConditions.realGreen.read` plus its `requires` (`conditionCode.conditionCodes.realGreen.read`) to show a service's conditions.

### realGreen/syncLock

**Contract:** none. The folder has no route and no `*Contract.ts`. It holds the lock model, the sync groups and the acquire and release helpers (`syncLockFunc.ts`, `syncLockLogic.ts`, `syncGroups.ts`), which `runDeltaSync`, `runFullSync`, the customer mirror route and the `syncUtils` route call on the server.

**Decisions made by default:** no declaration. The lock is taken and released by the sync code on the server, so no user holds it. Who may start, resume or force clear a sync is decided by the routes that call these helpers (`customer/sync/*` is done as `customerSync.write`, and `syncUtils/api/route.ts` is still on `roles: ["admin"]`). `syncUtils` is its own top level folder later, and `forceClearLock` there is the op that needs the careful read (it can free a lock whose sync is still running).

**Screen capability set:** none. No screens here. The `/syncUtils` screens that show lock status import its types and labels, and migrate with `syncUtils`.


### realGreen/syncMetadata

**Contract:** `realGreen/syncMetadata/api/SyncMetadataContract.ts` (route `api/route.ts`, `createRpcHandler`, since the data is stored here and not in RealGreen), op `getAll`. Gate before: admin only.

**Capabilities** (`realGreen/syncMetadata/syncMetadataCapabilities.ts`, feature `syncMetadata`):

| Op | Capability |
|---|---|
| `getAll` | `syncMetadata.lastSyncTimes.read` |

**Done:** declaration registered. Route on `capability:` (no `roles` left). The folder has no slice, hook or components and no role checks.

**Finding for review:** nothing calls this route. There is no slice, no hook and no screen for it, and `realGreenSync.readme.md` says it was written for a future admin sync status page. It looks dead, and the `syncUtils` route reads the same collection with its own handler. The readme still says "admin only" and needs updating (see the deferred table).

**Decisions made by default:** a separate `syncMetadata` feature with one read only collection, `lastSyncTimes` (named for the data: when each entity type last synced), stored natively so it has no `source`. Read only: the sync code writes these documents on the server, never for a user, so there is no write to assign.

**Screen capability set:** none. No screens.

### realGreen/taxCode

**Contract:** `realGreen/taxCode/api/TaxCodeContract.ts` (route `api/route.ts`, `createRealGreenRpcHandler`), op `getAll`. Gate before: admin, office.

**Capabilities** (`realGreen/taxCode/taxCodeCapabilities.ts`, feature `taxCode`):

| Op | Capability |
|---|---|
| `getAll` | `taxCode.taxCodes.realGreen.read` |

**Done:** declaration registered. Route on `capability:` (no `roles` left). `useTaxCode` takes a `canLoad` flag (default allowed) that guards the mount load and `refresh`. The folder has no components and no role checks.

**Decisions made by default:** a separate `taxCode` feature with one read only collection, `taxCodes`, `source: "realGreen"`. Read only: the contract has no write. No `GatedPanel` and no write gating, because there is no screen. Callers outside the folder: `usePrepayLettersDeps`, `useZipCode` (the `zipCode` folder, done in session 12) and the `taxCodeSelect` readers (`centralSelect` and `zipCodeSelectors`). None is edited here (see the deferred table).

**Screen capability set:** none of its own. The prepay letters and the zip code list need `taxCode.taxCodes.realGreen.read` to show tax rates, and without it the tax is empty.

### realGreen/zipCode

**Contract:** `realGreen/zipCode/api/ZipCodeContract.ts` (route `api/route.ts`, `createRealGreenRpcHandler`), op `getAll`. Gate before: admin, office.

**Capabilities** (`realGreen/zipCode/zipCodeCapabilities.ts`, feature `zipCode`):

| Op | Capability |
|---|---|
| `getAll` | `zipCode.zipCodes.realGreen.read` |

**Done:** declaration registered. Route on `capability:` (no `roles` left). `useZipCode` takes two flags, both default allowed: `canLoad` (the zip codes, guarding the mount load and `refresh`) and `canLoadTaxCodes` (passed to the nested `useTaxCode`, which has its own capability). The folder has no components and no role checks. `zipCodes.read` `requires` `taxCode.taxCodes.realGreen.read`, because a zip code only carries tax code ids and `zipCodeSelect` joins the rates from the tax code list. This closes the "`useZipCode` calls `useTaxCode` with only `autoLoad`" part of the `taxCode` deferred row.

**Decisions made by default:** a separate `zipCode` feature with one read only collection, `zipCodes`, `source: "realGreen"`. Read only: the contract has no write. No `GatedPanel` and no write gating, because there is no screen. Callers outside the folder: `bizPlan/customerValue/useCustomerValueDeps`, `QuickSendPage` and the readers of `zipCodeSelect` (`byZipCodeSelect`). None is edited here (see the deferred table).

**Screen capability set:** none of its own. The customer value by zip screen and the quick send preview need `zipCode.zipCodes.realGreen.read` plus its `requires` (`taxCode.taxCodes.realGreen.read`).

### realGreen/_lib and realGreen/sampleData

**Contract:** none. `_lib` is shared server helpers (`createRealGreenRpcHandler`, `rgApi`, `extendEntities`) and types. `sampleData` is test fixtures. Neither has a route, so there is nothing to declare. The handler's `capability:` passthrough was already confirmed in earlier folders.

### ringCentral

**Contract:** none. The folder holds only `rcOnboarding.md`, a running log. The sandbox page is `sandbox/rcOnboard` (below).

**Done:** `rcOnboarding.md` no longer says the topic ops are "admin, office" and "admin only". It names the three capabilities (`knowledgeBase.topics.read`, `.write`, `.delete`) and points here. This closes the doc part of the `knowledgeBase` deferred row. The call assist topic screen does not exist yet, so its gate stays deferred.

**Screen capability set:** none. No screens here.

### routeNotes

**Contract:** `routeNotes/api/RouteNoteContract.ts` (route `api/route.ts`, `createRpcHandler`), ops `getByDateRange`, `upsert`, `deleteOne`. Gate before: admin, office for all three.

**Capabilities** (`routeNotes/routeNoteCapabilities.ts`, feature `routeNotes`):

| Op | Capability |
|---|---|
| `getByDateRange` | `routeNotes.routeNotes.read` |
| `upsert` | `routeNotes.routeNotes.write` |
| `deleteOne` | `routeNotes.routeNotes.delete` |

**Done:** declaration registered. Route on `capability:` (no `roles` left). `useRouteNotes` takes a `canLoad` flag (default allowed) that skips the range load, so a write-only caller can omit it. `RouteNoteEditor` (a generic dialog, kept as a callback component) selects `allows` itself, because it is where the Save and Delete controls are: Save is disabled without `write`, Delete without `delete`, each with a "You do not have access" tooltip. Both callers (`RoutePlanDateCard`, `RoutePlanEmployeeRow`) get the gating without being edited.

**Finding for review:** the three note triggers in `RoutePlanDateCard` (the day note button) and `RoutePlanEmployeeRow` still open the editor for a user with no `write`, who can then read the note but not save it. Only the Save is refused. Hiding the buttons would mean threading the flag through both callers, so it was left to the editor.

**Decisions made by default:** a separate `routeNotes` feature with one collection, `routeNotes`, with `read`, `write` and `delete`. `delete` is its own verb (the same shape as `holiday` and `flagRule`): a deleted note cannot be recovered from this app, and an office user who may add a note should not have to be allowed to remove everyone else's. All three were admin and office before, so assign `delete` deliberately. The load gates in other folders' hooks are deferred, not edited (see the deferred table).

**Screen capability set:** none of its own (the notes show inside the pace route plan page and the cover sheets). `routeNotes.routeNotes.read` to see notes, plus `.write` and `.delete` to edit them.


### sandbox

**Contract:** none. The folder has no route. Its pages call routes that other folders own, some through `fetch` and some through hooks. It looks like dev tooling: `assignmentMigrate` says to delete it after the migration has run, and `corruptedRecords` and `tli` are one-off investigations.

**Irreversible ops (review first):** `flagAddTest` puts real flags on two hard-coded RealGreen customers (`flagAssignments.realGreen.write`), and `assignmentMigrate` overwrites each service's stored assignments (`legacyAssignmentMigration.write`). Both buttons are now disabled without their capability. The two sync pages run a delta or full sync into the mirror (`customerSync.write`, `callLogSync.write`).

**Done:** no declaration. Each page was gated by the capability its route already checks.

| Page | Gate |
|---|---|
| `assignmentMigrate` | Run button disabled by `assignment.legacyAssignmentMigration.write`, with a tooltip |
| `customerSync` | Both buttons of all three panels disabled by `customer.customerSync.write` |
| `syncTest` | Both buttons disabled by `callLog.callLogSync.write` |
| `flagAddTest` | All four test buttons disabled by `custFlag.flagAssignments.realGreen.write`. `useFlag` and `useEmployee` get `canLoad` from their reads |
| `callLog` | `useSingleCustomer` gets `canLoad` (`customers.read`) and `canRefreshLive` (`liveCustomers.read`). `useCallLog` gets `canLoad` (`callLogs.realGreen.read`) |
| `corruptedRecords` | The layout is a `GatedPanel` on `corruptedSyncRecords.read`. `useDeps` takes `canLoad` for the corrupted records, the customers and both program and service code lists |
| `tli` | `useTliDeps` takes `canLoad` for the customers, the program and service codes and the employees. No `GatedPanel`, because the page shows whatever loaded |
| `rcOnboard` | Nothing to gate. A static script embed that calls no route |

**Finding for review:** the `corruptedRecords` sub-pages `employeeCorrupted` and `programsWithoutServices` use `useCustomerQuery` according to the deferred row. That hook was not read or changed here, so its loads may still fire for a user who passes the layout gate (`corruptedSyncRecords.read`) but lacks `customers.read`. The layout's tab list also names an `activeCustomers` tab, and the folder has no page for it. That is a broken link, not a permission issue.

**Decisions made by default:** gate rather than delete, because the migrate page may not have run yet and the user decides when to remove dev pages. Pages that run a sync or an irreversible op are disabled by the write, not hidden, so a user sees why. `tli` and `callLog` are read screens with no write, so they only pass load flags. Nothing goes in `requires`, because no declaration owns these screens.

**Screen capability set:** `assignmentMigrate` needs `assignment.legacyAssignmentMigration.write`. `customerSync` needs `customer.customerSync.write`. `syncTest` needs `callLog.callLogSync.write`. `flagAddTest` needs `custFlag.flagAssignments.realGreen.write`, `flag.flags.realGreen.read` and `employee.employees.realGreen.read`. `callLog` needs `callLog.callLogs.realGreen.read` and `customer.customers.realGreen.read`. `corruptedRecords` needs `customer.corruptedSyncRecords.read` and `customer.customers.realGreen.read`, plus both `progServ` reads for the code names. `tli` needs the customer, `progServ` and employee reads.


### sanity

**Contract:** none. The folder has no route. It is a tabbed screen over data other folders own (customers, program and service codes, flags, flag rules, call-aheads, global settings).

**Done:** no declaration. `useSanityDeps` takes a `canLoad` object with one flag per read (`customers`, `progCodes`, `servCodes`, `flags`, `flagRules`, `customerFlags`, `callAheads`, `keywords`, `globalSettings`), each default allowed, exported as the type `SanityCanLoad`. It passes them into the sub-hooks (`useFullSeasonServices`, `useProgServ`, `useFlag`, `useFlagRule`, `useFlagRuleCustFlags`, `useRenewalFlagIds`, `useCallAhead`) and guards the six direct dispatches in `load`. `useFlagRuleCustFlags` gained `canLoad`. `layout.tsx` selects `allows` for each and passes them in, and wraps the tab body in a `GatedPanel` on `customer.customers.realGreen.read`, since every tab works off the loaded customers. `FlagRuleCRUD` disables Save by `flagRules.write`, both Delete buttons by `flagRules.delete` and "New Rule" by `write`, and shows an inline note when the user cannot read rules. This closes the `useSanityDeps` and `FlagRuleCRUD` row from `flagRule` and the `useSanityDeps` rows from `callAhead`.

**Finding for review:** the "Refresh customer" buttons in about twelve sanity rows (`CustomerRow` and the prenotification, program, promise, size and zero revenue rows) call `refreshCustomer` from `useFullSeasonServices()` with no flags. That hook has `canRefreshLive`, but passing it from each row needs the same `allows` select twelve times, so it was left. A user without `liveCustomers.read` presses it and the server refuses. The panels (`PromiseSanityPanel`, `SizeSanityPanel`, `PrenotificationPanel`) call `useFullSeasonServices()` for `refresh` with no flag either.

**Finding for review:** the screen needs many reads. Without `customer.customers.realGreen.read` it shows "You do not have access", and without the program and service code reads it shows customers with no programs. The Flag Rules tab is the one that works with a smaller set (`flagRule.flagRules.read` plus the flag and customer flag reads), but it sits behind the same customer gate.

**Decisions made by default:** the one `GatedPanel` is on the customer read because it is the only read every tab needs. The other reads are load flags, not gates, because a tab can still show something without them (the Overview tab is static text). No `requires` exists to add, since there is no declaration, and a new `sanity` declaration would have no resource to own.

**Screen capability set:** `customer.customers.realGreen.read` (the gate), plus `progServ.progCodes.realGreen.read`, `progServ.servCodes.realGreen.read`, `flag.flags.realGreen.read`, `flagRule.flagRules.read`, `custFlag.customerFlags.realGreen.read`, `callAhead.callAheads.realGreen.read`, `callAhead.keywords.read` and `globalSettings.settings.read`. Add `flagRule.flagRules.write` and `.delete` to edit rules. Add `customer.liveCustomers.realGreen.read` for the row refresh buttons.

### schedPromise (nothing to declare)

**Contract:** none. No route, no screen and no data of its own. The folder is `parsePromise.ts` (reads and writes the promise text kept in a tech note), `dateRangeParse.ts`, `timeRangeParse.ts`, `SchedPromiseTypes.ts` and `PromiseBuilder.tsx`, a presentational form that edits a promise and calls `stringifyPromise`. It loads and saves nothing: callers pass the text in and out.

**Decisions made by default:** no declaration and no gate. `centralSelect` and the `sanity` selectors call the parsers, and `sanity`'s `PromiseBuilderPopover` mounts the builder, so their access is those folders' capabilities (the `sanity` layout is already a `GatedPanel`). Writing a promise back into a RealGreen tech note is a `customer` operation, not this folder's.

### scheduling (with `coverSheets`, `prenotify`, `dailyInventory`, `eta`)

**Contract:** `dailyInventory/api/LoadoutContract.ts` (`getLoadouts`, `getLoadout`, `getLoadoutKeys`, `upsertLoadout`) and `eta/api/ServiceEtaContract.ts` (`getServiceEtas`, `saveServiceEta`).

**Irreversible op (review first):** `upsertLoadout` replaces the stored loadout whole, including a loadout already marked finished (`isStored: true`), with no check on the server. Start loadout and finish loadout both use it, so a user who holds `loadouts.write` can overwrite a finished loadout by saving the start form again. It sits under `write` because both screens need it, but it is the op to look at if finished loadouts must be protected. It was open to `tech` before, and is now open only to whoever is given `loadouts.write`.

**Capabilities:**

| Op | Capability |
|---|---|
| `getLoadouts`, `getLoadout`, `getLoadoutKeys` | `scheduling.loadouts.read` |
| `upsertLoadout` | `scheduling.loadouts.write` |
| `getServiceEtas` | `scheduling.serviceEtas.read` |
| `saveServiceEta` | `scheduling.serviceEtas.write` |

**Done:** `schedulingCapabilities.ts` declares `loadouts` and `serviceEtas` (`read` and `write` each, no delete: both are only replaced) and is registered. Both routes are on `capability:`. `_libShared/schedulingCanLoad.ts` is a pure helper: `schedulingCanLoad(allows)` returns one flag per read the three screen groups load. The cover sheet, date and prenotify pages and the five loadout pages call it with `useSelector(userCapabilitiesSelect.allows)` and pass the result to `useCoverSheetDeps`, `usePrenotify`, `useLoadoutPageDeps`, `useLoadoutFormDeps`, `useLoadoutFeedbackDeps` and `useLoadoutReportDeps`, which now take a required `canLoad: SchedulingCanLoad`. Each forwards the flags to its sub-hooks and guards the direct `assignmentActions` dispatches. `useServiceEta` gained `canLoad` (default allowed). Gates: the cover sheet, date and prenotify pages are `GatedPanel`s on `serviceEtas.read`, and the whole `dailyInventory` layout is a `GatedPanel` on `loadouts.read`. Controls: `EtaServiceRow` disables its input and Save by `serviceEtas.write`, `LoadoutStartForm` and `LoadoutFinishForm` disable Save by `loadouts.write`, and `CoverSheetsConfigEditor` disables Save by `globalSettings.settings.write` and passes `canLoad` to `useGlobalSettings` and `useFlag`. Nav: Cover Sheets and Prenotification use `serviceEtas.read`, Loadout uses `loadouts.read`. This closes the scheduling part of about fifteen deferred rows (see the deferred table).


**Finding for review:** `UnservDropZone` (already gated by `assignment.serviceAssignments.write`) is shown on both the cover sheet and prenotify pages, so uploading the unserviced report needs a second capability that the page's own gate does not mention. It is correct, and it is not in `requires`, because the drop zone is not needed to use the screen.

**Finding for review:** the loadout dashboard cards navigate to the start and finish forms for any user who holds `loadouts.read`. A reader without `write` reaches the form and finds Save disabled, with a tooltip. Hiding the cards would mean selecting `allows` in both and was left.

**Finding for review:** `LoadoutFinishForm` has a `console.log(issues)` on every render and `DailyInventoryPage` logs the available dates. Both are leftovers, not permission issues, and were left alone.


**Decisions made by default:** one feature (`scheduling`) with two resources named for the data, not one per screen, because loadouts and ETAs are the only data this folder owns. `coverSheets` and `prenotify` own no data, so they borrow `serviceEtas.read` as their entry capability: it is the one thing both screens read and edit, and a user who can see ETAs is the user who should see the screens that set them. The alternative is two singleton reads, listed in the deferred table. `loadouts.write` is shared by start and finish because they call one op. There is no per-employee check: a tech can already save a loadout for another tech's route today, and `canSubmit` only checks that a tech was picked. There is no load flag for `loadouts.read` itself: the layout is gated on it, so those pages never mount without it, and `useLoadoutReportDeps` is reached through `/scheduling/dailyInventory/loadoutFeedback/report`, which is inside that layout. `requires` lists what each entry capability loads, using the owning features' `can` constants, so a rename breaks the build. Application methods, equipment, equipment packages and unit conversions are not listed because `product.products.realGreen.read` already requires them, and requirements are followed transitively when an admin assigns a capability.

**Screen capability set:** Cover Sheets and Prenotification need `scheduling.serviceEtas.read` (the gate), plus `customer.customers.realGreen.read`, `employee.employees.realGreen.read`, `product.products.realGreen.read`, both `progServ` reads, `assignment.serviceAssignments.read` and `globalSettings.settings.read`. Cover sheets add `flag.flags.realGreen.read`, `custFlag.customerFlags.realGreen.read`, both `callAhead` reads, `conditionCode.conditionCodes.realGreen.read`, `serviceCondition.serviceConditions.realGreen.read` and `routeNotes.routeNotes.read`. Prenotification adds `plannedTimeOff.absences.read` and both `callAhead` reads. Add `scheduling.serviceEtas.write` to save an ETA, `routeNotes.routeNotes.write` to edit a note and `globalSettings.settings.write` to save the cover sheet config. The loadout screens need `scheduling.loadouts.read` (the gate), plus the customer, employee, product, both `progServ`, assignment and global settings reads (the equipment reads come through the product read). Add `scheduling.loadouts.write` to save a start or finish loadout.


### syncUtils

**Contract:** `api/SyncUtilsContract.ts` (`getSyncStatus`, `runDeltaSync`, `startFullSync`, `runFullSyncChunk`, `clearSyncLock`). All five were `roles: ["admin"]`.

**Irreversible ops (review first):** `startFullSync` deletes every mirrored record in the group (customers, programs and services, or call logs) and `runFullSyncChunk` reloads them one step at a time, so mirror queries fail until it finishes. `clearSyncLock` can free a lock whose sync is still running, so a second sync can start over it, and with `abandonRun` it discards an unfinished full sync and leaves the mirror empty or partial until a delta sync reloads it. All three were admin only, and each now has its own capability that no read shares. `startFullSync` still asks the server to verify the user's password. That is re-authentication, not permission, and it stays on top of `fullSync.write`.

**Capabilities:**

| Op | Capability |
|---|---|
| `getSyncStatus` | `syncUtils.syncStatus.read` |
| `runDeltaSync` | `syncUtils.deltaSync.write` |
| `startFullSync`, `runFullSyncChunk` | `syncUtils.fullSync.write` |
| `clearSyncLock` | `syncUtils.syncLocks.write` |

**Done:** `syncUtilsCapabilities.ts` declares `syncStatus` (singleton, `read`), `deltaSync` (singleton, `write`), `fullSync` (singleton, `write`) and `syncLocks` (collection, `write`), and is registered. The route is on `capability:` for all five ops. `requires` lists `syncStatus.read` on each write, because every control sits on the status screen. The layout wraps the body in a `GatedPanel` on `syncStatus.read`. In `SyncGroupPanel`, Run Delta Sync is disabled by `deltaSync.write`, Full Sync and Resume by `fullSync.write`, and Clear lock and Abandon run by `syncLocks.write`, each with a tooltip. The Sync Utilities nav entry uses `syncStatus.read`. The Refresh button is a read, so it needs nothing more.

**Finding for review:** `useSyncGroup` is local state with no `canLoad`, and `SyncGroupPanel` calls it on mount, which fires `getSyncStatus`. The panel is inside the layout's `GatedPanel`, so it never mounts without the read and no flag is needed. `auth/api/route.ts` imports `assertCurrentUserPassword` from this folder for its own confirm-password flow. The helper is unchanged and has no capability, which is correct.

**Finding for review:** `runFullSyncChunk` shares `fullSync.write` with `startFullSync` on purpose: it only does something after a run has been started, and it is how a stopped run is resumed. A user who holds `fullSync.write` can resume another user's unfinished run without re-entering a password. If that is not wanted, move the chunk op to its own capability and require the password on resume as well.

**Decisions made by default:** four capabilities, one per kind of risk, instead of one `write` or one per op. A user who may run a delta sync (low risk, refused while a lock is held) is not given the full sync wipe. `syncLocks.write` is separate because freeing a lock is the only op that can cause a second sync to run over a live one. `syncStatus` is a singleton because it is one screen's state, not a list of records. The two tabs (Customers and Call Logs) share the capabilities: both groups are the same operation on different collections, and the user chose the screen by link.

**Screen capability set:** `syncUtils.syncStatus.read` (the gate). Add `syncUtils.deltaSync.write` to run a delta sync, `syncUtils.fullSync.write` to wipe and reload (or resume), and `syncUtils.syncLocks.write` to clear a lock or abandon a run. A non-superuser who held `admin` before holds none of these until assigned.


### timeCard

**Contract:** `api/timeCardContract.ts` (`importPunches`, `getPunches`, `getLastImportedDate`).

**Capabilities:**

| Op | Capability | Was |
|---|---|---|
| `getPunches`, `getLastImportedDate` | `timeCard.punches.read` | admin, office, tech |
| `importPunches` | `timeCard.punches.write` | admin, office |

**Done:** `timeCardCapabilities.ts` declares `punches` (`read`, `write`) and is registered. The route is on `capability:` for all three ops. `requires` lists `employee.employees.realGreen.read` on `punches.read`. `useTimeCard` gained `canLoad` (default allowed), and both `fetchPunches` and `fetchLastImportedDate` skip the request when it is false. The layout selects `allows`, passes `canLoad` to `useTimeCard` and `useEmployee`, and wraps the page body in a `GatedPanel` on `punches.read`. `PunchImportPanel` disables its Import button by `punches.write`, with a tooltip. The Import and Payroll tabs are links inside the layout, so both are behind the gate. There is no nav entry: the screens are reached from the layout's links and from the `PunchImportWidget` on the productivity screens.

**Finding for review:** `getPunches` and `getLastImportedDate` were open to `tech`. A tech who needs to see their own time card will need `punches.read`, and it shows every employee's punches, because the route has no per-employee filter. Payroll totals for all staff are then readable by anyone who holds the read. Whether that read should be split from a "my own punches" read depends on whether techs use the screen, and nothing in the code does.

**Finding for review:** `importPunches` upserts each punch by `punchId` and replaces its segments, so a later import silently overwrites an earlier manual correction. That is the existing behaviour and the normal way to fix a punch, so it stays under `write`.

**Decisions made by default:** one resource named for the data (`punches`), with `read` and `write` only: there is no delete and no other op. Payroll totals are computed on the client from `getPunches`, so the payroll screen needs only the read. `getLastImportedDate` shares the read: it returns a date derived from the same collection.

**Screen capability set:** `timeCard.punches.read` (the gate), plus `employee.employees.realGreen.read` for names. Add `timeCard.punches.write` to import punches.

### transactions (nothing to declare)

**Contract:** none. The folder holds only `transactionPlan.md`, a planning document for importing credit card transactions into QuickBooks through an aggregator. No route, no screen and no code. The screens that were built from the idea are in `qbo/importCCTxn`, which is migrated.


