# Capability Architecture Plan

Status: the check, the registry, both data modules, user creation and the admin UI are built. What remains is putting real features on top of it (declarations, bundles, route migration) and then removing roles. **Start at section 0.** This document continues `permissionPlan.md`. Where the two disagree, this document wins, and the superseded sections there are marked.

## 0. Resume here

### 0.1 Where things stand

Last verified: `npx tsc --noEmit` reports 0 errors and `npx vitest run` passes 1015 tests in 77 files. None of the routes, models, slices or screens has been run against the database or in a browser.

**Built**
- **The check:** `hasCapability`, `isSuperUserEffective`, `createFeatureCapabilities` (`PermissionTypes.ts`), `evaluateCapability` (pure, loaders injected) and `assertCapability` (cookie and Mongo wrapper).
- **Registry:** `buildRegistry`, `capabilityRegistry.ts` (holds `capabilityManagement` only), and the drift test.
- **Pure logic** in `src/permission/logic/`: `resolveEffective`, `userCapabilityLogic`, `bundleLogic`, `assignmentGuards`, `capabilitySelectorLogic`, `bundleDraft`, `userSummary`, `capabilityLabels`, `navGate`.
- **Data modules** in `src/app/permission/`: `capabilityBundle` and `userCapabilities` (types, model, contract, route, slice, selectors, hook), the loaders in `_lib/capabilityLoaders.ts`, and `usePermissionDeps`. Both reducers are in the store.
- **Auth layer:** the token carries `userName`, old tokens are refused (one forced re-login), lookups use `userName`, `saId` is required, `isSuperUser` and `isKiosk` exist (optional), `checkAuth` no longer returns the password hash, usernames are validated and regex-escaped.
- **`createUser` op** (superuser only) and the `resolvePasswordReset` guard. See `permissionPlan.md` section 6c.
- **Gate:** `OpGate` (`roles` or `capability`) in `rpcUtils.ts`, `createRpcHandler` calling `assertCapability` or `assertRole`, and the `'superUser'` requirement.
- **Admin UI** at `/permission` (Users and Bundles tabs, Create User dialog), a "Permissions" nav entry, and `getMine` loaded at login.

**Not built:** real feature declarations, the real bundles, the role-to-bundle migration, route migration, removing roles, the docs listed in section 7, and `<Can>`.

### 0.2 Decisions made since this document was first written

- **Capability semantics everywhere:** `hasCapability`, `CapabilityRequirement`, `evaluateCapability`, `assertCapability`, and `capability:` on handlers. `'public'` and `'superUser'` are the only non-capability requirement values.
- **`AuthIdentity` was dropped as a duplicate of `User`.** `TokenPayload` is a `Pick<User, ...>` (still including `role`) and is the server's verified identity. The client passes the `User` from the store.
- **`'superUser'` requirement:** passes only a confirmed superuser (database, not the token claim) and cannot be granted. It gates bundle edits and `createUser`.
- **`capability:` is optional on `OpGate` only until the migration is done.** The end state is that every RPC contract declares its capability and the role concept is gone. Deleting the `roles` variant of `OpGate` is the completeness check, because the compiler then lists every op and nav entry not yet migrated. Until then backward compatibility stays, so master's behavior does not change.
- **No hierarchy between capabilities.** `x.write` does not grant `x.read`. Nothing is implied or expanded, and redundancy is exact string containment. `findMissingCompanions` only warns.
- **Bundles are data, users reference them, and only a superuser edits bundles.** Saving a bundle removes newly covered direct grants from its holders. A non-superuser can only assign capabilities they hold (`canAssign`). Only a superuser may change a kiosk or superuser (`canManageCapabilitiesOf`) or reset their password (`canResetPasswordOf`).
- **Layout:** pure logic in `src/permission/` (client-safe, no `src/app` imports). Data modules under `src/app/permission/`, because Next serves `route.ts` only from `src/app`. The permission module's own declaration is under `src/app`, so the drift test finds it.
- **Terminology:** "account" means the QBO and RealGreen accounting accounts in this app. A person who logs in is a **user**.
- **Create User is a dialog on the Users tab**, not its own tab. It reads `auth.createUserStatus`, not the thunk result.
- **Nav entries carry an `OpGate`** (`roles` or `capability`), so they migrate together with their routes.
- **`<Can>` is not a page-permission mechanism.** It would hide a button by capability, which is UX only, so it is built only when a feature needs it. Page permissions are still out of scope. The server is the gate.
- **The drift test scans the disk**, not `import.meta.glob`, because Vitest reuses a cached transform of an unchanged test file.

