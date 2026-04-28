# QuickSend Refactor

## What Was Great About QuickSend v1

- **Tiptap mention system:** The `@variable` insertion UX — namespace drill-down, inline
  suggestion list, mention nodes rendered as styled chips — is solid and worth carrying
  forward unchanged.
- **Multi-section templates:** Multiple independent template sections per stored template
  is a good foundation for complex call scripts.
- **Redux pipeline:** The `createStandardThunk` / selector / `uiSlice` loading-state
  pattern is clean. The stored-template CRUD (save, load, delete) works well.
- **`resolveHtml` approach:** Regex-based mention span replacement is simple, fast, and
  easy to extend.
- **Pricing utilities:** `ProgCodeUtils`, `computeProgChooserPricing`, and the
  `ServCodeCheckboxList` / `PrepaySelector` UI components are all reusable.
- **`progChooserPricing.ts`:** The per-program pricing computation (servCode scoping,
  price overrides, prepay, tax) is correct and well-tested by use.

---

## Where Tension Arose

### 1. Dual Program Systems

QuickSend v1 has two parallel ways to reference program data in a template:

| System | Mention | Selection time | Persistence |
|---|---|---|---|
| `@program` | `@program.{alias}.{prop}` | Author time | Persisted in `StoredTemplateDoc` |
| `@progChooser` | `@p.{prop}` (loop) | Call time | Runtime only |

These solve the same problem differently. The resolver, the controls, and the state shape
all have to handle both paths. The two systems cannot be composed — a template uses one
or the other.

### 2. `@progChooser` as Both Flat Trigger and Namespace

The flat `@progChooser` mention (which activates the ProgChooser control panel) and the
aggregate namespace `@progChooser.total` conflict in the suggestion system. A mention ID
cannot be both a leaf (inserted on select) and a namespace prefix (drills into Level 1).
This was the immediate blocker that prompted the refactor.

### 3. Runtime-Only State Cannot Produce "Ready to Use" Templates

Because `progChooser` selections are not persisted, a template author cannot pre-configure
programs. Every call requires the user to re-select programs from scratch. This defeats
the purpose of a stored template for common call scenarios.

### 4. `@program` Alias Rigidity

The alias system (`MLC`, `MLC_2`) is a workaround for referencing the same progCode
multiple times. It works but is opaque — the alias is an internal key, not a user-facing
label, and the `_N` suffix convention is fragile.

---

## New Architecture (QuickSend2)

### Core Concept

**Programs are always the central entity.** The template author selects programs and
configures them (servCodes, price overrides, prepay). Those selections are persisted as
the template's default. At call time, the user can override selections, servCodes, and
prices. The template is always "ready to use" out of the box.

The program panel is always present — it is not gated behind a mention. The left panel
always shows: customer lookup, size, tax rate, global prepay, and the program list.

### Mention System

| Mention | Type | Description |
|---|---|---|
| `@loop.{prop}` | Loop variable | Any `<p>` or `<tr>` containing a `@loop.*` mention is cloned once per selected program at preview time. |
| `@{progCodeId}.{prop}` | Program-specific | Direct reference to a specific selected program. Only available in suggestions if that progCode is currently selected. |
| `@totals.{prop}` | Aggregate | Sum of that field across all selected programs. Can appear anywhere in the template. |
| `@name`, `@size`, `@taxRate`, `@season`, `@sgBillpayInfo`, `@aux` | Flat vars | Unchanged from v1. |

#### `@loop.{prop}` props
`description`, `servCount`, `servPrice`, `subTotal`, `prepayDiscAmt`, `taxAmt`, `total`,
`prefPrice`, `econPrice`, `prepayPercent`

#### `@{progCodeId}.{prop}` props
Same as loop props, plus `servTable` (block mention — renders an HTML table of servCodes
and prices). `servTable` is intentionally excluded from `@loop` because a table-within-a-
looped-row is not a useful layout.

#### `@totals.{prop}` props
`subTotal`, `prepayDiscAmt`, `taxAmt`, `total`

### Persistence Model

