# Permission refactor: context for a fresh session

Read this first, then `AGENTS.md`. It is a handoff: what was decided, what is done on disk, and what is next. `combineCapabilities.md` in this folder is **out of date** (it describes the old per-module declarations) and is rewritten in step 7.

## Goal

Replace per-module capability declarations (48 `*Capabilities.ts` files, each calling `createFeatureCapabilities`) with **one central permission tree**: groups, then resources, then verbs. Handlers pick the capability an op needs from a typed `can`, and components gate with the same constants. Groups exist only for the admin UI (matrix, bundles, user assignment) and are never part of a capability string.

## Decisions (do not relitigate without asking)

- **A capability string is `resource.verb`**, for example `customers.read`. No feature or module segment, no `source` segment. `source` (`realGreen` or `qbo`) is metadata for a badge only.
- **A resource is named for a data entity**, never a feature or screen. There is no "pace", "scheduling" or "javelin" key, because there is no such object. A feature is a composition of resources. "Feature" is no longer a code concept.
- **Resource keys are globally unique.** The registry throws on a repeat at load.
- **QBO entities are prefixed `qbo`** (`qboCustomers`), because they are secondary views of QBO data. RealGreen is the primary system and keeps plain names.
- **A manual sync is its own permission**, separate from access to the data it copies. `customerSync` covers the customer, program and service syncs together (a partial sync breaks the mirror). `callLogSync` is separate.
- **Plan, post and history are separate resources** for QuickBooks writes: `journalEntryPlans` (read), `qboJournalEntries` (write), `journalEntryHistory` (read), and `ccExpensePlans` (read) with `qboExpensePostings` (write). Anything sent to live QBO is also stored here.
- **`requires` is gone.** Grouping replaces it. Verb companions stay: ticking write ticks read, within one resource only.
- **`shape` and `userOwned`/Any verbs are gone.** Ownership ("only your own template") is enforced in handlers by `saId`, not by a verb. Verbs are only read, write, delete.
- **`name` is required on groups and resources, `description` is optional.** Luke writes descriptions himself, only where a name leaves room for confusion. Do not write descriptions. Warnings from the old comment blocks are kept as code comments beside each resource.
- **`liveCustomers` was merged into `customers`.** Mirror versus live RealGreen is a fallback code path nobody chooses between.
- **Dev data only.** There are no bundles or stored grants, so strings can change freely and no data migration is needed.
- **Tests are ignored until a separate cleanup session.** Do not edit `src/__tests__`, and do not run vitest.
- The orphaned `src/app/assignmentGroup` folder was deleted. Pace's copy, `src/app/pace/assignmentGroup`, is the live one.

## The tree (87 resources, 7 groups)

Files are in `src/permission/groups/`, one per group, listed in `groups/index.ts`. Group names and descriptions are Luke's wording. Luke may still be editing these: **re-read the files before relying on this table.**

| Group file | Resources |
|---|---|
| `realGreenMetadata` (17) | flags, conditionCodes, taxCodes, zipCodes, prepays, discounts, companies, employees, priceTables, rgAccounts, progCodes, servCodes, progCodeDocProps, servCodeDocProps, callAheads, callAheadDocProps, callAheadKeywords |
| `realGreenProducts` (9) | products, productCategories, productUnits, subProductConfigs, masterEquipmentPackages, unitConversions, appMethods, equipmentDefinitions, equipmentPackages |
| `realGreenCustomers` (5) | customers, customerFlags, flagAssignments, serviceConditions, flagRules |
| `scheduling` (13) | serviceAssignments, legacyAssignmentMigration, assignmentGroups, assignmentScenarios, groupSequences, seasonPlans, availabilityConstraints, holidays, employeeAbsences, priorityServices, routeNotes, loadouts, serviceEtas |
| `accounting` (24) | qboAccounts, qboCustomers, qboEmployees, qboVendors, qboPurchases, qboConnection, qboConnectionRevocation, accountMappings, depositFieldLinks, qboJournalEntries, journalEntryPlans, journalEntryHistory, ccImportRows, ccFormatAccounts, ccCardAssignments, ccMerchantMappings, ccSkipRules, ccMapDecisions, ccExpensePlans, qboExpensePostings, inventoryChecks, punches, increasePlans, increaseSettings |
| `customerContact` (7) | callLogs, callTopics, formTemplates, prepayConfigs, upsellPriorities, quickSendTemplates, quickSendTemplateGroups |
| `siteAdmin` (12) | globalSettings, accessRequests, bundles, userCapabilities, syncStatus, lastSyncTimes, corruptedSyncRecords, deltaSync, fullSync, syncLocks, customerSync, callLogSync |

## The new core (done, in `src/permission/`)