### 0.3 First thing when we come back: a manual pass

Nothing built here has run against real data. Before adding features on top, walk through it once. If something fails, bring the exact error text.

1. **Make a superuser.** In Compass set `isSuperUser: true` on your user, then log out and in (old tokens lack the claim). Confirm the "Permissions" menu entry appears.
2. **Create `superLuke`** from Users, Create User: `isKiosk` off, role `admin`, a made-up `saId`. **The made-up `saId` check is unconfirmed against live RealGreen.** The code accepts a `404` or an empty answer as "no such employee" and refuses anything else, and the error says exactly what RealGreen returned. If a genuinely unknown id is refused, send me that message and `judgeBogusSaId` (in `userCreation.ts`) gets a one-line change.
3. **Give `superLuke` a password:** forgot-password, then resolve the reset from the admin inbox as a superuser. Set `isSuperUser` on `superLuke` in Compass.
4. **Bundles:** create a bundle (only the three `capabilityManagement` capabilities exist to pick from), save it, edit it, confirm the save preview.
5. **Assign** the bundle to a user, check the "everything this user can do" list, then remove it and check the preview of what is lost. Try a direct capability, including one a held bundle already lists.
6. **Check `getMine`:** log in as that user and confirm the resolved list loads. Log out and in as someone else and confirm the previous user's list is gone.
7. **Check what must be refused:** a non-superuser cannot reach Bundles or Create User, cannot assign a capability they do not hold, and cannot edit a kiosk or superuser. An admin cannot resolve a reset for a superuser.
8. **Open a screen's URL directly** as a user who lacks the capability (for example `/permission/bundles` as a non-superuser) and confirm "You do not have access".

Known rough edges to look for: `GatedPanel` shows "Loading your permissions..." forever if `getMine` fails, and `createRpcHandler` refuses (does not crash on) an op that declares neither `roles` nor `capability`.

### 0.4 What to do next, in order

1. **Real feature declarations (build step 8, first half).** Pick one feature, add `<feature>Capabilities.ts` beside it with `createFeatureCapabilities`, register it in `capabilityRegistry.ts`, and migrate that feature's routes from `roles` to `capability:`. Use the `custFlag` example from `permissionPlan.md` as the model: a RealGreen-sourced `custFlags` collection with `read` and `write`. Ask which feature goes first. One feature end to end proves the pattern before the other 70 or so routes.
2. **Real bundles.** Once a feature has declarations, create `baseline`, `office`, `tech` and `admin` in the UI from the capabilities that exist.
3. **The role-to-bundle migration.** A script that adds `userCapabilities` documents (bundle keys per role) and never touches `role`. It must be idempotent and must not do anything master can see (see 6a in `permissionPlan.md`). `applied` users get no document.
4. **Migrate the remaining routes**, feature by feature, along with their nav entries. The two `isCurrentUserAdmin` helpers (prepay config and stored templates) call `assertRole` directly and need their own migration, as do the routes that read `x-user-id`.
5. **Remove roles.** Delete the `roles` variant of `OpGate`, fix every compiler error, then remove `role` from the user, token and model, `assertRole`, `x-user-role`, `roles.ts`, the proxy's "applied" gate, and the `applied` role. This is last, after the merge is stable.
6. **Docs.** `api.readme.md`, `auth.readme.md`, the `api-route` skill and the `data-module` skill still describe `roles`. Update them as routes move.
7. **Optional:** a `<Can>` component, when a feature needs to hide a button.

### 0.5 Required reading to get context fast

Read in this order, and stop when you have enough.

