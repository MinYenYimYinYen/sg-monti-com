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

The ProgChooser UI is always present — it is not gated behind a mention. The left panel
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
type QS2ProgramConfig = {
  progCodeId: string;
  includedServCodeIds: string[];
  priceOverride: number | null;
  prepayId: string | null;
};

type QS2StoredTemplate = {
  // ... sections, name, groupId, etc.
  programConfigs: QS2ProgramConfig[];  // persisted default selections
  globalPrepayId: string | null;       // persisted global prepay default
};
```

At call time, the user can modify any of these — those modifications are runtime-only
and are not saved back unless the user explicitly saves.

---

## Implementation Phases

---

### Phase 1 — Types, State Shape, and Slice

**Goal:** Define the complete type system and Redux slice for QuickSend2. No UI yet.

#### Types (`QS2Types.ts`)
```ts
type QS2ProgramConfig = {
  progCodeId: string;
  includedServCodeIds: string[];
  priceOverride: number | null;
  prepayId: string | null;
};

type QS2Section = {
  sectionId: string;
  templateHtml: string;
};

type QS2CustomerState = {
  custId: number | null;
  customer: Customer | null;
  nameOverride: string;
  sizeOverride: string;
  taxRateZipOverride: string | null;
};

type QS2State = {
  sections: QS2Section[];
  activeSectionId: string;
  programConfigs: QS2ProgramConfig[];   // persisted defaults (loaded from template)
  runtimeOverrides: {                   // call-time modifications (not persisted)
    programConfigs: Partial<Record<string, Partial<QS2ProgramConfig>>>;
    globalPrepayId: string | null | undefined; // undefined = use persisted default
  };
  globalPrepayId: string | null;        // persisted default
  auxValues: Record<string, string>;
  customer: QS2CustomerState;
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
- `addProgramConfig(progCodeId)` — adds with all non-service-call servCodes included
- `removeProgramConfig(progCodeId)`
- `setIncludedServCodeIds({ progCodeId, servCodeIds })` — writes to runtime override
- `setPriceOverride({ progCodeId, price })` / `clearPriceOverride(progCodeId)` — runtime override
- `setProgramPrepayId({ progCodeId, prepayId })` — runtime override
- `setGlobalPrepayId(prepayId)` — runtime override
- `reorderProgramConfigs({ fromIndex, toIndex })`

#### Selectors (`qs2Select.ts`)
- `selectEffectiveProgramConfigs` — merges persisted `programConfigs` with `runtimeOverrides.programConfigs` to produce the effective config for each program
- `selectEffectiveGlobalPrepayId` — `runtimeOverrides.globalPrepayId ?? state.globalPrepayId`
- `selectEffectiveTaxRate` — same logic as v1
- `selectSizeNum` — `parseFloat(sizeOverride)`, returns `null` if invalid

---

### Phase 2 — Pricing Selectors

**Goal:** Compute resolved `QS2ProgramVariables` for all selected programs. This is the
authoritative pricing layer — all preview resolution and UI display consume from here.

#### Selectors (`qs2Select.ts`, continued)
- `selectProgramVariables` — for each effective program config, computes:
  - `progCodeId`, `description`, `servCount`
  - `prefPrice`, `econPrice`, `servPrice` (effective: override ?? chart)
  - `subTotal`, `prepayDiscAmt`, `taxAmt`, `total`
  - `prepayPercent` (from per-program prepayId, falling back to global prepayId)
  - `servTable: { description, price }[]`
  - Uses `computeProgChooserPricing` from v1 (or a copy of it in `qs2/lib/`)
- `selectProgramVariableMap` — `Map<progCodeId, QS2ProgramVariables>` for O(1) lookup
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

#### Key difference from v1
No `@program` namespace. No alias system. ProgCode IDs are used directly as namespace
prefixes. The suggestion list for program namespaces is filtered to currently-selected
programs only.

---

### Phase 4 — Preview Resolver

**Goal:** Implement `resolveHtml2` — the full mention-to-value replacement pipeline.

#### Resolution order
1. Flat vars (`@name`, `@size`, `@taxRate`, `@season`, `@sgBillpayInfo`, `@aux.*`)
2. Program-specific mentions (`@{progCodeId}.{prop}`) — resolved from `selectProgramVariableMap`
3. Loop expansion (`@loop.*`) — same paragraph/row cloning logic as v1
4. Aggregate mentions (`@totals.{prop}`) — resolved from `selectAggregates`

#### Selectors (`qs2Select.ts`, continued)
- `selectPreviewHtml` — active section preview
- `selectAllPreviewHtmls` — all sections preview (for stacked preview pane)

Both consume `selectProgramVariables`, `selectProgramVariableMap`, and `selectAggregates`
as inputs.

---

### Phase 5 — Stored Template CRUD

**Goal:** Persist and load QuickSend2 templates. New Mongoose model and API route.

#### `QS2StoredTemplateDoc`
```ts
type QS2StoredTemplateDoc = {
  templateId: string;
  saId: string;
  name: string;
  groupId: string | null;
  sections: QS2Section[];
  programConfigs: QS2ProgramConfig[];
  globalPrepayId: string | null;
};
```

#### Files
- `QS2StoredTemplateTypes.ts`
- `QS2StoredTemplateModel.ts`
- `qs2StoredTemplateSlice.ts`
- `qs2StoredTemplateSelect.ts`
- `useQS2StoredTemplates.ts`
- `api/route.ts` — `getQS2Templates`, `saveQS2Template`, `deleteQS2Template`

---

### Phase 6 — UI: Program Panel

**Goal:** Build the left-panel program management UI. This is the core UX of QuickSend2.

#### Components
- `ProgramPanel` — top-level left panel. Always visible. Contains:
  - `GlobalPrepaySelector` — sets `globalPrepayId`
  - `ProgramList` — list of selected programs with add/remove/reorder
  - `ProgramRow` — one row per selected program, expandable accordion
  - `ProgramRowConfig` — expanded view: servCode checkboxes, price override input,
    per-program prepay override
- `ServCodeCheckboxList` — reused from v1 (or copied)
- `PrepaySelector` — reused from v1 (or copied)

---

### Phase 7 — UI: Editor and Preview

**Goal:** Wire up the Tiptap editor, preview pane, and top-level page.

#### Components
- `QS2Editor` — Tiptap editor with the new mention suggestion config
- `QS2Preview` — renders `selectPreviewHtml` as sanitized HTML
- `QS2Page` — top-level layout: left panel (customer + program panel) + editor + preview
- `QS2CustomerPanel` — customer lookup, name/size/taxRate overrides (same as v1)

---

### Phase 8 — Template Management UI

**Goal:** Template save/load/delete UI. Mirrors v1's stored template UI.

#### Components
- `QS2TemplateManager` — list of saved templates, load/delete actions
- `QS2SaveDialog` — name + group input, save button

---

### Phase 9 — Cutover

**Goal:** Replace `quickSend` with `quickSend2`. Delete v1.

- Move `quickSend2/` → `quickSend/`
- Update `src/app/quickSend/page.tsx` to use new components
- Delete all v1 files
- Update any cross-app imports
