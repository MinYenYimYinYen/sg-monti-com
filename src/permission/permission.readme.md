# Permissions

What a user may do is decided by **capabilities**. They are defined once, in a central tree, and the same `can` constants gate API handlers, components and nav entries. This is the convention doc. How it got here, and what is still open, is in `permissionRefactor.md`.

## Where things are

| File | Role |
|---|---|
| `groups/*.ts`, `groups/index.ts` | The tree. One file per group, each calling `defineGroup`. `index.ts` lists them in the order the admin screens show them |
| `groupTypes.ts` | `GroupDefinition`, `ResourceDefinition`, and the derived `CanOf` type |
| `defineGroup.ts` | `defineGroup` (validates one group), `listResources` (throws on a repeated group or resource key), `buildCan`, `resourceCapability` |
| `can.ts` | `export const can = buildCan(permissionGroups)`. What handlers and components import |
| `buildRegistry.ts`, `registryTypes.ts`, `capabilityRegistry.ts` | The flat and grouped list of everything grantable. Used by the admin screens, bundle and user validation, and the loaders. Not imported by handlers or components |
| `PermissionTypes.ts` | `Capability`, `CapabilityRequirement`, `Verb`, `DataSource`, `isValidKey`, `isSuperUserEffective`, and `hasCapability` (the one check, shared by server and client) |
| `evaluateCapability.ts` | The server decision (allowed, unauthenticated, forbidden), with the database reads injected |
| `logic/` | Pure functions behind the admin screens and the assignment rules |

The files in this folder are client-safe: they must not import anything server-only. The server-only parts live elsewhere: the database reads in `src/app/permission/_lib/capabilityLoaders.ts`, and the cookie and token handling in `src/app/auth/_lib/assertCapability.ts`.

## The model

```
group     what the admin screens list and assign together
  resource  one thing a capability governs, named for the data it holds
    verb      read, write or delete
```

- A capability string is `resource.verb`, for example `customers.read`. There is no group, feature, module or source segment.
- A group is for the admin UI only. It is never part of a string, so renaming or regrouping changes no stored grant and no handler.
- `name` is required on groups and resources. `description` is optional and written only where the name leaves room for confusion.
- `source` (`realGreen` or `qbo`) is metadata for a badge. It is not part of a string.
- A resource can mark verbs `public`. They resolve to `'public'` and grant nothing. No resource declares one today, but `getMine` uses the literal `'public'`.
- `'superUser'` is a requirement, not a capability. It passes only a confirmed superuser and cannot be granted, so it gates ops such as editing bundles.

## Using a capability

Handler:

```ts
import { can } from "@/permission/can";

const handlers: HandlerMap<HolidayContract> = {
  getAll: { capability: can.holidays.read, handler: async () => { /* ... */ } },
};
```

Component or nav entry:

```tsx
const allows = useSelector(userCapabilitiesSelect.allows);
const canWrite = allows(can.holidays.write);

<GatedPanel requirement={can.holidays.read}>...</GatedPanel>
```

An unknown resource, or a verb the resource does not declare, is a compile error. Never write a capability string by hand.

A screen that owns no data gates on the capability of the data it needs. The cover sheet uses `serviceEtas.read`. Do not add a resource named for a screen or feature.

## Adding or changing a resource

1. Pick the group in `groups/`, or add a group file and list it in `groups/index.ts`.
2. Add the resource with a `name`, its `verbs` (only verbs some op checks), and `source` if the data is not ours. Warnings about dangerous ops go in a code comment beside the resource.
3. Use `can.<resourceKey>.<verb>` in the handler and in components.
4. The key must be unique across the whole tree. The registry throws at load on a repeat.

**Renaming or removing a resource changes its strings.** A stored grant with the old string is dropped by `resolveEffective` and shows as stale in the editors. That is harmless while the data is dev data. Once real grants exist, a rename needs a data migration.

## Naming and shape conventions

- **A resource is a data entity**, never a feature or screen. A feature is a composition of resources.
- **Keys are globally unique.** QuickBooks entities are prefixed `qbo` (`qboCustomers`), because they are secondary views of QBO data. RealGreen is the primary system and keeps plain names. Credit card import resources are prefixed `cc`.
- **Verbs are only read, write and delete.** Ownership ("only your own template") is enforced in the handler by `saId`, not by a verb.
- **Writes to live QBO are separate resources** from the plan that precedes them and the history that follows: `journalEntryPlans` (read), `qboJournalEntries` (write), `journalEntryHistory` (read), and `ccExpensePlans` (read) with `qboExpensePostings` (write).
- **A manual sync is its own permission**, separate from access to the data it copies. `customerSync` covers the customer, program and service syncs together, because a partial sync breaks the mirror.
- **The usual line:** one `api/route.ts` per data module is one resource, and a contract file marks a sub-module. This is a convention, not a law. `realGreen/customer` is a deliberate unicorn: `customers` covers customers, programs and services, because they are one mirror pipeline.

## How a request is decided

1. `createRpcHandler` reads the op's `capability`. `capability` is required by the type, and an op that somehow lacks one is refused (403), so a gate cannot be left off.
2. `assertCapability` verifies the access cookie itself and never trusts identity headers. An invalid token on a non-public op is a 401. On a public op the request continues as anonymous.
3. `evaluateCapability` decides:
   - `'public'` allows with no database read.
   - No identity is `unauthenticated` (401).
   - A token that claims superuser triggers one confirmation read against the user document. The token claim alone is never trusted.
   - A confirmed superuser is allowed and skips the capability read. `'superUser'` skips it too.
   - Anyone else gets their effective capabilities loaded, and `hasCapability` checks for the exact string. A miss is `forbidden` (403).
