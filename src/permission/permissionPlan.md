# Permission Plan

Status: design agreed. The types, the check, `assertCapability` and the auth-layer changes exist (see 6b). Every RPC route still uses roles.

**Continued in `capabilityArchitecturePlan.md`** (registry, capability bundles, per-user capabilities, new build order). **Start at its section 0, "Resume here"**: it has the current status, the decisions made since, a manual test pass, what to do next, and the reading list. Where the two disagree, that document wins. Sections it supersedes are marked **Superseded** below.

This document records the decisions from the planning sessions and what each one implies. Update it as decisions change.

## 1. Vocabulary

| Term | Meaning |
|---|---|
| Capability | A stored, server-side grant on a user, e.g. `custFlag.custFlags.realGreen.write`. |
| Feature capabilities | One declaration per feature of the resources it owns. Everything else is derived from it. |
| Capability requirement | What an RPC op (or `<Can>`) requires: a capability string, or `'public'` for ops that need none. Handlers declare it as `capability:`. |
| Applied user | Logged in, holds no capabilities. There is no marker for this state. |
| Superuser | A site admin user, not a business user. Bypasses capability checks. |
| Kiosk | A shared-device user with a bogus `saId`. Flagged `isKiosk` on the user document. |

Roles are gone. **Superseded wording:** presets are now data bundles (admin, office, tech, baseline) that users *reference*, not lists copied onto the user when assigned. See `capabilityArchitecturePlan.md`. They are never checked at runtime, so there is no admin bypass.

## 2. Capabilities

### Format

- Native data: `feature.resource.verb`, e.g. `widgetManagement.widgets.write`.
- External data: `feature.resource.source.verb`, e.g. `custFlag.custFlags.realGreen.write`.
- Keys are dot-free identifiers. Dots would corrupt the three-segment format.

### Verbs

- `read`, `write` (covers create and update), `delete`.
- `readAny`, `writeAny`, `deleteAny` exist only on `userOwned` resources, for other users' data.
- There is no fourth "run" verb. A non-CRUD op is modeled as a `write` on a suitable resource. If an op has no natural resource, add the resource.

### Resource shapes and sources

`shape` (how data is stored) and `source` (where it lives) are separate axes.

| Shape | Verbs allowed | Source |
|---|---|---|
| `collection` | read, write, delete | native, realGreen, qbo |
| `singleton` (global settings) | read, write | native, realGreen, qbo |
| `userOwned` (per-user config) | read, write, delete, readAny, writeAny, deleteAny | native only |

### Decisions

- **`verbs` is required and non-empty on every resource.** The declaration is the whole truth. A reader should never need the types file to know what exists. List only verbs that some op actually checks.
- **User-owned own-data access is a real capability** (`read`, `write`, `delete`), not an implicit rule. One mechanism for everything, and a user's access to their own config can be revoked. A baseline preset grants these to every approved user, and a new user-owned resource needs a one-time backfill.
- **A feature declares only the resources it owns.** The widget feature declares widgets and preferences. Customers and global settings belong to their own features and are gated by their own capabilities.
- **Each feature's route returns only its own data.** The client dispatches to each feature and selectors join the results, so a joined view is gated automatically. A handler must never return data owned by another feature's resource. If one ever has to, it must require both capabilities.
- **`public` is an optional map on the declaration**, keyed by resource, listing verbs that need no login. A public verb resolves to the literal `'public'` in `can` and grants nothing, so it never appears in the capability list.
- **Nesting has no effect on capabilities.** Capabilities follow data, not folders. A nested folder declares its own capabilities only if it owns data. Otherwise it imports the parent's constants (the child imports from the parent, never the reverse).
- **A resource that has both a Mongo mirror and a live RealGreen source needs two resource keys** (e.g. `customers` and `liveCustomers`). `can` is keyed by resource key, and the source is not part of it.

### Assignment-time rules

**Superseded:** there is no hierarchy between capabilities. The runtime check is a plain set lookup, and nothing is implied or added at assignment or resolve time. `x.write` does not grant `x.read`. The old implication rules (write and delete imply read, and so on) are dropped. At most, an editor may show a warn-only note when a list has `x.write` without `x.read` (`findMissingCompanions` in `capabilityArchitecturePlan.md`).

Still open from this section:

- A feature may later declare capabilities from other features that its users need (e.g. pace users need customer read). This is an assignment convenience and not a security mechanism, because every route enforces its own rules.
- Unknown capability strings (renamed or removed) are dropped when loading a user.

## 3. The access check

`hasCapability` in `PermissionTypes.ts` is a pure function shared by the server and `<Can>`. In order:

1. `'public'` passes.
2. No identity (not logged in) fails.
3. A confirmed superuser passes.
4. Otherwise the op's capability must be in the user's capability list.

