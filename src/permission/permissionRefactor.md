# Permission refactor: handoff

Read this first, then `AGENTS.md`. It records what was decided, what is done on disk, and what is next. The convention doc for the finished system is `permission.readme.md` in this folder.

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
- **Tests:** Luke deleted every permission test after step 5. They are rewritten from the plan below, one file at a time. The old files (and their fixtures) are in git at commit `4cbeeda0` under `src/__tests__/permission/`, useful as a reference for what was covered, but they target the old API (`createFeatureCapabilities`, `requires`, `combineCapabilities`).
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

## The core (in `src/permission/`)

| File | Role |
|---|---|
| `groupTypes.ts` | `GroupDefinition`, `ResourceDefinition` (`name`, `description?`, `source?`, `verbs`, `public?`), and the derived types `CanOf`, `GroupCapability` |
| `defineGroup.ts` | `defineGroup` (validates one group), `listResources` (throws on a repeated group or resource key), `buildCan`, `resourceCapability` |
| `registryTypes.ts` | `CapabilityRegistry`, `RegistryGroup`, `RegistryResource`, `CapabilityDescription`, `VERB_COMPANIONS` |
| `buildRegistry.ts` | `buildRegistry(groups)`: `allCapabilities`, `has`, `describe`, and `byGroup` as a tree of groups with their resources |
| `can.ts` | `export const can = buildCan(permissionGroups)`. What handlers and components import |
| `capabilityRegistry.ts` | `buildRegistry(permissionGroups)`, for the admin UI, loaders and tests |
| `PermissionTypes.ts` | `Capability` (`${string}.${Verb}`), `CapabilityRequirement`, `Verb`, `DataSource`, `isValidKey`, `isSuperUserEffective`, `hasCapability` |
| `evaluateCapability.ts` | The server decision, with the database reads injected |
| `logic/*` | Pure admin-screen and assignment logic |

`can.customers.read` resolves to the literal `"customers.read"`. An unknown resource, and a verb the resource does not declare, are both compile errors. `describe()` returns `resourceKey`, `resourceName`, `source`, `verb`, `groupKey`, `groupName`.

## Done

1. **Step 1:** `requires` deleted, with its validation, `requirementsOf`, `requirementLogic.ts`, `selectWithRequirements` and the editors' hint notices.
2. **Step 2:** new core built (table above).
3. **Step 3:** groups authored, `shape`/`userOwned` removed, regrouped to Luke's seven groups, `liveCustomers` merged.
4. **Step 4:** every consumer migrated to `can` (204 files, 489 uses) by a throwaway script. A script check found every use names a resource and verb that exist in the tree. No `can.customers` or `can.employees` is left in the QBO, account or javelin code.
5. **Step 5:** the 48 declaration files, `combineCapabilities.ts`, `combinedCapabilities.ts`, `mergeRecords.ts` and the legacy half of `PermissionTypes.ts` deleted.
6. **Docs:** `permission.readme.md` written, `combineCapabilities.md` deleted, stale capability strings fixed in `priceIncrease.readme.md` and `rcOnboarding.md`, and the permission rows removed from `src/__tests__/testing.readme.md`.

Steps 4 and 5 are committed (`e4acc80e`, `faeb6cd0`). Luke confirms whether `npx tsc --noEmit` is clean.

## Rename map, for reading old code and history

Old key (in its old declaration) to new resource key. Anything not listed kept its key.

| Old | New |
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
| `journalEntryPostings.write` (from `javelin` and `qboJournalEntry`) | `qboJournalEntries.write` |
| `expensePostings.read` / `.write` | `ccExpensePlans.read` / `qboExpensePostings.write` |
| `liveCustomers.read` | `customers.read` |

The trap that `tsc` cannot catch: the QBO `customers` and `employees` became `qboCustomers` and `qboEmployees`, while RealGreen keeps plain `customers` and `employees`. A QBO file that says `can.customers` compiles and gates on the wrong capability.

## Still to do

- **Step 6:** nested bundle and user editors. A group row expands into its resources: group controls set every constituent, and a constituent control overrides that one. `buildMatrix`, `cellChange` and `cellState` need a resource-level scope. `registry.byGroup` already carries the tree.
- **Step 7:** the drift tests (test plan, rank 9).
- **Small follow-ups:** `addDirectMany`, its route and its contract still take a list of capabilities, and the editor now sends one. In `src/app/sandbox/callLog/page.tsx`, `canLoad` and `canRefreshLive` now check the same capability (`customers.read`): decide whether to drop `canRefreshLive`.

