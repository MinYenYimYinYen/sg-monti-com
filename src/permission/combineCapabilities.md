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
- **`public`** is merged the same way, with its keys renamed to match.
- **`can`** is nested by the owning feature (`group.can.customer.customers.read`), not flat by resource, because a flat shape would collide on the same names. Enforcement code does not use it. It keeps importing its own feature's `can`.
- **`mergeRecords`** is the helper behind all of the above: merge two or more records, rename each one's keys, and **throw on a duplicate** instead of overwriting.
- **Groups can nest.** An existing `origin` is kept, so a group inside a group still produces the original strings. The admin sees only the outer group.

## The registry

`buildRegistry` takes groups and bare features in one list.

- `byGroup`: `{ key, name, description?, capabilities }[]` in list order. This is what the screens iterate. It replaced `byFeature`.
- `describe(capability)` returns the owning `featureKey`, `resourceKey`, `source` and `verb`, plus `groupKey` and `groupName`.
- **A bare feature is a group of one**, named by its key. That is what lets groups be written one at a time while the app keeps working.
- `allCapabilities` and `has` are unchanged, so every logic function that takes a registry is untouched.
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
- Ticking write also ticks the same capability's read, and clearing read clears what depends on it (the built-in verb companions, within one resource).
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

## Retired: `requires`

The `requires` concept is gone. It let a declaration list other features' capabilities that a screen also needed, so the admin screens could offer them and warn when one was missing. It never granted anything at runtime. Grouping replaces it: assigning a group assigns what belongs together.

What went with it: the `requires` field and its checks, `requirementsOf` on the registry, `requirementLogic.ts`, the editors' "also add what this needs" option and the hint notices, and every `*Capabilities.ts` import of another feature. The built-in verb companions stay (ticking write ticks read), but only within one resource.

Still open when the groups are written: screens that own no data (`productivity`, `bizPlan`, `sanity`, `schedPromise`) have no declaration to put in a group, and a feature can sit in only one group.

## Notes

- Type checking: `combineCapabilities` is generic over the list of features. If the compiler gets slow with many features, keep `declaration` loosely typed and keep the strong types on `can`.
- `CapabilityRegistry.byGroup` and `describe` changed shape. Anything outside `src/permission` and `src/app/permission` that read `byFeature` or `featureKey` from `describe` needs updating (none was found).