| File | Role |
|---|---|
| `groupTypes.ts` | `GroupDefinition`, `ResourceDefinition` (`name`, `description?`, `source?`, `verbs`, `public?`), and the derived types `CanOf`, `GroupCapability` |
| `defineGroup.ts` | `defineGroup` (validates one group), `listResources` (throws on a repeated group or resource key), `buildCan`, `resourceCapability` |
| `registryTypes.ts` | `CapabilityRegistry`, `RegistryGroup`, `RegistryResource`, `CapabilityDescription`, `VERB_COMPANIONS` |
| `buildRegistry.ts` | `buildRegistry(groups)`: `allCapabilities`, `has`, `describe`, and `byGroup` as a tree of groups with their resources |
| `can.ts` | `export const can = buildCan(permissionGroups)`. This is what handlers and components import |
| `capabilityRegistry.ts` | `buildRegistry(permissionGroups)`, for the admin UI, loaders and tests |
| `PermissionTypes.ts` | `Capability` is `${string}.${Verb}`. Also `hasCapability` and the **legacy** half (see below) |

`can.customers.read` resolves to the literal `"customers.read"`. An unknown resource, and a verb the resource does not declare, are both compile errors. This was verified with a scoped type-check probe.

`describe()` returns `resourceKey`, `resourceName`, `source`, `verb`, `groupKey`, `groupName`. Matrix members carry `resourceName` and no longer have `featureKey`.

## Done

1. **Step 1: `requires` deleted.** The field, its validation, `requirementsOf`, `requirementLogic.ts`, `selectWithRequirements`, the editors' hint notices and "also add what this needs" checkbox, every `requires` block and every cross-declaration import.
2. **Step 2: new core built** (table above).
3. **Step 3: groups authored.** Then `shape`/`userOwned` removed, regrouped to Luke's seven groups, and `liveCustomers` merged.

`addDirectMany`, its route and its contract still take a list of capabilities. The editor now sends one. That is a small follow-up, not a blocker.

## Next: step 4, migrate consumers (not started)

Every route handler, component, nav entry and `canLoad` file still imports an old `*Capabilities` object. Move each to `import { can } from "@/permission/can"` with the new resource keys.

**Size (scanned, non-test code):** 197 files, 268 import lines. 71 are `route.ts`, 123 are `.tsx`, 3 are other `.ts`. There are 164 `const { can } = xCapabilities` lines, 129 inline `xCapabilities.can.a.b` uses, and 1 aliased destructure (`{ can: importCan }`). No hard-coded capability strings exist outside `src/permission`, so only `can` constants are involved.

**Rename map (old key to new key).** Anything not listed keeps its key and only its import changes.

| Old (declaration) | New |
|---|---|
| `absences` | `employeeAbsences` |
| `accounts`, `customers`, `employees`, `vendors` (from `quickbooks`) | `qboAccounts`, `qboCustomers`, `qboEmployees`, `qboVendors` |
| `purchases` | `qboPurchases` |
| `connection`, `connectionRevocation` | `qboConnection`, `qboConnectionRevocation` |
| `settings` | `globalSettings` |
| `topics` | `callTopics` |
| `keywords` | `callAheadKeywords` |
| `storedTemplates`, `templateGroups` | `quickSendTemplates`, `quickSendTemplateGroups` |
| `importRows`, `formatAccounts`, `cardAssignments`, `merchantMappings`, `skipRules`, `mapDecisions` | `ccImportRows`, `ccFormatAccounts`, `ccCardAssignments`, `ccMerchantMappings`, `ccSkipRules`, `ccMapDecisions` |
| `postingHistory` | `journalEntryHistory` |
| `entryPlans` (from `javelin`) | `journalEntryPlans` |
| `journalEntryPostings.write` (from `javelin` and from `qboJournalEntry`) | both become `qboJournalEntries.write` |
| `expensePostings.read` | `ccExpensePlans.read` |
| `expensePostings.write` | `qboExpensePostings.write` |
| `liveCustomers.read` | `customers.read` |

`expensePostings` splits by **verb** and the two `journalEntryPostings` merge, so the rewrite must look at the verb and the declaration, not just the key.

**The trap tsc will not catch:** `customers` and `employees` each exist in two old declarations. `quickbooksCapabilities.can.customers` (QBO) becomes `qboCustomers`. `customerCapabilities.can.customers` (RealGreen) stays `customers`. The new tree has a plain `customers` key, so a QBO file rewritten to `can.customers` compiles but gates on the wrong capability. Same for `employees`. Track which declaration each `can` alias came from, and after the migration grep `src/app/qbo` and the account mapping files for `can.customers` and `can.employees` (there should be none).

**Approach agreed:** a throwaway script in `%TEMP%` (not in the repo) does the mechanical rewrite per file: find the `*Capabilities` imports and the local names holding their `can`, rewrite `alias.oldKey.verb` to `can.newKey.verb`, replace the imports with one `import { can } from "@/permission/can"`, and remove the old `const { can } = ...` line. Files with a clashing local `can`, or two aliases in one file, are hand edits. Review the diff per batch.