## Test plan (ranked)

Ranked by what a wrong answer costs (access granted or denied by mistake, a bad write to stored grants) and by how much of the code is new and uncovered. Read `src/__tests__/testing.readme.md` before writing any of these. Build small test-local trees with `defineGroup` and pass them to `buildRegistry` and `buildCan`: every function takes its registry as a parameter, so the real tree is only needed for rank 9. The deleted tests are in git at `4cbeeda0` (`src/__tests__/permission/`) as a reference for what they covered, but they target the old API.

| Rank | Function | File | Why it matters, and the cases that matter |
|---|---|---|---|
| 1 | `hasCapability`, `isSuperUserEffective` | `PermissionTypes.ts` | The one check, on the server and in the client. Order is public, then no identity, then superuser, then exact match. Cases: `'public'` needs no identity. No identity is denied. An unconfirmed superuser claim does not bypass. A confirmed superuser bypasses. `'superUser'` passes only when confirmed. Matching is exact, so `x.write` does not give `x.read` and a prefix does not match. An applied user (no capabilities) passes nothing. A kiosk is never an effective superuser even with the flag set |
| 2 | `evaluateCapability` | `evaluateCapability.ts` | The server decision. Mock the two loaders with `vi.fn` and assert which reads happen. Cases: public reads nothing. No identity is `unauthenticated`. A token superuser claim triggers one confirmation read, and a failed confirmation falls through to the capability list. A confirmed superuser skips the capability read. `'superUser'` skips it too. Exact match gives `allowed`, a miss gives `forbidden` |
| 3 | `resolveEffective` | `logic/resolveEffective.ts` | Computes every user's access on every request. It drops strings the registry does not know, so a renamed resource silently revokes. Cases: union of bundles and direct grants, de-duplication, bundles first, no inference, an unknown string in a bundle and in direct grants dropped, a bundle key with no bundle ignored |
| 4 | `canAssign`, `canManageCapabilitiesOf`, `isProtectedUser` | `logic/assignmentGuards.ts` | Stops privilege escalation. Cases: a superuser may assign anything. Anyone else only what they hold, and `missing` lists the rest in order. An empty grant is allowed. Only a superuser may manage a kiosk or a superuser |
| 5 | `defineGroup`, `listResources`, `buildCan`, `resourceCapability` | `defineGroup.ts` | New in this refactor and untested. A mistake here changes every capability string. Cases: a string is exactly `resource.verb`. A public verb resolves to `'public'`. Throws on: a dotted or empty key, an empty name, no resources, a verb listed twice, `public` naming an undeclared verb, a repeated group key, a repeated resource key across groups. `listResources` keeps tree order |
| 6 | `buildRegistry` | `buildRegistry.ts` | Feeds `has`, which `resolveEffective` and every validation rely on. Cases: `allCapabilities` in tree order. `has` is false for an unknown, renamed or public string. `describe` returns resource, source, verb and group, or null. Public verbs are left out. A resource whose verbs are all public, and a group left empty, are omitted from `byGroup`. `source` and `description` appear only when set |
| 7 | `saveBundle` | `logic/bundleLogic.ts` | Writes the stored grants of every holder. Cases: an invalid key. Unknown strings are rejected, listed once, and nothing is dropped silently. Duplicates are removed and order kept. `added` and `removed` against the previous list. `holders`. `stripDirect` is the full overlap with each holder's direct grants, including a leftover duplicate |
| 8 | `assignBundle`, `removeBundle`, `addDirect`, `addDirectMany`, `removeDirect`, `bundleCapabilitiesHeld` | `logic/userCapabilityLogic.ts` | The user assignment rules. The capability argument is untrusted client input. Cases: an unknown bundle, and one already held. Assigning strips covered direct grants and reports them as `removedDirect`. `removeBundle.lost` is before minus after, so what is still held directly or through another bundle is not lost. `addDirect` refuses unknown, already direct and covered by a bundle. `addDirectMany` is all or nothing and names the refused capability. `removeDirect` works on a stale string. Nothing mutates its input |
| 9 | Drift checks on the real tree | new file | Types catch an unknown `can.x.y` but not an orphan. Cases: a group key never equals a resource key, every resource has a name and a verb, every resource is used by at least one `can.<resource>.` reference under `src` (finds dead capabilities), and no capability string literal such as `"customers.read"` appears outside `src/permission` |
| 10 | `cellChange`, `cellState`, `planUserCell`, `buildMatrix` | `logic/capabilityMatrix.ts` | Companion lookup splits a string at its last dot, and the format changed to `resource.verb`, so this needs a fresh test. Cases: ticking write adds read of the same resource only. Clearing read clears write and delete of that resource. A companion the resource does not declare is skipped. `cellState` all, some and none. `planUserCell`: members held through a bundle are locked, clearing only removes direct grants, a click the actor may not make is blocked and disabled. `buildMatrix`: column order read, write, delete, then other verbs alphabetically. Rows follow registry order, and a null cell where a group has no such verb |
| 11 | `isGateOpen` | `logic/navGate.ts` | Hides links, and the migration moved every nav entry onto it. Cases: a capability gate is closed until `mine` loads. A confirmed superuser opens it. A roles gate still works for a legacy entry. A signed-out user counts as `public` |
| 12 | The rest | `logic/*` | Low risk, cheap, and mostly display. `toUserSummary` (explicit field copy, so the password hash cannot leak, worth doing first), `sortUserSummaries`, `matchesUserSearch`, `capabilityLabel`, `groupCapabilitiesByGroup` (a stale string comes back separately), `redundantDirect`, `assignableCapabilities`, `holdersByBundleKey`, `bundleRegistryDiff`, `matchesRowFilter`, `summarizeMembers`, and the `bundleDraft.ts` edits (`toggleDraftCapability`, `setDraftCapabilities`, `applyCellChange`, `isDraftChanged`) |

