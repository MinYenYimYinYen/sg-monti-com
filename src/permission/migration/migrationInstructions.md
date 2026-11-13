# Capability Migration Instructions

Purpose: move every RPC route from `roles` to `capability:`, one folder at a time, without stopping for conversation. Background: `capabilityArchitecturePlan.md` (sections 0, 5b, 5c, 8b). State and progress: `fullyMigratedFolders.md`. Read that file first in every session: it holds what is done, what was decided by default, and what is deferred.

## Required reading

Read the first tier, then stop. Read from the second tier only when the folder triggers it. If a listed file has moved, search for its pattern and note the move here.

**1. Every session (about 6 files).**
- `fullyMigratedFolders.md`: what is done, decided and deferred, and the shape of a record entry.
- The `account` folder is the reference implementation: `account/accountCapabilities.ts`, `account/api/route.ts`, `account/_components/AccountMappingPanel.tsx` (`GatedPanel`), `AccountMappingRow.tsx` (`allows` on write and delete controls) and `account/useAccount.ts` (`canLoad`). Copy these patterns.
- `app/permission/_components/GatedPanel.tsx`. `allows` is `useSelector(userCapabilitiesSelect.allows)` from `app/permission/userCapabilities/userCapabilitiesSelect.ts`. It takes a capability, `'public'` or `'superUser'`, and is false until the user's capabilities have loaded.

**2. Only when the folder triggers it.**

| Trigger | Read |
|---|---|
| An op verifies the cookie itself (auth-like, `'public'`) | `auth/_lib/assertCapability.ts` and the `getMine` handler in `permission/userCapabilities/api/route.ts` |
| A screen loads another feature's data (`requires`) | `account/accountCapabilities.ts` and the `requires` type in `src/permission/PermissionTypes.ts` |
| A nav entry for the folder | `components/navBar/NavMenu.tsx` |
| A tabbed page or layout | `app/permission/layout.tsx` |
| Roles, the "applied" state, approval or password resets | `permissionPlan.md` section 6c |
| A `QboRpc` or `RealGreenRpc` route | the `qbo/account` route (done) |

**3. Do not read unless a decision is unclear.** `capabilityArchitecturePlan.md` (only sections 0.2, 5b and 5c, if at all), `evaluateCapability.ts`, `buildRegistry.ts`, `src/permission/logic/*`, `assertRole.ts`. Their behavior is already summarized here, and reading them costs more than it saves.

## How a session runs

- **Cap: 5 folders per conversation.** Count fresh each session. After the fifth, stop: update the record, give a short summary, and remind the user to run `npx tsc --noEmit` and `npx vitest run`.
- **What counts as a folder:** a top-level folder under `src/app`, taken alphabetically. Exception: `qbo` and `realGreen` (and any other top-level folder whose nested routes are clearly separate features, such as `javelin`) count each immediate sub-folder as one folder. `importCCTxn` with its `rows`, `decisions` and `post` is one.
- **Do not stop to ask.** Apply the defaults below and record what was chosen. The user reviews and tests at the end. The one exception is an irreversible op (see Rules).
- **Update `fullyMigratedFolders.md` after each folder, not at the end.** A session can end early when context fills, and an unrecorded folder is lost work.

## Terms

- **Complete:** the folder's routes use `capability:`, its declaration is registered, its write and delete controls are gated, its decisions are recorded, and every dependency it could not implement is in the deferred table.
- **Deferred dependency:** a `requires` entry or a load gate that cannot be added yet (see the readiness table). It is recorded, never dropped.

## Procedure for each folder

1. **Inventory.** Recursively list every `*Contract.ts` and `route.ts`, their ops, and each op's gate today. Read the whole folder (slice, hook, selectors, components) before judging its state. Note who outside the folder uses its hooks and selectors.
2. **Declare capabilities.** Add `<feature>Capabilities.ts` beside the folder with `createFeatureCapabilities` and register it in `src/permission/capabilityRegistry.ts` (the drift test fails if you forget). Defaults: a separate feature owned by the folder, one resource named for the data (not the structure), and one verb per op that exists (`read`, `write`, `delete`). Data that lives in QuickBooks or RealGreen carries `source: "qbo"` or `"realGreen"`. Put an op-to-capability comment at the top of the file.
3. **Migrate `route.ts` handlers.** Replace `roles` with `capability:`. `'public'` or `'superUser'` only where the plan says so. `createQboRpcHandler` and `createRealGreenRpcHandler` pass `capability` through unchanged. A GET callback that authenticates some other way (for example the QuickBooks OAuth callback) is not an RPC and gets no capability.
4. **Gate the UI by default shape.** A read gate at each entry point (page, panel, tab, nav entry): `GatedPanel` when the whole screen depends on it, or an inline note when only a section does. A disable on each write and delete control, not one gate over several. Where a component shows a control by `role`, switch it to the capability its route now needs. Pass `isGateOpen` the same shape as the route.
5. **Declare requirements and gate loads, if ready** (table below). Otherwise add a row to the deferred table.
6. **Record the folder** in `fullyMigratedFolders.md`: contracts and ops, capabilities, decisions made by default, deferred dependencies, and the screen's capability set (its own capabilities plus its `requires`).