An applied user has an empty list, so they pass only public ops.

### User-owned scoping

A user-owned `read` op requires `preferences.read`. The handler then checks whether the user also holds `readAny` to decide whether to return only their own data or everyone's. The handler needs the loaded capabilities (or a small helper) for this.

## 4. Identity, superusers and kiosks

### Identity

- **Lookups use `userName`.** The token carries `userName`, `saId`, `isSuperUser` and `mustChangePassword`.
- **Ownership of stored data stays on `saId`.** Form templates, prepay config, quickSend templates, QBO and similar features keep using it.
- **Every user has a unique, required `saId`.** Real employees get theirs from RealGreen at registration. Superuser and kiosk users get a bogus one, entered when the user is created. Business features never check whether an `saId` exists.
- A bogus `saId` must not belong to a real RealGreen employee. The creating op can look it up and reject it if a real employee exists. How `rgApi` reports an unknown employee (null or thrown error) is not yet confirmed.

### Capabilities are not tokenized

Tokens carry identity only. The handler loads the user's capabilities on each non-public request. This avoids revocation lag, token size limits, and stale strings after a capability is renamed.

### Capability storage

**Superseded shape:** a `userCapabilities` data module is still a separate collection keyed by `userName`, apart from the credentials document, and a user with no document still has no capabilities. But each document is now `{ userName, bundleKeys, capabilities }` (bundle references plus direct grants), and the loader resolves the effective flat list at request time. See `capabilityArchitecturePlan.md` section 3. The client receives its own resolved capabilities at login and session restore, for `<Can>`.

### Superuser

- **`isSuperUser` is set in Compass only.** No app route can write it. Nothing in the app creates a superuser.
- **The token claim is only a hint.** When it is set, the server reads the user document and the document decides. Removing the flag in Compass takes effect on the next request. The user needs a fresh login after the flag is added, because old tokens lack the claim.
- **The check runs just before the capability check**, server-side.
- **Create and edit rules:** only a superuser can create a kiosk user, and only a superuser can edit the capabilities of a kiosk or superuser.

### Kiosk

- There is no kiosk concept in feature declarations. A kiosk is an ordinary user whose capabilities a superuser keeps small.
- **`isKiosk` is a boolean on the user document**, set only by the superuser-only create op. It is not in the token. It is read from the database in two guards only: editing a kiosk's capabilities, and resetting a kiosk's password. Business features never see it.
- A kiosk can never act as a superuser. The superuser check already reads the document, so it also refuses when `isKiosk` is set.
- There is no code guard against giving a kiosk write access. This is a deliberate decision and it relies on the superuser not doing so.
- Each kiosk has its own capability document. There is no shared kiosk document.
- The superuser enters the kiosk's email. `UserModel.email` is unique and the format validator rejects `+`, so each kiosk needs a distinct address. Nothing sends email, so it only has to satisfy the schema. The op should turn a duplicate-key error into a readable message.

### Bootstrap

1. In Compass, set `isSuperUser` on your current user and log in again.
2. Use the superuser-only create op to make a kiosk-style user such as `superLuke`, with a bogus `saId`.
3. In Compass, set `isSuperUser` on `superLuke` and remove it from your own user.
4. Log in as `superLuke` for administration, and use your normal user to test the app, so permission bugs are not hidden by the bypass.

The new user has no password at first. It uses the forgot-password flow: request a reset, and another superuser or admin resolves it with a temporary password. The user is then forced to change it.

### Forgot-password flow

Checked against the code. `requestPasswordReset` needs only an existing user with that `userName`. `resolvePasswordReset` sets a temporary password and `mustChangePassword`. Nothing in the flow requires a real `saId`. The user document still needs a valid unique `email`, `firstName`, `lastName` and `password` (a non-hash placeholder is safe, because an undefined hash makes `bcrypt.compare` throw). `role` is required by the schema today and goes away with roles.

## 5. Findings from the current code

These are facts about the existing system that shaped the decisions.

- **`saId` is enforced only at registration.** `UserModel.saId` is `default: null, unique: true`. Nothing re-checks it afterwards.
- **Tokens carry `saId`, and lookups use it.** `checkAuth`, `changePassword`, `confirmPassword` and others call `findOne({ saId })`. A null `saId` would match any user with a null value. The switch to `userName` lookups and a required `saId` removes this.
- **`x-user-role` can probably be spoofed.** `assertRole` prefers the header over verifying the cookie, and the proxy copies incoming headers without removing a client-sent one. Not tested. It goes away with `assertRole`, and the new access check must verify the cookie itself and never trust identity headers.
- **Tokens last up to 7 days.** `refresh` rebuilds the access token from the refresh token with no database check. Hence the superuser claim is confirmed against the database.
- **`resolvePasswordReset` only requires the admin role.** Any admin can reset any user, including a superuser, which would defeat the Compass-only rule. It must refuse a superuser or kiosk target unless the caller is a superuser.
- **`login` and `requestPasswordReset` build a regex from raw `userName`.** The input should be escaped. This is a separate small fix.
- **Routes that read `x-user-id`** (form templates, prepay config and upsell priorities, quickSend templates, QBO connection, import and journal settle) will need to take identity from the verified token. The list comes from a search capped at 100 results and may be incomplete.