1. This section (0), then `permissionPlan.md` sections 3, 4, 6a and 6c. Section 6a (branch safety) matters most: the dev database is the production database, so keep `role` on every user and run no destructive migrations before the merge.
2. **The check:** `src/permission/PermissionTypes.ts`, then `src/permission/evaluateCapability.ts` and `src/app/auth/_lib/assertCapability.ts`.
3. **The gate:** `src/lib/api/types/rpcUtils.ts` (`OpGate`, `HandlerMap`) and `src/lib/api/createRpcHandler.ts`.
4. **A finished capability-gated route:** `src/app/permission/capabilityBundle/api/route.ts` (uses `can.bundles.read` and `'superUser'`) and `src/app/permission/capabilityManagementCapabilities.ts`.
5. **Registry:** `src/permission/buildRegistry.ts` and `src/permission/capabilityRegistry.ts`.
6. **Pure logic:** the file list in 0.1. Skim `src/permission/logic/userCapabilityLogic.ts` and `bundleLogic.ts`.
7. **Auth:** `src/app/auth/_lib/tokenUtils.ts`, `userCreation.ts`, `userValidation.ts`, and the `createUser` and `resolvePasswordReset` handlers in `src/app/auth/api/route.ts`.
8. **Tests:** `src/__tests__/testing.readme.md` (lists every test file), plus `src/__tests__/permission/permissionFixtures.ts` and `logicFixtures.ts` for the test-local registries.
9. **UI:** `src/app/permission/layout.tsx`, then `_components/UserCapabilityEditor.tsx` and `BundleEditor.tsx`.
10. **Project rules:** `AGENTS.md` and the `data-module`, `api-route`, `tab-routed-page`, `ui-styling` and `write-tests` skills. Do not run `tsc` or start a dev server on your own; say what to run instead.

### 0.6 Gotchas learned the hard way

- **"Account" is accounting.** Use "user" for a person who logs in, and stay out of `src/app/account`, `qbo` and `realGreen` when renaming.
- **The IDE can lag the code.** A TS2769 error on `userCapabilitiesSlice.ts` (an `addCase` overload) showed in the editor while `npx tsc --noEmit` reported 0 errors, and it cleared once the IDE caught up. Trust `tsc`. If one persists, check that a thunk with no params uses `{}`.
- **Windows file edits.** These files use CRLF. A PowerShell here-string treats a backtick as an escape, which corrupted a comment in `NavMenu.tsx` (caught by `tsc`). Prefer the patch or editor tool, and run `tsc` after a scripted edit.
- **Multi-hunk patches can leave a file half-edited** (this broke `useAuth.ts` once). Re-read the file after a multi-hunk edit.
- **Vitest caches an unchanged test file's transform,** so anything that depends on the files on disk must read the disk at run time (the drift test does).
- **Keep `src/permission` free of `src/app` imports** other than the type-only `User` import. That keeps client bundles and tests clean.
- **No `useCallback` or `useMemo`, function props end in `Action`, and no hardcoded colors.** The admin UI was checked against all three.

## 1. Decisions

| Decision | Detail |
|---|---|
| Bundles are data | A `capabilityBundle` data module. A bundle is a named list of capabilities (`baseline`, `office`, `tech`, `admin`). Only a superuser edits bundles. |
| Users reference bundles | A user holds bundle keys plus optional direct (custom) capabilities. Bundles are not copied onto the user. |
| No hierarchy | `x.write` does not grant `x.read`. The runtime check stays a plain set lookup (`hasCapability`). Nothing anywhere expands or infers capabilities. |
| Resolve is a plain union | A user's effective capabilities are the union of their bundles' capabilities and their direct capabilities, de-duplicated. Nothing is added. |
| Stored exactly as picked | Bundles and user documents store exactly what the admin chose. There is no expanded form, so the stored list is the whole truth. |
| Roles are not runtime checks | A bundle is only a list. There is no "is admin" check and no bypass. The only bypass is the confirmed superuser. |

A user holding `x.write` without `x.read` is allowed. They pass write ops and fail read ops.

### Why reference and not copy