`StoredTemplateDoc` stores the full program configuration:
```ts
type ProgramConfig = {
  progCodeId: string;
  includedServCodeIds: string[];
  priceOverride: number | null;
  prepayId: string | null;
};

type StoredTemplateDoc = {
  // ... sections, name, groupId, etc.
  programConfigs: ProgramConfig[];  // persisted default selections
  globalPrepayId: string | null;    // persisted global prepay default
};
```

At call time, the user can modify any of these — those modifications are runtime-only
and are not saved back unless the user explicitly saves.

### Type Naming

Types in `quickSend2/` use the same names as their v1 counterparts (e.g. `ProgramConfig`,
`StoredTemplateDoc`, `Section`). The import path (`@/app/quickSend2/...`) is the
distinguishing factor. No `QS2` prefix is used — v1 will be deleted once the new
implementation is working.

---

## Implementation Phases

---

### Phase 1 — Types, State Shape, and Slice

**Goal:** Define the complete type system and Redux slice for QuickSend2. No UI yet.

#### Types (`QuickSendTypes.ts`)
```ts
type ProgramConfig = {
  progCodeId: string;
  includedServCodeIds: string[];
  priceOverride: number | null;
  prepayId: string | null;
};

type Section = {
  sectionId: string;
  templateHtml: string;
};

type CustomerState = {
  custId: number | null;
  customer: Customer | null;
  nameOverride: string;
  sizeOverride: string;
  taxRateZipOverride: string | null;
};

type RuntimeOverrides = {
  /** Per-program call-time overrides. Key is progCodeId. */
  programConfigs: Partial<Record<string, Partial<ProgramConfig>>>;
  /** undefined = use persisted default; null = explicitly cleared */
  globalPrepayId: string | null | undefined;
};

type QuickSendState = {
  sections: Section[];
  activeSectionId: string;
  programConfigs: ProgramConfig[];   // persisted defaults (loaded from template)
  runtimeOverrides: RuntimeOverrides;
  globalPrepayId: string | null;     // persisted default
  auxValues: Record<string, string>;
  customer: CustomerState;
  loadedTemplateId: string | null;
  loadedTemplateName: string | null;
  loadedTemplateGroupId: string | null;
  loadedTemplateSaId: string | null;
};
```

#### Actions
- `loadTemplate(doc)` — loads persisted state; clears runtime overrides
- `clearTemplate()` — resets to blank state
- `setTemplateHtml({ sectionId, html })`
- `addSection()` / `removeSection(sectionId)` / `reorderSections({ fromIndex, toIndex })`
- `setActiveSection(sectionId)`
- `setCustId(custId)` / `setCustomer(customer)` / `setNameOverride` / `setSizeOverride` / `setTaxRateZipOverride` / `clearCustomer`
- `setAuxValue({ id, value })`
- `addProgramConfig(progCodeId)` — adds with all non-service-call servCodes included; no-op if already present
- `removeProgramConfig(progCodeId)` — only callable when progCode is not pinned by a direct mention
- `setIncludedServCodeIds({ progCodeId, servCodeIds })` — writes to runtime override
- `setPriceOverride({ progCodeId, price })` / `clearPriceOverride(progCodeId)` — runtime override
- `setProgramPrepayId({ progCodeId, prepayId })` — runtime override
- `setGlobalPrepayId(prepayId)` — runtime override
- `reorderProgramConfigs({ fromIndex, toIndex })`

#### Selectors (`quickSendSelect.ts`)
- `selectEffectiveProgramConfigs` — merges persisted `programConfigs` with
  `runtimeOverrides.programConfigs` to produce the effective config for each program
- `selectEffectiveGlobalPrepayId` — `runtimeOverrides.globalPrepayId ?? state.globalPrepayId`
- `selectEffectiveTaxRate` — same logic as v1
- `selectSizeNum` — `parseFloat(sizeOverride)`, returns `null` if invalid

---

### Phase 2 — Pricing Selectors

**Goal:** Compute resolved `ProgramVariables` for all selected programs. This is the
authoritative pricing layer — all preview resolution and UI display consume from here.