## 6. Implementation order

**Superseded from step 3 onward** by the build order in `capabilityArchitecturePlan.md` section 7 (registry and pure logic first, then the `capabilityBundle` and `userCapabilities` modules). Steps 1 and 2 below are done. The original list is kept for reference.

1. `PermissionTypes.ts` (done): types, `createFeatureCapabilities`, `hasCapability`, `isSuperUserEffective`. The example declarations were removed. Tests with test-local declarations are in `src/__tests__/permission/`. `isSuperUser?` and `isKiosk?` are added to the `User` type and `UserModel` as optional fields (no defaults, absent means false).
2. Auth layer: add `isSuperUser`, `isKiosk` and a required `saId` to the `User` type and model, switch token payload and lookups to `userName`, and add `assertCapability`. Existing sessions get one forced re-login after deploy. **Done**, see 6b.
3. `userCapabilities` data module: model, route, slice and selectors.
4. Superuser-only create-user op, and the `resolvePasswordReset` guard. **Done**, see 6c.
5. Migrate routes from `roles` to `capability` (`HandlerMap` in `rpcUtils.ts`, `createRpcHandler` calling `assertCapability`), then retire `assertRole`, `x-user-role` and `src/lib/api/types/roles.ts`.
6. A feature registry listing every feature's capabilities, for the admin UI and the unknown-string filter.
7. Presets, the assignment-time expansion function, and the migration that maps existing users' roles to capabilities.
8. Update `api.readme.md`, `auth.readme.md` and the `api-route` skill. They still describe roles.

## 6a. Branch safety (shared database)

This work lives on a branch and is not merged to master until complete. The dev database is the production database, so master and the branch read and write the same data. Master keeps running its own code, so it is unaffected as long as the branch only makes additive changes to the database.

### Why it holds

- **Tokens:** master issues tokens with only `saId`. The branch adds `userName` and other claims. Master ignores extra claims, so a branch token still works on master. Other users never run branch code, so they are unaffected. A master-issued token fails the branch's `userName` lookup, so the one person testing on the branch needs a fresh login.
- **Database:** `isSuperUser`, `isKiosk` and the new `userCapabilities` collection are additive. Master's code never reads them.

### Rules until merge

1. **Keep `role` on every user document and keep it required in the schema.** This includes users the branch creates (`superLuke`, kiosks) and the tester's own user. Master requires and checks it.
2. **No destructive migrations before merge.** Nothing that drops or renames `role`, rewrites `saId` in a way master cannot read, or drops indexes. The roles-to-capabilities migration only adds `userCapabilities` documents and leaves `role` alone. Remove roles in a cleanup after the merge is stable.
3. **Users created on the branch are visible to master**, including its admin UI. Kiosk and superuser users have bogus `saId` values. Anything on master that keys off `saId` (for example RealGreen employee lookups) may show them as unknown employees. This is cosmetic.
4. **Required `saId` is a model-level change**, so it affects branch saves only. Before merge, confirm no user has a null `saId`.
5. **No index creation or dropping on `users`** from the branch. Indexes on new collections are fine.
6. **Preview deployments** that use production env vars share the database and the JWT secret, so tokens are interchangeable across deployments.

### Merge day

Deploy the code and the capability migration together. Without the migration every non-superuser becomes an applied user with no access. Everyone gets one forced re-login, because old tokens lack `userName`. Then remove `role` in a later cleanup.

## 6c. User creation and the reset guard (as built)

