 - Lessons learned from src/app/quickSend_bad
   - It was too complicated.
     - The tree structure (types first) approach resulted in railroading development
     - The tree structure persistence was rigid and hard to maintain.
     - We should use foreign keys and flat objects when persisting.
   - It is possible to use @ variables with tiptap to insert html on the fly.
     - simple text
       - depending on the @ variable selected, UI above the editor should render fields for the user to fill in.
         - alternatively/additionally, in the case of name/size variables, the UI should expose a customer lookup input (custId)
           - If user inputs a custId, and the customer exists, the tiptap editor @ variables should be replaced with the customer's name/size.
         - When the user inputs values for the @ variables, the tiptap editor should be updated.
     - tables are also possible to insert
       - this requires a logic system to handle table structure
       - the logic system is not trivial
         - table structure should be predefined, so end user can simply insert rows by selecting progCode(s)/servCode(s)
         - we should not have column headers
       - the goal for a table in a template is to insert pricing for the servCodes of a progCode.
       - the progCode(s) should be selectable by the user.
       - Behavior:
         - @ProgCode should:
           - expose UI outside of tiptap display component that allows user to select progCode(s), then allow deselect of servCodes.
           - pricing should be default based on # of servCodes selected.
           - pricing for services within a progCode should also be editable (override default pricing)
   - End user should be able to persist a template they have created.
     - This is not how src/app/quickSend_bad worked.  Templates were always pre-defined.

---

## Cline Plan

### Core Architecture

The new QuickSend is **editor-first**. The Tiptap editor is the primary artifact. The left panel is **reactive** — it shows controls based on what `@` variables are currently present in the editor content, not based on a pre-defined template tree.

This is the opposite of `quickSend_bad`, where the left panel was statically configured per template node. Here, the user composes freely in the editor and the UI adapts to what they've inserted.

**Persistence** is user-authored: the user creates a template, names it, and saves it. Storage is flat (Tiptap HTML + variable state), not a tree structure.

---

### Development Steps

#### Step 1 — Blank editor ✅ DONE
**Goal:** Prove the editor works. No `@` support, no data fetching.

Files:
- `src/app/quickSend/page.tsx` — Next.js page entry
- `src/app/quickSend/QuickSend.tsx` — Two-panel layout (left controls + right split editor)
- `src/app/quickSend/QuickSendEditor.tsx` — Wraps TemplateEditor + PreviewEditor
- `src/app/quickSend/TemplateEditor.tsx` — Tiptap editor for authoring (top pane)
- `src/app/quickSend/PreviewEditor.tsx` — Tiptap editor for resolved preview (bottom pane)

---

#### Step 2 — `@name` and `@size` variables ✅ DONE
**Goal:** Live variable resolution from customer lookup or manual input.

**What was built:**
- `src/app/quickSend/mentionSuggestion.ts` — Tiptap suggestion config. Inserts mention nodes without trailing space.
- `src/app/quickSend/MentionList.tsx` — Dropdown UI for `@` suggestions.
- `src/app/quickSend/CustomerLookup.tsx` — Left panel: custId search, name/size overrides.
- `src/app/quickSend/quickSendSlice.ts` — Redux slice: `templateHtml`, `customer` (custId, customer, nameOverride, sizeOverride).
- `src/app/quickSend/quickSendSelect.ts` — Selectors: `templateHtml`, `customerState`, `activeVars`, `resolvedVariables`, `unfulfilledVars`, `previewHtml`.
- `src/app/quickSend/QuickSendTypes.ts` — `QSCustomerState`, `QSVariableKey`.

**How it works:**
- `TemplateEditor` dispatches `setTemplateHtml` on every editor change.
- `selectPreviewHtml` replaces mention spans with resolved values (or `<mark>{{varName}}</mark>` for unfulfilled).
- `PreviewEditor` calls `setContent(previewHtml)` when `previewHtml` changes, and uses `setNodeMarkup` to update mention labels in-place when only override values change (preserving user edits to surrounding text).
- Unfulfilled variables render with a red background (`rgba(220,38,38,0.5)`) using the `Highlight` extension's `<mark style="...">` approach — the same technique used in `quickSendPrototype/Editor.tsx`.
- Copy button is disabled when any unfulfilled variables are present.

**Key files to re-read when resuming:**
- `src/app/quickSend/quickSendSelect.ts` — all selector logic including unfulfilled detection and HTML replacement
- `src/app/quickSend/PreviewEditor.tsx` — dual update strategy (setContent vs setNodeMarkup)
- `src/app/quickSend/mentionSuggestion.ts` — custom command to suppress trailing space
- `src/app/realGreen/customer/slices/centralCustomerSlice.ts` — why `useCustomerContext(["single"])` is needed in QuickSend.tsx

