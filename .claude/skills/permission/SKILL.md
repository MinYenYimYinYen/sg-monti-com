---
name: permission
description: Gate a new data module, feature or screen with capabilities. Add a resource to a group, use the typed `can` constants in handlers, pages and trigger controls, add a NavMenu entry, and remind about bundles. Use when creating a data module or page that needs access control, adding a nav menu entry, or disabling a button or other trigger that calls a gated op. Changes to the permission system itself are covered in the maintenance section.
---

# Permission

What a user may do is decided by capabilities, written `resource.verb` (for example `customers.read`). They are defined once in a central tree (`src/permission/groups/`) and the typed `can` object (`@/permission/can`) is used everywhere: API handlers, pages, triggers and nav entries. Never write a capability string by hand. An unknown resource or verb is a compile error.

This skill is how to use permissions while building. The server enforces access on every op, so everything in the UI only hides or disables controls to save a refused request.

## How to use

### 1. Add the resource for a new data module

A resource is a data entity, never a feature or a screen. A feature is a composition of resources, so a screen that owns no data gates on the data it needs.

1. **Ask the user which group the new resource belongs in.** Read `src/permission/groups/index.ts` and offer the groups listed there, plus "a new group". Do not assume one.
2. Add the resource to that group's file (or a new group file, listed in `groups/index.ts`) with a `name`, the `verbs` some op actually checks (`read`, `write`, `delete`), and `source` only if the data is not ours (`realGreen` or `qbo`). The key must be unique across the whole tree, and QuickBooks entities are prefixed `qbo`.
3. Put a warning about a dangerous op in a code comment beside the resource. Leave `description` out unless the name leaves room for confusion, and let the user write it.
4. Use `can.<resource>.<verb>` as the `capability` of every op in the handler map (see the `api-route` and `data-module` skills).

### 2. Gate the page with `GatedPanel`

`GatedPanel` (`src/app/permission/_components/GatedPanel.tsx`) takes a `requirement` and renders its children only when the user passes it. While the user's capabilities load it shows a loading message, and for a user without access it shows a notice instead of the screen. It stops a screen from showing when someone opens the URL directly.

```tsx
<GatedPanel requirement={can.holidays.read}>
  <HolidayWorkspace />
</GatedPanel>
```

- One primary capability per page, usually the `read` of the page's main data. A report gates on the data it is built around.
- A simple page wraps its workspace in `page.tsx`. A tab-routed page gates once in `layout.tsx`, around `{children}` inside `PageLayout.Body`, so the header stays visible. Nest two panels only when a page truly needs two capabilities.
- Mount the component that loads data inside the gate, so its load only fires once the gate is open.
- **Load hooks take no permission flags.** Do not add a `canLoad` parameter and do not use `allows(can.x.read)` to skip a load. A refused load is handled centrally as one combined toast.

### 3. Propose disabling triggers

When it is clear that a button, menu item, checkbox, drop zone or other control calls a gated op, **propose** disabling it for users who lack that op's capability, using the same `can.<resource>.<verb>` as the handler:

```tsx
const allows = useSelector(userCapabilitiesSelect.allows);
const canWrite = allows(can.holidays.write);

<Button disabled={!canWrite} onClick={handleSave}>Save</Button>
```

- Gating every possible control is not the goal. Propose it where the link between the control and the op is obvious (Save, Delete, Import, Sync), and ask the user rather than applying it silently.
- Write controls use `write` and delete controls use `delete`. Read is the page gate's job.

### 4. Ask about the nav menu

If the feature has a page, ask the user three things, then edit `src/components/navBar/NavMenu.tsx`:

1. Should it be added to the nav menu at all?
2. Under which category? Read the file and offer its current sections, plus a new section (a new section must also be added to the `menuSections` array).
3. Which permission gates it? Suggest the `read` of the page's primary resource, normally the same one as the `GatedPanel`.

An entry is `{ title, href, capability: can.<resource>.read }`. Entries the user cannot open are hidden, and a section with no visible entries disappears.

### 5. Remind about bundles

A new resource is in no bundle, so only superusers hold it until someone assigns it. Tell the user to update any existing bundles in Users and Bundles (`/permission/users`) if they want the new capabilities included. This is a reminder for the user, not something to change in code.

## How to maintain

Changes to the permission system itself (the core in `src/permission/`, how a request is decided, the admin screens, assignment rules) are documented in `src/permission/permission.readme.md`.

**Do not consult that readme unless the task is work on the permission system itself.** Using permissions, as above, does not need it.

After any such maintenance, check this skill for drift and update it if anything it teaches has changed.