| | Copy on apply | Reference (chosen) |
|---|---|---|
| Edit a bundle | Existing users unchanged | Every holder changes immediately |
| A new feature lands | Edit the bundle, then re-apply to every user | Edit the bundle once |
| A new `userOwned` resource needs the baseline grants | One-time backfill for every user | Add it to `baseline` once |
| "What does Dana have?" | A flat list, source unknown | Bundle keys plus extras |

Costs: one bundle edit changes access for everyone holding it (hence superuser-only editing and a preview), a bundle in use cannot be deleted, and a request needs a second read (the user's document, then their bundles).

## 2. The capability registry

One file imports every feature's declaration, the way `combineReducers` imports every slice.

- **Location:** `src/permission/capabilityRegistry.ts`.
- **Declarations stay beside their feature** in `<feature>Capabilities.ts`, the same naming as `featureSlice.ts`. Each exports the result of `createFeatureCapabilities`.
- **`buildRegistry(declarations)`** is a pure function. It rejects duplicate feature keys and duplicate capability strings (this closes the "duplicate feature keys" open item in `permissionPlan.md`). It returns:
  - `allCapabilities`: every grantable capability string. Public verbs are excluded, since they grant nothing.
  - `has(capability)`: the unknown-string filter.
  - `describe(capability)`: `{ featureKey, resourceKey, source?, verb }`, or null.
  - `byFeature`: the capabilities grouped for the admin UI.
- **Compile-time union:** a type of every registered capability string, built by distributing `FeatureCapability` over the declarations. Code that names a capability gets autocomplete. Stored data is plain strings, because it can be stale.
- **Dependency direction:** handlers and components import only their own feature's `can` constants. Only the admin UI, the loaders and the tests import the registry. The registry imports only declarations, so client bundles stay small.
- **Drift guard:** a test scans `src/app` on disk for `*Capabilities.ts` files, imports each, and asserts that every exported declaration appears in the registry (and that no registered feature lacks a declaration file). A feature cannot go missing silently, and there is no manual checklist. It scans the disk rather than using `import.meta.glob`, because Vitest reuses a cached transform of an unchanged test file and the glob missed newly added files. Declarations owned by the permission module itself (under `src/permission`) are listed in `permissionOwnedKeys` in the test.
- **Key format:** `createFeatureCapabilities` rejects feature and resource keys that are not plain identifiers (letters, digits, `_`, `-`, starting with a letter), so a dot can never corrupt the capability format. `buildCapability` is exported so the registry and `createFeatureCapabilities` build strings the same way.
- **Testability:** every function takes the registry as a parameter. Tests build a registry from test-local declarations. The real registry is passed only at the edge (loaders, routes, hooks).

The registry holds only the permission module's own `capabilityManagement` feature until real features declare theirs. That does not block anything: every module below is built and tested against test-local registries.

## 3. Data shapes

### Capability bundle

`CapabilityBundleDoc = CreatedUpdated & { bundleKey: string; name: string; description?: string; capabilities: Capability[] }`

- `bundleKey` is the natural key (`office`, `tech`, `admin`, `baseline`). It is immutable. `name` is the display label.
- Bundles are flat. A bundle cannot include another bundle, which rules out cycles. A user holds several (for example `baseline` plus `office`).
- A bundle that any user holds cannot be deleted.
- Saving validates every string against the registry. Unknown strings are rejected on save.

### User capabilities

`UserCapabilitiesDoc = CreatedUpdated & { userName: string; bundleKeys: string[]; capabilities: Capability[] }`

- One document per user, keyed by `userName`, in its own collection apart from the credentials document. A user with no document has no capabilities.
- `capabilities` holds the direct (custom) grants. The name stays short because it is the user's own list.
- Replaced the old `UserCapabilities` type in `PermissionTypes.ts`, which was removed.
- Loading drops unknown capability strings (renamed or removed). A bundle key with no matching bundle is ignored.
- The client receives the resolved flat list at login and session restore, for `<Can>`. The client never sees bundles. Only the admin UI reads them.

## 4. Overlap rules

The invariant: **a direct capability never duplicates a capability the user's bundles list literally.** It exists so that removing a bundle behaves predictably. A direct grant that quietly duplicated a bundle grant would survive the bundle's removal, and the admin would think the access was gone.

The invariant is never relied on to grant or deny access. Resolve always takes the plain union.

Redundancy is exact string containment. If `baseline` lists `x.write` and the user has a direct `x.read`, the `x.read` is not redundant and stays.

| Situation | What happens |
|---|---|
| Assign a bundle to a user who already holds some of its capabilities directly | The covered direct grants are removed in the same operation. The UI previews it: "Assigning baseline removes direct grants x and y, which it already covers." |
| Remove a bundle from a user | Nothing else changes. The preview shows exactly what the user loses (effective before minus effective after). |
| Add a direct capability the user already has through a bundle | Refused. |
| Add a direct capability that is not in the registry | Refused. |
| A superuser saves a bundle that now covers some holders' direct grants | The save removes those direct grants from every holder, in the same operation. The superuser sees the count first. |

## 5. Pure functions

Every function is pure and takes the registry (and bundles) as parameters. All of them are testable with no database, store or React.

| Function | Covers |
|---|---|
| `buildRegistry` | Duplicate keys and strings, `has`, `describe`, grouping, public verbs excluded |
| `resolveEffective({ bundleKeys, direct, bundles, registry })` | Union, de-duplication, unknown strings dropped, a missing bundle key ignored |
| `assignBundle` | Returns the new `{ bundleKeys, direct }` plus `removedDirect` |
| `removeBundle` | Returns what the user loses, for the confirmation UI |
| `addDirect` | Refuses a capability already effective through a bundle, and unknown strings |
| `saveBundle` | Validates against the registry, and reports which holders' direct grants become redundant |
| `findMissingCompanions` | Optional and warn-only. Reports that a list has `x.write` without `x.read`, and similar. It never blocks and never adds anything. |
| `canAssign` | A non-superuser can only assign capabilities they hold |

Selectors built on them:

- `assignableCapabilities`: the registry's capabilities minus the user's effective set. This is what limits custom additions to the ones not yet held.
- `redundantDirect`: direct grants that a held bundle already lists.
- `bundlesInUse`: which bundles any user holds.
- Bundle versus registry diff: what a bundle lacks and which of its strings are stale.

## 5a. Layout

- **Pure logic** lives in `src/permission/` (client-safe, no server imports, tested with test-local registries). The logic for the two data modules goes in `src/permission/logic/`. It defines small structural types such as `BundleLike`, which the module `Doc` types satisfy, so `src/permission` never imports from `src/app`.
- **Data modules** live in `src/app/permission/capabilityBundle/` and `src/app/permission/userCapabilities/`, each with its types, model, contract, route, slice, selectors and hook. They sit under `src/app` because Next serves `route.ts` only from there. This is a deliberate departure from a business-logic module.
- **The permission module's own declaration** is `src/app/permission/capabilityManagementCapabilities.ts`. Under `src/app`, the drift test finds it, so `permissionOwnedKeys` stays empty.
- **Server-only code** (the Mongo loader, the routes) stays with the modules.

## 5b. Gating and the migration to capabilities

Until every route has moved, both gates coexist.

- **`OpGate`** (in `rpcUtils.ts`): an op declares either `roles` (legacy) or `capability`, never both and never neither. `createRpcHandler` calls `assertCapability` when `capability` is set and `assertRole` otherwise. A handler with neither fails closed.
- **Backward compatibility stays until the role concept is gone.** Master's behavior does not change, and routes migrate one at a time.
- **End state:** every RPC contract declares its capabilities and the role concept is gone entirely. The last migration step deletes the `roles` variant of `OpGate`, which makes `capability` required.
- **Why that is the completeness check:** a search can miss a route, a type error cannot. Once `roles` is removed from `OpGate`, the compiler lists every op that has not been migrated, so the migration cannot be declared done while one is left.
- **Role removal list** (all part of that last step): `role` on the user, token and model, `assertRole`, the `x-user-role` header, `src/lib/api/types/roles.ts`, the proxy's "applied" gate and the `applied` role itself. The two `isCurrentUserAdmin` helpers that call `assertRole` (prepay config and stored templates) also need their own migration.

### The `'superUser'` requirement

`CapabilityRequirement` is `Capability | 'public' | 'superUser'`. `'superUser'` passes only a confirmed superuser, and it is not a capability, so it can never be granted. It gates superuser-only ops, such as editing bundles. Because of it, `bundles` declares only `read`, and nobody can be given bundle-edit rights by a mistaken grant. `evaluateCapability` skips the capabilities read for it.

## 6. Who may do what

| Action | Who |
|---|---|
| Edit bundle contents | Superuser only, through the `'superUser'` requirement (not a capability) |
| Assign bundles and direct capabilities | An admin-level capability, enforced by `canAssign`: a non-superuser can only assign capabilities they hold themselves |
| Edit the capabilities (or bundles) of a kiosk or superuser | Superuser only, as in `permissionPlan.md` |

The two new modules are the first capability-native routes (see 5b), so they do not use `roles`. The `capabilityManagement` declaration is done (`src/app/permission/capabilityManagementCapabilities.ts`) and is the registry's first real entry: `bundles.read`, `userCapabilities.read` and `userCapabilities.write`. The superuser rule for kiosk and superuser targets is enforced in the handler by reading the target's user document.

`getMine` is a `public` op that verifies the access cookie itself, the way `checkAuth` does, so an applied user (no capabilities) is not refused. It returns the resolved flat list, and the client clears it on logout.

## 7. Build order

This replaces the implementation order in `permissionPlan.md` section 6. Steps 1 and 2 of that list are done.

1. **Registry (done):** `buildRegistry.ts`, `capabilityRegistry.ts` (holds `capabilityManagement` only), the drift test, and tests with test-local declarations.
2. **Pure capability logic (done):** the functions in section 5, in `src/permission/logic/`, fully tested (`resolveEffective`, `userCapabilityLogic`, `bundleLogic`, `assignmentGuards`, `capabilitySelectorLogic`).
3. **`capabilityBundle` module (done):** types, model, contract, route, slice, selectors, hook. `upsert` and `remove` are `'superUser'`; `getAll` is `bundles.read`.
4. **`userCapabilities` module (done):** types, model, contract, route, slice, selectors, hook. Assignment ops are `userCapabilities.write` and enforce `canAssign` and `canManageCapabilitiesOf` in the handler.
5. **Real loader wired into `assertCapability` (done)**, in `src/app/permission/_lib/capabilityLoaders.ts`. The `capabilityManagement` declaration, the `'superUser'` requirement and the optional `capability:` gate are done. `getMine` is wired into `AuthInitializer`, so `userCapabilities.mine` holds the signed-in user's resolved list (cleared on logout). No `<Can>` component exists yet.
6. **Superuser-only create-user op (done)** and the `resolvePasswordReset` guard (done). See `permissionPlan.md` section 6c.
7. **Admin UI (done):** see 8b.
8. **Real feature declarations, the real bundle definitions, and the migration** from each user's `role` to a bundle key. **Next.** See 0.4.
9. **Route migration** from `roles` to `capability:` (old step 5), then retire `assertRole`, `x-user-role` and `roles.ts`. See 0.4.
10. **Docs:** `api.readme.md`, `auth.readme.md`, the `api-route` skill and the `data-module` skill.

## 8. Migration and branch safety

The branch rules in `permissionPlan.md` section 6a still apply.

- The migration only inserts `userCapabilities` documents (bundle keys per role) and bundle documents. It never touches `role`, so master is unaffected.
- It is idempotent. Master keeps changing roles through `approveUser` until the merge, so it is re-run on merge day.
- `applied` users get no document.
- Until step 7, bundles have no effect on runtime: routes still check roles.
- Bundles start nearly empty and fill as features declare capabilities.

## 8b. Admin UI (as built)

- **Terminology:** "account" means the QBO and RealGreen accounting accounts in this app, so a person who logs in is always a **user** (`createUser`, `USER_ROLES`, `userValidation.ts`, `userCreation.ts`).
- **Screens:** a tab-routed page at `/permission` (`layout.tsx` calls `usePermissionDeps`, the only place it is called). `/permission/users` and `/permission/bundles`. The root redirects to Users.
  - **Users:** a searchable list of everyone, with kind tags (Superuser, Kiosk, No access), and an editor for one user. It assigns and removes bundles (with a preview of what is lost, or which direct grants are absorbed), adds and removes direct capabilities (only ones not already held, and only ones the caller holds themselves), and shows warn-only hints, drift, and everything the user can do.
  - **Create User** is a dialog on the Users tab, shown to a confirmed superuser only. It reads `auth.createUserStatus`, not the thunk result.
  - **Bundles** (superuser): a list with capability and holder counts, and an editor with a registry-grouped checklist. The save preview runs `saveBundle`, the same function the server runs. Delete is refused while anyone holds the bundle. Stale strings are shown and removed by unchecking.
- **`listUsers`** (`userCapabilities.read`): returns `UserSummary` (an explicit field copy, never the document), so users with no capabilities document appear.
- **Gating is UX only.** `isGateOpen` (pure, `src/permission/logic/navGate.ts`) takes the same gate shape as an RPC op. `GatedPanel` keeps a screen from showing when its URL is opened directly, and the nav entry and tabs are filtered by it. The server enforces access whatever the UI shows.
- **Nav menu:** entries now carry an `OpGate` (`roles` or `capability`), so they migrate with their routes, and removing `roles` from `OpGate` flags any left behind. A new "Permissions" section is gated by `userCapabilities.read`.
- **`<Can>`:** not built. It was never a page-permission mechanism. It would be a small client component that hides a button by capability, which is a UX nicety. Build it when a feature needs it.
- **Page permissions** are still out of scope. Nav filtering above is the only page-level gating, and it reuses the same declarations.

## 8a. Known limits of what is built

- **Two collections, no transaction.** A bundle `upsert` saves the bundle, then strips newly covered direct grants from holders. If a strip fails, a harmless duplicate remains (access is always the plain union), `redundantDirectByUserName` shows it, and saving the bundle again repairs it. Two admins assigning to the same user at once can overwrite each other (last write wins). Acceptable for a small admin group; revisit if that changes.
- **Routes, models, slices and loaders are not unit tested**, per `testing.readme.md`. They are thin wrappers around the tested pure functions and are checked by lint and the type check. The first real run needs a manual pass: save a bundle, assign it, and confirm `getMine`.
- **Nothing consumes `capability:` on real feature routes yet.** Only the two permission routes use it, so runtime access is unchanged for every other route.
- **The admin UI is built (8b) but has never been run in a browser.** Components are checked only by the type check and lint, and the first pass needs a manual walk-through. `<Can>` does not exist.
- **`GatedPanel` waits for `getMine`.** If that request fails, the screens show "Loading your permissions..." until the next page load.
- **`createRpcHandler` fails closed** when an op declares neither `roles` nor `capability`.

## 9. Open items

- **`findMissingCompanions` is warn-only.** This was proposed and not explicitly confirmed. Change it if you want a stricter rule.
- **Capability management feature shape (decided):** `bundles` declares only `read` (edits are `'superUser'`), and `userCapabilities` declares `read` and `write`. Revisit if a non-superuser should ever be allowed to edit bundles.
- **Bundle delete rule:** "cannot delete a bundle in use" is assumed. A forced delete that detaches holders is possible later.
- **Registry union type cost:** if distributing the union over many features slows the compiler, fall back to plain `Capability` strings.
- **The live RealGreen answer for an unknown employee id** is unconfirmed (see 0.3, step 2).
- **Concurrent edits:** two admins assigning to the same user at once can overwrite each other (last write wins). Acceptable for a small admin group.
- **A user with no capabilities document is treated as having none.** There is no "applied" marker. Whether the proxy's "applied" page should eventually be driven by "holds no capabilities" instead of the `applied` role is undecided, and only matters once roles are removed.
- **`<Can>`:** build when a feature first needs to hide a button.
- **Which feature declares capabilities first** (0.4, step 1). Not chosen.