---

#### Step 2.5 — `ProgCodeUtils` and `ServCodeUtils` ✅ DONE
**Goal:** Add utility classes to the `progServ` feature that expose derived computations on `ProgCode` and `ServCode`. These are general-purpose RealGreen resources — not QuickSend-specific.

**`ProgCodeUtils`** (`src/app/realGreen/progServ/_lib/classes/ProgCodeUtils.ts`):
```ts
export class ProgCodeUtils {
  constructor(private readonly progCode: ProgCode) {}

  /** Returns a new ProgCodeUtils scoped to only the specified ServCodes. */
  getByServCodeIds(servCodeIds: string[]): ProgCodeUtils {
    const filtered = this.progCode.servCodes.filter(s => servCodeIds.includes(s.servCodeId));
    return new ProgCodeUtils({ ...this.progCode, servCodes: filtered });
  }

  /** Price per visit from the preferred price table for a given size. */
  getPrefPrice(size: number): number | null { ... }

  /** Price per visit from the economy price table for a given size. */
  getEconPrice(size: number): number | null { ... }

  /**
   * Auto-selects preferred or economy price based on isEcon logic.
   * Uses servCodes.length on this instance as the active service count.
   */
  getPrice(size: number): number | null { ... }

  /** Total program price: getPrice(size) × servCodes.length */
  getTotalPrice(size: number): number | null { ... }
}
```

**`ServCodeUtils`** (`src/app/realGreen/progServ/_lib/classes/ServCodeUtils.ts`):
- Wraps a `ServCode`, exposes derived getters. No consumer-specific logic.

**Type changes:**
- `ProgCodeProps` gains `x: ProgCodeUtils`
- `ServCodeProps` gains `x: ServCodeUtils`
- `progServSelectors.ts` attaches `x` after building each entity (same pattern as `centralSelectors.ts` for `Service`/`Program`/`Customer`)

**Circularity strategy — `buildProgCode` helper:**

`ProgCode.servCodes` and `ServCode.progCode` form a two-level circular reference. The construction logic is extracted into a standalone helper `buildProgCode(progCodeData, servCodeDatas)` in `src/app/realGreen/progServ/_lib/buildProgCode.ts`. `progServSelectors.ts` calls this helper instead of doing the two-phase construction inline. `ProgCodeUtils.getByServCodeIds` also calls `buildProgCode` so the scoped instance is fully circularized.

---

#### Step 3 — Dot-notation program variables ✅ DONE
**Goal:** Support `@MLC.description`, `@MLC.servCount`, `@MLC.prefPrice`, etc. — dynamically generated from ProgCodes in Redux state.

**Variable naming:** `program.{alias}.{property}` where `alias` is the mention ID segment (e.g. `"MLC"`) and `property` is one of: `description`, `servCount`, `prefPrice`, `econPrice`, `price`, `totalPrice`.

**Three-level suggestion drill-down in `buildMentionSuggestion`:**
- Level 0 (no dot): flat vars (`name`, `size`) + `"program →"` namespace item
- Level 1 (`program.*`): progCode namespace items (`MLC →`, `TLC →`, ...)
- Level 2 (`program.MLC.*`): leaf property items (`description`, `price`, ...)
- Namespace items replace typed text with `@{prefix}.` and keep suggestion open (IDE-style)

**State:** `programConfigs: QSProgramConfig[]` in the slice. Each config has `alias`, `progCodeId`, `includedServCodeIds`. Auto-added when a leaf mention is inserted.

**Controls panel:** `selectActivePrograms` parses the active section's `templateHtml` for dot-notation mention IDs and returns the matching configs. Left panel renders one `ProgramConfig` section per active alias with ServCode checkboxes.

**Key files:**
- `src/app/quickSend/mentionSuggestion.ts` — `buildMentionSuggestion`, three-level drill-down
- `src/app/quickSend/MentionList.tsx` — renders namespace items with `→` indicator
- `src/app/quickSend/ProgramConfig.tsx` — ServCode checkbox UI
- `src/app/quickSend/quickSendSlice.ts` — `addProgramConfig`, `removeProgramConfig`, `setIncludedServCodeIds`
- `src/app/quickSend/quickSendSelect.ts` — `selectActivePrograms`, `selectProgramVariables`, `selectPreviewHtml` (extended)

---

#### Step 3.1 — Multiple instances of the same ProgCode (alias system) ✅ DONE
**Goal:** Allow the same RealGreen program (e.g. `MLC`) to appear multiple times in a template with independent servCode selections. Each instance gets a unique alias (`MLC`, `MLC_2`, `MLC_3`, ...).