4. **Matching is exact.** No hierarchy, no wildcards. `x.write` does not imply `x.read` at runtime. The companion ticking in the admin matrix is only a convenience when assigning.
5. A logged-in user with no capabilities is a **pending** user and passes nothing. There is no stored role or marker: a new user starts with nothing, and an administrator approves by assigning capabilities in Users and Bundles. A kiosk never acts as a superuser, even if the flag is set (`isSuperUserEffective`).

### The pending screen

The access token carries a `hasCapabilities` claim (`TokenPayload`), set at login from `loadHasCapabilities` (true for an effective superuser, or when `resolveEffective` returns anything). `proxy.ts` confines a user whose claim is `false` to `/auth/applied`. This is a UX gate only: the server decides every op from the database, never from the claim.

The claim is fixed when the token is issued, so it goes stale after an approval. The pending page's "check again" button runs the `recheckAccess` op, which recomputes the claim and re-issues both cookies. A fresh login does the same. A token with no `hasCapabilities` claim is treated as signed out, which forces one re-login.

"Users waiting for access" (the inbox list) is computed by `filterPendingUsers` from `logic/accessLogic.ts`: users who hold nothing, excluding kiosks and superusers. `getAssignableUsers` uses the same rule in reverse: anyone who holds any access.

The client runs the same `hasCapability` against the store's `userCapabilities.mine`. That only hides UI. The server enforces.

## A refused load (403)

**Load hooks do not take permission flags.** A hook that loads data (`useHoliday`, `useFlag`, a layout's deps hook) always fires its load. If the user lacks the read, the server answers 403 and the slice stays empty. Do not add a `canLoad` parameter, and do not build flags from `allows(can.x.read)` in a layout to skip a load. What stays gated is the page (`GatedPanel`, one primary capability per page) and the write and delete controls (`allows(can.x.write)`).

How a 403 is handled, once, centrally:

1. `assertCapability` throws the 403 with `data: { required }`, and `createRpcHandler` returns `required` in the JSON (a 403 only, never a 401). The message text is unchanged.
2. `createStandardThunk` and `createStreamThunk` (and `handleError`, for components that call `api()` directly) hand a 403 that names a capability to `reportAccessDenied` (`src/lib/errors/reportAccessDenied.ts`) instead of toasting it.
3. The collector (`accessDeniedCollector.ts`) gathers denials for 400 ms. It then shows **one** toast with a fixed id listing what was missing, using the labels from `capabilityLabel`. A later burst updates that toast instead of stacking a new one.
4. Every flush logs `console.warn("[access denied]", { missing, ops })`, including when the dispatch set `silentError: true` (a silenced denial is logged and not toasted).
5. A refused request is remembered in `ui.deniedRequests` (same `typePrefix-paramsHash` id as `lastFetched`) and is not sent again until the user's capabilities reload (`userCapabilities/getMine` or `auth/recheckAccess` fulfilled). `force: true` still bypasses it. So a user without a read sends one refused request per load, not one per visit.

The names are safe to show: the server already returns them in the 403 message and they ship in the client bundle.

## Assigning capabilities

- A user holds bundle keys plus direct capabilities. The effective list is the plain union (`resolveEffective`), de-duplicated, with strings the registry does not know dropped and missing bundles ignored.
- **No escalation:** `canAssign` lets a non-superuser hand out only what they hold. A superuser may assign anything.
- **Protected users:** only a superuser may change the capabilities of a kiosk or a superuser (`canManageCapabilitiesOf`).
- **No duplicates:** a direct grant never repeats a capability a held bundle lists. `assignBundle` and `saveBundle` strip the overlap, so removing a bundle behaves predictably.
- **Untrusted input:** `addDirect`, `addDirectMany` and `saveBundle` check every string against the registry, so a typo is rejected, not stored.
- A bundle with holders cannot be deleted.

## The admin matrix

`CapabilityMatrix` draws the registry as an accordion: one item per group (one open at a time, all collapsed at first), one column per verb (read, write, delete). Logic is in `logic/capabilityMatrix.ts` and the component is a thin wrapper.

- The group's header has one checkbox per verb. It toggles **every resource of the group that has that verb**. A partly held cell shows a minus and a click completes it. Only a fully held cell turns off.
- Opening a group lists its resources (`MatrixRow.resources`) with the same checkboxes, one capability per cell. Unchecking one resource makes the group's cell partial. Resource cells use the same columns as the group, so a verb the resource lacks is an empty slot.
- Ticking write also ticks read, and clearing read clears what depends on it. This is the built-in verb companion (`VERB_COMPANIONS`), and it works within one resource only, so the group cell and the resource cell use the same `cellChange`.
- A group or a resource shows an info popover only when it has a `description`, and the popover shows just that text.
- Resource cells are keyed with `resourceRowKey` (`group/resource`) in `cellKey`, so they cannot collide with a group row.
- The checkboxes sit beside the accordion trigger, not inside it (`AccordionTrigger`'s `trailing` prop), because a control nested in the trigger button is invalid.
- The filter is a text box and an All, Unused or Used toggle. It only chooses which groups are drawn.

**Dangerous capabilities are a grouping decision.** There is no code-level marker for a capability whose op cannot be undone. A group cell grants every member of its verb at once, so keep such a resource out of a group with ordinary access, or say so in the group's description.

## Retired

These no longer exist, and a reader of old code or history may still meet them: `createFeatureCapabilities` and the 48 `*Capabilities.ts` files, `combineCapabilities`, the feature and source segments of a capability string, `requires`, `shape`, and the `userOwned` and Any verbs.

## Checks still to write

Drift tests for the real tree: resource keys unique, every resource in exactly one group, a group key never equal to a resource key, and every resource has a name and at least one verb. The test plan is in `permissionRefactor.md`.