- **`createUser` op** (`AuthContract`, `/auth/api`): gated by the `'superUser'` requirement, so only a confirmed superuser (database, not the token claim) can call it. It makes the bootstrap user (`superLuke`) and kiosk users. The caller supplies `userName`, `email`, `firstName`, `lastName`, `saId`, `role` and `isKiosk`. `role` is still required by the model until roles are retired.
- **Validation** (`userValidation.ts`, pure): every field is checked for type as well as content, because the body is untrusted JSON. `saId` is limited to letters, digits, `.`, `_` and `-` (1 to 32, not only dots) because it is placed in a RealGreen URL path. Extra fields are ignored, so `isSuperUser` and `password` cannot be set through this op. `isSuperUser` is never written by the app.
- **The made-up `saId` must not belong to a real employee** (`judgeBogusSaId`, pure). **How `rgApi` reports an unknown employee is still unconfirmed against the live API.** The code treats a `404` from RealGreen (`EXTERNAL_ERROR`, status 404) and an empty answer as "no such employee", and anything else (network failure, 401, 500, an unrecognized status) as a refusal, so it fails closed. If a real unknown id is refused, the error message says exactly what RealGreen returned; adjust `judgeBogusSaId` then. This is the first thing to check when creating `superLuke`.
- **No password at first.** The user is stored with `NO_PASSWORD_PLACEHOLDER`, which is not a bcrypt hash: `bcrypt.compare` answers false for any input (verified against the real library in a test) and does not throw. The user signs in through forgot-password: request a reset, and a superuser resolves it with a temporary password.
- **`resolvePasswordReset` guard:** it still requires the `admin` role, and now also refuses a kiosk or superuser target unless the caller is a confirmed superuser (`canResetPasswordOf`). Without it any admin could take over a superuser, which would defeat the Compass-only rule. Note that a superuser needs the `admin` role until roles are retired, or `resolvePasswordReset` (still role-gated) will refuse them.
- **Duplicates:** username and `saId` are checked case-insensitively before creating, and a MongoDB duplicate-key error (for example on the unique `email`) is turned into a readable message.
- **Both new kinds of user are visible to master**, including its admin UI (see 6a, rule 3).
- **No UI yet.** `useAuth().createUser` and the thunk exist. Until a screen exists, call the op from a script or the browser console.

## 6b. Step 2 as built

- **Token:** `{ role, saId, userName, mustChangePassword, isSuperUser? }`. `role` stays until roles are retired (see 6a). `buildTokenPayload` and `tokenPayloadFromUser` in `tokenUtils.ts` are the only places a payload is built. A kiosk never gets the `isSuperUser` hint.
- **Old tokens:** a token without `userName` is refused by `verifyAccessToken` and `verifyRefreshToken`, and treated as signed out by the proxy. That is the one forced re-login.
- **Lookups:** `checkAuth`, `confirmPassword`, `changePassword` and `assertCurrentUserPassword` use `userName`. `register` and `checkEligibility` keep `saId`, because registration is where `saId` is verified.
- **Capability check:** `evaluateCapability` (pure, loaders injected) and `assertCapability` (cookie and Mongo wrapper, never reads identity headers). Not wired into `createRpcHandler` yet. The capability loader is a placeholder returning nothing until step 3.
- **Types:** `AuthIdentity` was dropped as a duplicate of `User`. `TokenPayload` is a `Pick<User, ...>` (including `role` until step 5) and is the server's verified identity. The client passes the `User` from the store to `<Can>`. `isSuperUserEffective` is the one rule for when the superuser bypass applies (flag set and not a kiosk), used by the token builder, `assertCapability` and `<Can>`.
- **Naming:** capability semantics throughout: `hasCapability`, `CapabilityRequirement`, `evaluateCapability`, `assertCapability`, and `capability:` on handlers (step 5). `'public'` is the one non-capability value a requirement can take.
- **Model:** `saId` is required (no default). `role` stays required.
- **Usernames:** new registrations must match `[A-Za-z0-9._-]{3,32}`, checked on the client and the server. Existing names are not re-validated. Lookups by name escape regex characters and stay case-insensitive.
- **Register** builds the user from explicit fields, so a client cannot set `isSuperUser` or `isKiosk`.
- **checkAuth** no longer returns the password hash.

## 7. Open items

- **Page permissions are out of scope for now.** Data is gated on the server, so a page that shows ungated data is not risky. They can be added later by extending the same declarations.
- **`anyOf` and `allOf` were removed.** Each op needs one capability. Re-add them if an op ever needs more.
- **The mirror versus live question for customers.** The customer feature has a Mongo mirror and a live RealGreen pipeline. Whether an op that picks between them by the PIPELINE flag needs a flag-dependent rule has not been checked against `customer.readme.md`.
- **Whether `hasCapability` should live in `PermissionTypes.ts`.** The file now has runtime code. Splitting it (types, `createFeatureCapabilities`, `hasCapability`) is optional. It has no imports, so client bundles are unaffected.
- **Type inference is covered by `expectTypeOf` tests** in `createFeatureCapabilities.test.ts` (literal strings, `'public'` resolution, undeclared verbs absent). Vitest does not enforce them at runtime, so they are only verified by `npx tsc --noEmit`. Run it once to confirm.
- **Duplicate feature keys** are rejected by `buildRegistry` (see `capabilityArchitecturePlan.md` section 2).