**How it works:**
- The mention ID for a program variable is `program.{alias}.{prop}` where `alias` is the deduplication key, not the raw `progCodeId`.
- `QSProgramConfig.alias` is the primary key in the slice. Multiple configs can share the same `progCodeId` but must have distinct aliases.
- When the user drills into Level 1 of the suggestion (`program.*`), if a progCode's base alias is already in `programConfigs`, the suggestion list also offers the next available `_N` variant (e.g. `MLC_2 →`).
- `getExistingAliases()` callback in `buildMentionSuggestion` reads the current `programConfigs` to determine which aliases are taken.

**`safelyRemoveSuffix(alias, progCodes)`** (exported from `mentionSuggestion.ts`):
- Recovers the base `progCodeId` from an alias that may have a `_N` suffix.
- Strategy: exact match first (handles progCodeIds that already contain underscores/digits, e.g. `"MLC_3"`), then last-underscore strip if the trailing segment is all digits.
- Used in Level 2 suggestion logic and in `TemplateEditor.tsx`'s `onProgramMentionInserted` callback.

**Key files:**
- `src/app/quickSend/mentionSuggestion.ts` — `safelyRemoveSuffix`, Level 1 alias variant logic
- `src/app/quickSend/TemplateEditor.tsx` — `onProgramMentionInserted` uses `safelyRemoveSuffix`
- `src/app/quickSend/QuickSendTypes.ts` — `QSProgramConfig.alias` as primary key

---

#### Step 3.2 — Multi-section template support ✅ DONE
**Goal:** Allow a template to have multiple independently-editable sections (e.g. two paragraphs of an email), each with its own Tiptap editor and preview. Program configs are shared globally across all sections.

**State shape:**
```ts
type QSSection = {
  sectionId: string;
  templateHtml: string;
  // No programConfigs — those are global
};

type QuickSendState = {
  sections: QSSection[];
  activeSectionId: string;   // which section the left panel controls react to
  programConfigs: QSProgramConfig[];  // global — shared across all sections
  customer: QSCustomerState;
};
```

**New slice actions:** `addSection`, `removeSection`, `setActiveSection`. `setTemplateHtml` now takes `{ sectionId, html }`.

**Selector changes:**
- `selectActiveSection` — returns the active `QSSection`
- All active-section selectors (`selectTemplateHtml`, `selectActiveVars`, `selectActivePrograms`, etc.) operate on the active section's HTML
- `selectAllPreviewHtmls` — computes preview HTML for every section using the global `programConfigs` and customer state; returns `{ sectionId, previewHtml }[]`
- `resolveHtml(html, name, size, progVarMap)` — extracted as a shared helper to avoid duplicating the replacement logic between `selectPreviewHtml` and `selectAllPreviewHtmls`

**UI (`QuickSendEditor.tsx`):**
- Template pane: `ScrollArea` containing all sections stacked, each with its own `TemplateEditor`. Active section highlighted with `border-l-2 border-primary`. Section label + hover-visible trash icon when multiple sections exist. `+Add Section` button in the template header.
- Preview pane: `ScrollArea` containing all sections stacked, each with its own `PreviewEditor`. Section label row includes a per-section **Copy** button (disabled if that section has unfulfilled vars). Global **Copy All** button in the preview header copies all sections combined (disabled if any section has unfulfilled vars).
- `TemplateEditor` dispatches `setActiveSection` on focus so the left panel always reflects the section being edited.
- `PreviewEditor` simplified to accept `previewHtml` as a prop (no longer reads from Redux directly).

**Line spacing fix:** Both editor prose containers use `prose-p:my-1 prose-p:leading-snug` to reduce the large inter-paragraph gaps in the UI (copied HTML is unaffected).

**Key files:**
- `src/app/quickSend/QuickSendTypes.ts` — `QSSection`, `QSProgramConfig`
- `src/app/quickSend/quickSendSlice.ts` — sections + activeSectionId, global programConfigs
- `src/app/quickSend/quickSendSelect.ts` — `selectActiveSection`, `selectAllPreviewHtmls`, `resolveHtml`
- `src/app/quickSend/QuickSendEditor.tsx` — stacked sections UI, per-section copy buttons
- `src/app/quickSend/TemplateEditor.tsx` — accepts `sectionId` prop
- `src/app/quickSend/PreviewEditor.tsx` — accepts `previewHtml` prop

---

#### Step 4.1 — `storedTemplates` data module (backend + Redux)
**Goal:** Implement the full Data Module Pattern for template and group persistence. No UI yet — just the contract, API route, slice, selectors, and hook.