### Scoped inventory (step 1)

Keep every search inside the folder, because repo-wide searches (`roles:`, `user`, the folder name) return truncated noise. Four checks cover it:

1. List `route.ts` and `*Contract.ts` under the folder.
2. Grep the folder for `roles:` and `role ===` or `authSelect.role`.
3. Search for the folder's hooks, selectors and components by exact name, to see who uses them outside it. Note the callers, and do not edit them (see the decision rules below).
4. Check that the screen is imported anywhere. A screen nothing mounts is likely dead code: gate it anyway, and flag it in the record.

### Decision rules

- **A hook other folders call** gets a `canLoad` flag that defaults to allowed. Add a deferred row for each outside caller, and do not edit the callers.
- **A one-time, destructive or irreversible route** gets its own capability (a singleton resource if it has no data of its own). Never share it with a read, and list it first under the folder's decisions.
- **An op that sets a role or otherwise raises someone's access** is flagged first in the record, since roles still gate unmigrated routes.
- **A folder with no routes** gets a record entry and no declaration. Say what its screens depend on.
- **A `'public'` op that verifies the cookie itself** stays `'public'`, with a comment saying why.

### Record entry shape (step 6)

Use these headings in `fullyMigratedFolders.md`, in this order, and omit any that do not apply: **Contract**, **Irreversible op (review first)**, **Capabilities** (a table of op to capability), **Done**, **Finding for review**, **Decisions made by default**, **Screen capability set**. Also add a row to the Progress table and a row to the deferred table for each dependency that was left.

## Readiness: when a dependency can be implemented

| Piece | Ready when | If not ready |
|---|---|---|
| `requires` entry | The target capability is declared and registered. Its route may still be on `roles`. | Deferred table |
| Load gate (a `canLoad` flag in a hook) | The target route has migrated to `capability:`. | Deferred table |
| Route migration, declaration, write and delete gating | Always. Never deferred. | n/a |

Why the load gate waits: gating a load by a capability the route does not check yet would block a load the server still allows by role.

`requires` lists the other features' capabilities a screen needs to load and show its data, written as their typed `can` constants (see `account/accountCapabilities.ts`). Write and delete need read automatically, so do not list those. A declared capability whose route is not migrated yet can be assigned in the admin screens but grants nothing, so say so in a comment.

## Load gating pattern

Hooks expose actions only and do not select, so the component calls `useSelector(userCapabilitiesSelect.allows)` and passes flags into the hook, as in `useAccount({ autoLoad, canLoad })` and `useImportCCTxnDeps({ canLoad })`. The hook turns each sub-hook's `autoLoad` off with `autoLoad && flag` and guards any `refresh` dispatch with the same flag. Every hook is still called on every render, in the same order. A flag defaults to allowed, so write-only callers can omit it.

## Rules

- **Irreversible ops** (a write that cannot be undone from this app, such as `createVendor`, or posting to the books) always get their own capability, never share a read's, and are listed first under the folder's decisions so the user sees them.
- **Stored grants are the whole truth.** Requirements are offered by the admin screens at assignment time and never grant anything at runtime. `write` does not grant `read`.
- **Declarations hold no data loading.** Loads stay in hooks. `requires` and a hook's flags must agree, and no test checks it. The deferred table and the final sweep cover that.
- **No `useCallback` or `useMemo`, function props end in `Action`, and no hardcoded colors.**
- **Never** run `tsc`, a full build, or a dev server. Vitest is fine. Do not remove `role`, `assertRole` or the `roles` variant of `OpGate` until the final steps below.
- Two helpers call `assertRole` directly (prepay config and stored templates). They migrate with their folder.
- A migrated screen needs a user who holds its capabilities, or the user sees "You do not have access". Test with a non-superuser, because a superuser bypasses every gate.
- `fullyMigratedFolders.md` has mixed line endings. Rewrite a section whole or append to it. Multi-line find-and-replace edits fail on it.
- **Tooling notes.** The editor tool keeps CRLF in the `.ts` and `.tsx` files, so multi-line edits there are safe. It rejects inserts over about 6,000 characters, so add long record entries in two or three chunks, anchored on the heading that follows. In PowerShell, `npx vitest` exits 1 because of stderr noise even when tests pass. Run `cmd /c "npx vitest run src/__tests__/permission 2>&1"` and read the summary line.

## Finishing the migration

1. **Work the deferred table down.** Every row whose readiness condition is now met gets implemented.
2. **Sweep for ungated loads.** Search for every hook or thunk that calls a route now on `capability:`, and check each against the deferred table and the screen's flags. Nothing automated checks this.
3. **Delete the `roles` variant of `OpGate`.** The compiler then lists every op and nav entry still on roles. Fix them all.
4. **Remove roles.** `role` on the user, token and model, `assertRole`, `x-user-role`, `src/lib/api/types/roles.ts`, the proxy's "applied" gate and the `applied` role (`capabilityArchitecturePlan.md`, 0.4 step 5). Remove the role checks left in components.
5. **Docs.** `api.readme.md`, `auth.readme.md`, the `api-route` skill and the `data-module` skill still describe `roles`.