**Batches, with a type check between each** (see working notes; filter out `src/__tests__`):

1. Site Admin and permission: auth, global settings, sync utils, capability management.
2. Real Green Metadata.
3. Real Green Products and Customers. This includes the `liveCustomers` merge and `src/app/sandbox/callLog/page.tsx`, where `canRefreshLive` and `canLoad` now check the same capability (ask Luke whether to drop `canRefreshLive`).
4. Customer Interaction.
5. Scheduling, including the 6 pace files that import the deleted `assignmentGroupCapabilities`.
6. Accounting, last because it is the hardest: the `qbo` prefix, the `cc*` renames, the journal-entry merge and the `expensePostings` split. 19 files import `importCCTxnCapabilities`.

Do not commit unless Luke says so. A commit per batch was suggested but not decided.

## After step 4

- **Step 5:** delete the 48 `*Capabilities.ts` files, `combineCapabilities.ts`, `combinedCapabilities.ts`, `mergeRecords.ts`, and the legacy half of `PermissionTypes.ts` (`createFeatureCapabilities`, `FeatureCapabilities`, `Resource`, `CollectionResource`, `SingletonResource`, `SingletonVerb`, `ResourceOrigin`, `buildCapability`, and the `FeatureCan` and `ResolvedFeatureCapabilities` types). Keep `hasCapability`, `isSuperUserEffective`, `isValidKey`, `Capability`, `CapabilityRequirement`, `Verb` and `DataSource`. After this, production `tsc` should be clean.
- **Step 6:** nested bundle and user editors. A group row expands into its resources: group controls set every constituent, and a constituent control overrides that one. `buildMatrix`, `cellChange` and `cellState` need a resource-level scope. `registry.byGroup` already carries the tree.
- **Step 7:** rewrite `combineCapabilities.md` (or replace it) as the convention doc, and add the drift tests. Intended checks: resource keys unique, every resource in exactly one group, a group key never equal to a resource key. Written convention: a resource names a data entity, one `api/route.ts` per data module is the usual line, and a contract file marks a sub-module. This is a convention, not a law, and `realGreen/customer` is a deliberate unicorn.
- **Separate session:** repair and rewrite the permission tests.

## Known state of the repo

- **Production `tsc` shows 6 errors**, all `TS2307` for the deleted `@/app/assignmentGroup/assignmentGroupCapabilities`, in `pace/assignmentGroup/api/route.ts`, `pace/layout.tsx` and four `pace/setup/groups/_components` files. Step 4 fixes them with `can.assignmentGroups.*`.
- **About 60 test errors** (expected, ignored): `requirementLogic*.test.ts`, `combineCapabilities.test.ts`, `buildRegistry.test.ts`, the matrix tests, `logicFixtures.ts` and `permissionFixtures.ts`.
- **Nothing consumes the new tree yet.** The old `*Capabilities.ts` files still work for existing gates but no longer feed the registry. The admin screens read the new registry, which has the tree, but no handler uses `can` yet.

## Working notes

- **A full `tsc` is slow** (about 4 minutes, because WebStorm's TypeScript service competes for CPU), and the shell times out at 30 seconds. Run it in the background: write a small `.cmd` in `%TEMP%` that runs `npx tsc --noEmit > out.txt` and then writes a `.done` file, start it with `Start-Process`, and poll. `AGENTS.md` says never run `tsc`. Luke asked for it explicitly during this refactor, so run it only when he asks or agrees.
- **Scoped type check** (about 25 seconds): write a throwaway `src/permission/zzTreeProbe.ts` and a `tsconfig.probe.json` that extends `./tsconfig.json` and `include`s only that file, run `npx tsc -p tsconfig.probe.json`, then delete both. Use `// @ts-expect-error` lines to assert that bad keys fail. Useful for checking `can` typing.
- **The editor tool** needs `old_text` to edit an existing file, caps input at about 6000 characters, and cannot replace a whole existing file. To overwrite a file, use PowerShell `[System.IO.File]::WriteAllText` or `WriteAllLines`. Create new markdown files with a UTF-8 BOM. Non-ASCII characters such as the middle dot show garbled in some views; that is display only, so match text around them.
- **`tsconfig` has `noUnusedLocals: false`**, although `AGENTS.md` says it is on. Check unused imports by eye.
- **`ide_*` index tools are not available**; use file search and direct reads.
- **`AGENTS.md` conventions that matter here:** object parameters for functions with more than one argument, an `Action` suffix on function props, no hardcoded colors, no manual memoization, and descriptive names rather than `item` or `entry`.

- **`combinedCapabilities.ts` is dead code** (no importers) and is deleted in step 5.