**Data model:**
```ts
type StoredTemplateDoc = {
  templateId: string;          // natural key — unique per (name + userName) pair
  name: string;
  groupId: string;
  userName: string;            // owner
  sections: { sectionId: string; templateHtml: string; }[];
  programConfigs: { alias: string; progCodeId: string; includedServCodeIds: string[]; }[];
};

type TemplateGroupDoc = {
  groupId: string;             // natural key (name slug)
  name: string;
};
```

**Uniqueness:** `name + userName` must be unique. Two users can both have a template named "Initial Response" — they are distinct records.

**Files:**
- `src/app/quickSend/storedTemplates/storedTemplatesContract.ts`
- `src/app/quickSend/storedTemplates/api/route.ts`
- `src/app/quickSend/storedTemplates/storedTemplatesSlice.ts`
- `src/app/quickSend/storedTemplates/storedTemplatesSelect.ts`
- `src/app/quickSend/storedTemplates/useStoredTemplates.ts`

**Operations exposed by the contract:**
- `getTemplates` — fetch all templates (used by the browser sheet and Groups menu)
- `getGroups` — fetch all groups
- `saveTemplate` — create or overwrite (enforces ownership on overwrite)
- `deleteTemplate` — owner or admin only
- `createGroup` — any user
- `renameGroup` — admin only
- `deleteGroup` — admin only (does not delete templates; caller must resolve each template first)
- `moveTemplate` — move a template to a different group

---

#### Step 4.2 — `quickSendSlice` load/lock state + Menubar "Template" menu
**Goal:** Wire the loaded template state into `quickSendSlice` and build the "Template" menubar trigger with New, Save, Save As, Rename, Delete, and the lock indicator.

**`quickSendSlice` additions:**
- `loadedTemplateId: string | null` — which template is currently loaded (null = unsaved)
- `loadedTemplateOwner: string | null` — userName of the template owner
- `isLocked: boolean` — whether Save is disabled for this session
- `loadTemplate(template: StoredTemplateDoc)` — populates sections + programConfigs, sets `isLocked = true`
- `unlock()` — session-only, sets `isLocked = false`
- `clearTemplate()` — resets to blank state, `isLocked = false`

**Menubar "Template" trigger:**
- **New** — dispatches `clearTemplate()`
- **Open** — opens the Template Browser Sheet (Step 4.3)
- **Save** — dispatches `saveTemplate` thunk; disabled if `isLocked`; shows "Owned by [name]" tooltip
- **Save As** — always available; opens a Popover with a name input + confirm; creates a new template owned by current user
- **Rename** — Popover with name input; only available if current user is owner
- **Delete** — Popover confirmation; only available if current user is owner
- Lock indicator: small lock icon + "Owned by [name]"; clicking it dispatches `unlock()`

**Popover pattern:** `MenubarItem` with `onSelect` that opens a controlled `Popover` containing a text input + confirm/cancel. Used for Save As, Rename, Delete confirmation.

---

#### Step 4.3 — Template Browser Sheet ("Open")
**Goal:** A Sheet component that lets users browse, filter, and load any saved template. Opened from the "Template → Open" menu item.

**Layout (file-explorer style):**
- **Left pane:** Search input + filters (by user, group, template name)
- **Main body:** List of all templates matching filters. Each row shows: template name, `userName` in small subtext, group badge. Clicking a row dispatches `loadTemplate` and closes the sheet.

**Key files:**
- `src/app/quickSend/TemplateBrowserSheet.tsx`

---

#### Step 4.4 — Menubar "Groups" menu + group management
**Goal:** Build the "Groups" menubar trigger with full group CRUD and the template-resolution flow for group deletion.

**"Groups" menu:**
- **Create New Group** — Popover with name input (any user)
- **Rename Group** — sub-menu listing all groups → Popover to rename (admin only)
- **Delete Group** — sub-menu listing all groups (admin only); opens a resolution Popover that lists each template in the group with three options per template:
  1. Move to → dropdown of other groups
  2. Delete (only if current user owns that template)
  3. Create New Group (inline — creates a group and moves the template there)
  All templates must be resolved before the group can be deleted.
- `---`
- `.map(group)` → `MenubarSubTrigger` with group name + `→` → sub-menu listing templates in that group (name + userName subtext) → clicking loads the template

**Key files:**
- `src/app/quickSend/QuickSendMenubar.tsx` — contains both "Template" and "Groups" triggers

---

### What We Are NOT Building
- A pre-defined template tree (the `quickSend_bad` approach)
- Admin-only template authoring — end users author their own templates
- Complex block/choice/group systems