#### Selectors (`quickSendSelect.ts`, continued)
- `selectProgramVariables` — for each effective program config, computes:
  - `progCodeId`, `description`, `servCount`
  - `prefPrice`, `econPrice`, `servPrice` (effective: override ?? chart)
  - `subTotal`, `prepayDiscAmt`, `taxAmt`, `total`
  - `prepayPercent` (from per-program prepayId, falling back to global prepayId)
  - `servTable: { description, price }[]`
  - Uses `computeProgramPricing` (copied from v1's `computeProgChooserPricing`)
- `selectProgramVariableMap` — `Map<progCodeId, ProgramVariables>` for O(1) lookup
- `selectAggregates` — sums `subTotal`, `prepayDiscAmt`, `taxAmt`, `total` across all programs

---

### Phase 3 — Mention System

**Goal:** Build the Tiptap suggestion config for the new mention namespace.

#### Mention IDs
- Flat: `name`, `size`, `taxRate`, `season`, `sgBillpayInfo`, `aux`, `aux_2`, …
- Loop: `loop.description`, `loop.servCount`, `loop.servPrice`, `loop.subTotal`,
  `loop.prepayDiscAmt`, `loop.taxAmt`, `loop.total`, `loop.prefPrice`, `loop.econPrice`,
  `loop.prepayPercent`
- Program-specific: `{progCodeId}.description`, `{progCodeId}.servPrice`, …,
  `{progCodeId}.servTable`
- Aggregates: `totals.subTotal`, `totals.prepayDiscAmt`, `totals.taxAmt`, `totals.total`

#### Suggestion levels
- **Level 0:** flat vars + aux + `loop →` (namespace) + `totals →` (namespace) +
  one namespace item per currently-selected progCode
- **Level 1 off `loop`:** loop props
- **Level 1 off `totals`:** aggregate props
- **Level 1 off `{progCodeId}`:** program-specific props (including `servTable`)

#### Key differences from v1
- No `@program` namespace. No alias system.
- ProgCode IDs are used directly as namespace prefixes.
- The suggestion list for program namespaces is filtered to currently-selected programs only.
- `loop` and `totals` are reserved namespace names and cannot be used as progCode IDs
  (enforce at the suggestion layer; document as a constraint).

---

### Phase 4 — Preview Resolver

**Goal:** Implement `resolveHtml` — the full mention-to-value replacement pipeline.

#### Resolution order
1. Flat vars (`@name`, `@size`, `@taxRate`, `@season`, `@sgBillpayInfo`, `@aux.*`)
2. Program-specific mentions (`@{progCodeId}.{prop}`) — resolved from `selectProgramVariableMap`
3. Loop expansion (`@loop.*`) — same paragraph/row cloning logic as v1
4. Aggregate mentions (`@totals.{prop}`) — resolved from `selectAggregates`

#### Selectors (`quickSendSelect.ts`, continued)
- `selectPreviewHtml` — active section preview
- `selectAllPreviewHtmls` — all sections preview (for stacked preview pane)

Both consume `selectProgramVariables`, `selectProgramVariableMap`, and `selectAggregates`
as inputs.

---

### Phase 5 — Stored Template CRUD

**Goal:** Persist and load QuickSend2 templates. New Mongoose model and API route.

#### `StoredTemplateDoc`
```ts
type StoredTemplateDoc = {
  templateId: string;
  saId: string;
  name: string;
  groupId: string | null;
  sections: Section[];
  programConfigs: ProgramConfig[];
  globalPrepayId: string | null;
};
```

#### Files
- `StoredTemplateTypes.ts`
- `StoredTemplateModel.ts`
- `storedTemplateSlice.ts`
- `storedTemplateSelect.ts`
- `useStoredTemplates.ts`
- `api/route.ts` — `getTemplates`, `saveTemplate`, `deleteTemplate`

---

### Phase 6 — UI: Program Panel

**Goal:** Build the left-panel program management UI. This is the core UX of QuickSend2.

#### Pinned Programs (Option A — prevent invalid state)

A selector `selectPinnedProgCodeIds` scans `selectAllSectionsHtml` for
`data-id="{progCodeId}.*"` mention patterns and returns the set of progCodeIds that are
directly referenced by name in the template. The program panel uses this set to:
- Disable the remove button on pinned program rows
- Show a lock indicator so the author understands why removal is blocked

Programs only referenced via `@loop.*` are freely removable — removing them simply
renders fewer loop rows.

#### Components
- `ProgramPanel` — top-level left panel. Always visible. Contains:
  - `GlobalPrepaySelector` — sets `globalPrepayId`
  - `ProgramList` — list of selected programs with add/remove/reorder
  - `ProgramRow` — one row per selected program, expandable accordion; remove button
    disabled when program is pinned
  - `ProgramRowConfig` — expanded view: servCode checkboxes, price override input,
    per-program prepay override
- `ServCodeCheckboxList` — copied from v1
- `PrepaySelector` — copied from v1

#### Selectors (`quickSendSelect.ts`, continued)
- `selectPinnedProgCodeIds` — set of progCodeIds referenced by direct `@{progCodeId}.*`
  mentions anywhere in the template HTML

---

### Phase 7 — UI: Editor and Preview

**Goal:** Wire up the Tiptap editor, preview pane, and top-level page.

#### Components
- `QuickSendEditor` — Tiptap editor with the new mention suggestion config
- `QuickSendPreview` — renders `selectPreviewHtml` as sanitized HTML
- `QuickSendPage` — top-level layout: left panel (customer + program panel) + editor + preview
- `CustomerPanel` — customer lookup, name/size/taxRate overrides (same as v1)

---

### Phase 8 — Template Management UI

**Goal:** Template save/load/delete UI. Mirrors v1's stored template UI.

#### Components
- `TemplateManager` — list of saved templates, load/delete actions
- `SaveDialog` — name + group input, save button

---

### Testing

#### Template Authoring

- [ ] **Flat mentions** — type `@` and verify the suggestion list shows `name`, `size`,
  `taxRate`, `season`, `sgBillpayInfo`, `aux`. Insert each and confirm the chip renders.
- [ ] **Aux slots** — insert `@aux`. Type `@` again and confirm `aux_2` now appears (the
  next available slot). Insert `@aux_2`. Confirm both chips are present.
- [ ] **Loop namespace drill-down** — type `@loop.` and confirm the suggestion list shows
  all loop props (`description`, `servCount`, `servPrice`, `subTotal`, `prepayDiscAmt`,
  `taxAmt`, `total`, `prefPrice`, `econPrice`, `prepayPercent`). Insert `@loop.description`
  and `@loop.servPrice` on the same paragraph.
- [ ] **Loop in a table row** — insert a table, place `@loop.description` and
  `@loop.total` in the same `<tr>`. Confirm the preview clones the row once per selected
  program.
- [ ] **`servTable` only on direct program mention** — type `@{progCodeId}.` and confirm
  `servTable` appears in the suggestion list. Type `@loop.` and confirm `servTable` does
  NOT appear.
- [ ] **Program-specific namespace** — add a program in the left panel, then type
  `@{progCodeId}.` and confirm the suggestion list appears. Remove the program and confirm
  the namespace no longer appears in suggestions.
- [ ] **Totals namespace** — type `@totals.` and confirm `subTotal`, `prepayDiscAmt`,
  `taxAmt`, `total` appear. Insert `@totals.total` outside the loop paragraph and confirm
  it resolves to the sum across all selected programs.
- [ ] **Pinned program** — insert `@{progCodeId}.servPrice` for a specific program.
  Confirm the remove button on that program row is disabled. Delete the mention from the
  template and confirm the remove button re-enables.
- [ ] **Multiple sections** — add a second section tab. Confirm each section has its own
  independent editor. Confirm the preview shows the active section's resolved HTML.
- [ ] **Toolbar formatting** — apply bold, italic, heading, bullet list, ordered list,
  blockquote. Confirm they render in both editor and preview.
- [ ] **Table toolbar** — insert a table, add/remove rows and columns, delete the table.
  Confirm all toolbar buttons work.
- [ ] **Line height and paragraph spacing** — change line height and paragraph spacing
  dropdowns. Confirm the editor content reflects the change.

#### Pricing and Preview

- [ ] **No programs selected** — with no programs in the panel, confirm `@loop.*`
  paragraphs render as `{{no programs selected}}` (red highlight) in the preview.
- [ ] **Single program, no overrides** — add one program, select all servCodes. Confirm
  `@loop.servPrice` resolves to the chart price and `@totals.total` matches.
- [ ] **ServCode deselection** — uncheck one or more servCodes in the expanded program
  row. Confirm `@loop.servPrice` and `@loop.subTotal` update in the preview.
- [ ] **Price override** — enter a price override for a program. Confirm `@loop.servPrice`
  reflects the override and `@loop.subTotal` / `@loop.total` recompute accordingly.
- [ ] **Per-program prepay** — set a per-program prepay on one program. Confirm
  `@loop.prepayDiscAmt` and `@loop.total` update for that program only.
- [ ] **Global prepay** — set a global prepay. Confirm all programs without a per-program
  override pick up the global rate.
- [ ] **Per-program prepay overrides global** — set both a global prepay and a different
  per-program prepay on one program. Confirm the per-program rate wins for that program.
- [ ] **Tax rate from customer** — look up a customer. Confirm `@taxRate` resolves to the
  customer's tax rate and `@loop.taxAmt` / `@loop.total` reflect it.
- [ ] **Tax rate zip override** — select a different zip code in the tax rate dropdown.
  Confirm `@taxRate` and all tax-dependent fields update.
- [ ] **`@totals.*` aggregates** — select 3 programs. Confirm `@totals.total` equals the
  sum of the three `@loop.total` values.
- [ ] **Unfulfilled mentions** — leave `@name` empty. Confirm it renders as
  `{{name}}` with a red highlight in the preview.
- [ ] **`@sgBillpayInfo`** — look up a customer. Confirm `@sgBillpayInfo` renders as an
  HTML table with account number, last name, and zip code.
- [ ] **`@{progCodeId}.servTable`** — insert a `servTable` mention for a specific program.
  Confirm it renders as an HTML table of servCodes and prices.

#### Template CRUD

- [ ] **Save As (new template)** — author a template, click Template → Save As…, enter a
  name, click Save. Confirm the template appears in the Open menu.
- [ ] **Save (overwrite)** — modify the loaded template, click Template → Save. Confirm
  the changes persist after reloading the page.
- [ ] **Save — other user's template warning** — open a coworker's template, click Save.
  Confirm the confirmation dialog appears explaining the save will create your own copy.
  Confirm clicking Save creates the template under your saId.
- [ ] **Open** — open the Open menu and confirm templates are listed flat (ungrouped) and
  under their groups. Click a template and confirm it loads into the editor.
- [ ] **Delete template** — load a template you own, click Template → Delete…, confirm.
  Confirm the template no longer appears in the Open menu and the editor resets to blank.
- [ ] **Delete disabled for non-owner** — open another user's template. Confirm the
  Delete… menu item is disabled (unless you are admin).
- [ ] **New** — click Template → New. Confirm the editor resets to blank and the loaded
  template indicator clears.
- [ ] **Move to Group** — load a template you own, click Template → Move to Group →
  select a group. Confirm the template now appears under that group in the Open menu.
- [ ] **Move to No Group** — move a grouped template to "No group". Confirm it appears
  ungrouped in the Open menu.

#### Group CRUD

- [ ] **Create group** — click Groups → Create New Group…, enter a name. Confirm the
  group appears in the Open menu and in the Move to Group submenu.
- [ ] **Rename group** (admin) — click Groups → Rename Group → select a group, enter a
  new name. Confirm the group name updates everywhere.
- [ ] **Delete group — empty** (admin) — create a group with no templates, delete it.
  Confirm it disappears from all menus.
- [ ] **Delete group — non-empty** (admin) — attempt to delete a group that contains
  templates. Confirm the API returns an error and the group is not deleted.

#### Edge Cases

- [ ] **Reload page** — confirm templates auto-load on page mount and the Open menu is
  populated without a manual action.
- [ ] **Runtime overrides not persisted** — make servCode and price overrides at call
  time, then reload the page. Confirm the overrides are gone and the template defaults
  are restored.
- [ ] **Section removal** — add two sections, remove one. Confirm the remaining section
  is still active and its content is intact.
- [ ] **Reorder programs** — (if drag-to-reorder is implemented) reorder programs in the
  panel. Confirm the loop expansion order in the preview matches the panel order.


### Phase 9 — Cutover

**Goal:** Replace `quickSend` with `quickSend2`. Delete v1.

- Move `quickSend2/` → `quickSend/`
- Update `src/app/quickSend/page.tsx` to use new components
- Delete all v1 files
- Update any cross-app imports
