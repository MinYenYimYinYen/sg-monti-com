# combineCapabilities: grouping capabilities for the admin screens

Code: `combineCapabilities.ts`, `mergeRecords.ts`, `buildRegistry.ts`, `capabilityRegistry.ts`. Tests: `src/__tests__/permission/combineCapabilities.test.ts`.

## Why

The admin screens (user capabilities, bundles) used to list one entry per feature declaration, about 50 of them, each named by a code key. Nobody assigning access thinks in those units. The goal is a much shorter list of **groups that make sense together** (for example RealGreen flags, RealGreen customers, pace utilities), each with a **human name** and a **description of what assigning it implies**.

The explicit, per-feature declarations stay exactly as they are. They are what routes, `GatedPanel` and `allows(...)` enforce. Groups only change what the admin sees and assigns.

## Two layers

| Layer | Owns | Used by |
|---|---|---|
| **Feature** (`createFeatureCapabilities`, one per `<feature>Capabilities.ts`) | The capability strings, the typed `can` constants, the verbs | Route handlers (`capability:`), components (`allows`), nav entries |
| **Group** (`combineCapabilities`, written in `capabilityRegistry.ts`) | A key, a name, a description, and which features belong together | Admin screens, the registry, bundles, user assignment |

A group adds no capability and does no enforcement. Removing every group would change nothing about what a route accepts.

## How it works

```ts
export const realGreenTaxAndZipCapabilities = combineCapabilities({
  key: "realGreenTaxAndZip",
  name: "RealGreen tax and zip codes",
  description: "What assigning this means, in plain words.",
  features: [taxCodeCapabilities, zipCodeCapabilities],
});
```

It takes resolved features and returns one resolved feature (`{ declaration, can, capabilities }`).

- **Resources** are merged into one object. Each key is renamed `<featureKey>_<resourceKey>` (`customer_customers`) so two features that both own a `customers` resource cannot clash. This is a real case: `quickbooks` and `customer` both have `customers` and `employees`, and `javelin` and `qboJournalEntry` both have `journalEntryPostings`.
- **`origin`** is set on every merged resource: `{ featureKey, resourceKey }`, the feature's own names. `buildCapability` builds the string from the origin when there is one, so **the string never changes**: `customer.customers.realGreen.read` stays exactly that. Stored grants, bundles and route gates keep matching. This is the invariant everything else depends on.
- **`requires`** and **`public`** are merged the same way, with their keys renamed to match.
- **`can`** is nested by the owning feature (`group.can.customer.customers.read`), not flat by resource, because a flat shape would collide on the same names. Enforcement code does not use it. It keeps importing its own feature's `can`.
- **`mergeRecords`** is the helper behind all of the above: merge two or more records, rename each one's keys, and **throw on a duplicate** instead of overwriting.
- **Groups can nest.** An existing `origin` is kept, so a group inside a group still produces the original strings. The admin sees only the outer group.

## The registry

`buildRegistry` takes groups and bare features in one list.

- `byGroup`: `{ key, name, description?, capabilities }[]` in list order. This is what the screens iterate. It replaced `byFeature`.
- `describe(capability)` returns the owning `featureKey`, `resourceKey`, `source` and `verb`, plus `groupKey` and `groupName`.
- **A bare feature is a group of one**, named by its key. That is what lets groups be written one at a time while the app keeps working.
- `allCapabilities`, `has` and `requirementsOf` are unchanged, so every logic function that takes a registry is untouched.
- Labels inside a group put the owning feature first when it differs from the group (`zipCode > zipCodes (realGreen) · read`), because two features in one group can have equally named resources.

## How to write a group

1. Choose features that someone would sensibly assign together, and name the group for what the person can do, not for the code.
2. In `capabilityRegistry.ts`, add a `combineCapabilities({ key, name, description, features })` call above `registeredFeatures`.
3. In `registeredFeatures`, **replace** the included features with the group. Leaving a feature in both places throws `Duplicate capability` when the module loads, and the drift test fails.
4. The `description` should state the implications: what the person can see or change, and what else comes with it (for example that writes reach RealGreen).
5. Run `cmd /c "npx vitest run src/__tests__/permission 2>&1"` and read the summary line.

Keys follow the usual rule: letters, digits, `_` or `-`, starting with a letter, no dots.

