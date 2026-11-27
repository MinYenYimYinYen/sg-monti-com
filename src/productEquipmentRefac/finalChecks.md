# Final checks

Confirm the finished refactor did not break related features. Tick as you go.
Full state and decisions are in `05_FullStateSandboxSetup.md`. The run order for the sync is in
`implementationSteps/step7_RenameProductsUsedRunbook.md`.

## Before you start
- [x] Dev server restarted, `.env.local` pointing at the sandbox.
- [x] A full sync has been run on the sandbox (`/syncUtils`). Until then every screen that loads
  completed services fails, which is expected and not a bug.

## Products
- [ ] The footer has only the "Application Methods" badge, and it opens.
- [ ] Masters tab: the list shows only a "Sub: n" badge per master (no "Pkg").
- [ ] A master opens on the "Sub-Products" tab. Add a sub, change its rate, Save, reselect the
  master: the change stuck. No "Mixed By" checkboxes.
- [ ] Attributes tab: category and unit still show and save.

## Application methods
- [ ] Create form: no "Tracks Tank Level" box; Needs Water reads "(mix chart includes water by
  default)". Save a new method.
- [ ] Open an existing method: it loads into the editor.
- [ ] Delete a throwaway method: a plain confirm ("This permanently removes the application
  method."), and it is gone afterwards.

## Mix chart
- [ ] Pick a saved method: the title fills in. Edit the title, pick another method: the title
  resets to that method's default. Reset leaves the title alone.
- [ ] "Include Water" ticked with a method picked: the Gallons / Fl Oz toggle appears and
  switches the units.
- [ ] Add a master product: its sub-product rates are the ones saved on the master.
- [ ] Both PDF layouts print with the title.

## Service codes
- [ ] The ServCode editor lists rules as "All", "LTE n" and "GT n". Add and remove a rule.

## Cover sheets
- [ ] List view: all three views open. "Products" is an empty placeholder, not an error.
- [ ] PDF for a date generates, columns line up where the product text used to be, and the
  history section lists products used on past services (and on pest history, if any).

## bizPlan
- [ ] Products page: planned, actual and mixed views all load.
- [ ] No water row with placeholder text. Numbers changed for masters that had a default
  package (accepted).
- [ ] Expand a product: the breakdown by service code shows.

## Monthly Inventory
- [ ] The Select Products sheet has four tabs and opens on "Last Check" (no "By Date").
- [ ] No "Planned:" or "Recorded:" lines under products.
- [ ] Enter a count, save, open history: it shows.

## Productivity
- [ ] The productivity pages load completed services, with no errors.

## Navigation and permissions
- [ ] No "Loadout" menu entry. A pasted old loadout URL gives a 404.
- [ ] After production deploy: the permission editors list `loadouts.*`, `equipmentDefinitions.*`,
  `equipmentPackages.*` and `masterEquipmentPackages.write` as grants to clean up. Remove them
  from users and bundles (`/permission/users`).

## After the production deploy and full sync
- [ ] bizPlan Products (actual and mixed), the cover sheet PDF history and productivity all load
  on production.

## Collections to drop
Do this last, after steps 2 and 4 are deployed to production. The old code still reads them.
- [ ] Fresh backup first (`backup.ps1`).
- [ ] Drop `loadoutdocs`.
- [ ] Drop `equipment`.
- [ ] Drop `equipmentpackages`.

Leftover fields on kept collections (`productdocprops`, `appmethods`) are left alone on purpose.