**Not unit-testable without mocks, left for later:** `assertCapability` (cookie and token handling: an invalid token on a non-public op is a 401, on a public op it continues anonymous, and `forbidden` is a 403), the `capability`-or-`roles` branch in `createRpcHandler` (an op with neither must fail closed), and `capabilityLoaders` (database reads). The first two decide access too, so they are worth a mocked test once ranks 1 to 8 exist.

**Skip:** `can.ts` (derived from the tree and covered by ranks 5 and 9) and `isValidKey` (covered through rank 5).

**Type-level checks:** `expectTypeOf(can.customers.read).toEqualTypeOf<'customers.read'>()` and `// @ts-expect-error` lines for a bad resource or verb are checked by `tsc`, not by `vitest run`, unless vitest typecheck is enabled. Use the scoped type-check probe below for those.

## Working notes

- **A full `tsc` is slow** (about 4 minutes, because WebStorm's TypeScript service competes for CPU), and the shell times out at 30 seconds. Run it in the background: write a small `.cmd` in `%TEMP%` that runs `npx tsc --noEmit > out.txt` and then writes a `.done` file, start it with `Start-Process`, and poll. `AGENTS.md` says never run `tsc`. Luke asked for it explicitly during this refactor, so run it only when he asks or agrees.
- **Scoped type check** (about 25 seconds): write a throwaway `src/permission/zzTreeProbe.ts` and a `tsconfig.probe.json` that extends `./tsconfig.json` and `include`s only that file, run `npx tsc -p tsconfig.probe.json`, then delete both. Use `// @ts-expect-error` lines to assert that bad keys fail.
- **The editor tool** needs `old_text` to edit an existing file, caps input at about 6000 characters, and cannot replace a whole existing file. To overwrite a file, use PowerShell `[System.IO.File]::WriteAllText`. This file and the other new markdown files in this folder have a UTF-8 BOM and CRLF line endings. Non-ASCII characters such as the middle dot show garbled in some views; that is display only, so match text around them.
- **`tsconfig` has `noUnusedLocals: false`**, although `AGENTS.md` says it is on. Check unused imports by eye.
- **`ide_*` index tools are not available**; use file search and direct reads.
- **`AGENTS.md` conventions that matter here:** object parameters for functions with more than one argument, an `Action` suffix on function props, no hardcoded colors, no manual memoization, and descriptive names rather than `item` or `entry`.