## Dangerous capabilities are a grouping decision

There is no code-level marker for a capability whose op cannot be undone (an `irreversible` flag was tried and removed). Those ops still have their own capability and verb, as the migration record describes, but the code does not stop you grouping them. A group cell grants every member of its verb at once, so **keep such a capability out of a group with ordinary access, or say so in the group's description**. The info popover on each row is where the person assigning sees what a group implies.

## The admin matrix

`CapabilityMatrix` (bundle editor now, user editor next) draws the registry as a table: one row per group in registry order, one column per verb (read, write, delete, then the Any verbs), a checkbox with the verb under it in each cell. No header row.

- A cell toggles **every member of the row that has that verb**. A partly held cell shows a minus and a click completes it. Only a fully held cell turns off.
- Ticking write also ticks the same capability's read, and clearing read clears what depends on it (the built-in verb companions). A declared `requires` is **not** expanded by a cell.
- The row header is the group name and an info button. The popover shows the description and the members (feature, resource, verbs). A bare feature is a row of one with the same popover.
- The filter above the table is a text box (name, description, member feature and resource keys) and an All / Unused / Used toggle. It only chooses which rows are drawn. A partly held row counts as used.
- Logic lives in `logic/capabilityMatrix.ts` (`buildMatrix`, `cellChange`, `cellState`, `planUserCell`, `matchesRowFilter`, `summarizeMembers`). The component is a thin wrapper.

## What does not change

- Route `capability:` values, `GatedPanel`, `allows`, `canLoad`, nav entries: all still use the feature's own `can` constants.
- Stored grants and bundles. No data migration is needed for grouping.
- The superuser bypass and `hasCapability`.

## Status

Done:
- `combineCapabilities`, `mergeRecords`, `origin`, `name` and `description` on declarations.
- `buildRegistry` returns `byGroup`, and `describe` returns group fields.
- `BundleEditor`, `UserCapabilityEditor` and `CapabilityGroups` show group names. The bundle editor shows the description.
- One example group: `realGreenTaxAndZip` (`taxCode` and `zipCode`).
- Tests for all of the above. The drift test reads feature keys through `origin`.

Next (owner: Luke): write the remaining groups, then review them together.

## Open intention: retire `requires`

The plan is to try groups first and, **if they work**, remove the `requires` concept. Until then `requires` still exists, is carried through a group (keys renamed), and still drives the editors' warnings.

What `requires` did: when a capability is assigned, the admin screens offered what it needs, and warned when something it needs was not held. It never granted anything at runtime.

What replaces it: assigning a group assigns everything that belongs together, so the needs are met by grouping instead of by listing them.

Before removing it, decide:

1. **Warnings.** Does anything still need a warning when a user holds only part of a group (for example through a direct grant)? If yes, the warning should compare against the group's members, not a separate `requires` list.
2. **Screens with no declaration** (`productivity`, `bizPlan`, `sanity`, `schedPromise`). They own no data, so there is no feature to put in a group. Options: a small singleton `read` feature per screen that a group can include, or leave them as notes. The nav entries still on `roles` (Productivity, Product Forecast) depend on this answer.
3. **A feature in more than one group.** Today it is rejected, because a capability string can only be listed once. If a feature is needed by several screens, it goes in a group of its own that the others sit beside, or the admin assigns two groups. Decide whether that is acceptable.
4. **Wide groups.** A group that pulls in the whole hydrated customer (flags, call logs, conditions, call-aheads) is long to assign. Decide whether to keep those as separate groups.

Removal touches: the `requires` field and its checks in `PermissionTypes.ts` and `buildRegistry.ts`, `requirementsOf` on the registry, `requirementLogic.ts`, `bundleDraft.ts`, `userCapabilitiesSelect.ts`, `BundleEditor.tsx`, `UserCapabilityEditor.tsx`, the requirement tests, the `requires` entries in about 30 declaration files, and the deferred rows in `migration/fullyMigratedFolders.md` that say "add the `requires` entries".

## Notes

- Type checking: `combineCapabilities` is generic over the list of features. If the compiler gets slow with many features, keep `declaration` loosely typed and keep the strong types on `can`.
- `CapabilityRegistry.byGroup` and `describe` changed shape. Anything outside `src/permission` and `src/app/permission` that read `byFeature` or `featureKey` from `describe` needs updating (none was found).