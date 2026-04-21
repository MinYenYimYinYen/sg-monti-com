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

#### Step 2.5 — `ProgCodeUtils` and `ServCodeUtils` (NEXT — prerequisite for Step 3)
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

**QuickSend usage (in `quickSendSelect.ts`):**
```ts
const scoped = progCode.x.getByServCodeIds(config.includedServCodes.map(s => s.servCodeId));
const prefPrice = scoped.getPrefPrice(size);
const totalPrice = scoped.getTotalPrice(size);
```

**Circularity strategy — `buildProgCode` helper:**

`ProgCode.servCodes` and `ServCode.progCode` form a two-level circular reference. The same pattern used in `centralSelectors.ts` applies here, but because `ProgCode`/`ServCode` have no external dependency maps at construction time (price tables and product rules are resolved before this point), the construction logic can be extracted into a standalone helper:

```ts
// src/app/realGreen/progServ/_lib/buildProgCode.ts
export function buildProgCode(
  progCodeData: Omit<ProgCode, "servCodes" | "x">,
  servCodeDatas: Omit<ServCode, "progCode" | "x">[],
): ProgCode {
  // Phase 1: build progCode with empty servCodes
  const progCodeBuilder = { ...progCodeData, servCodes: [] } as Omit<ProgCode, "x">;

  // Phase 2: build each ServCode pointing at the progCode builder, attach x
  const servCodes = servCodeDatas.map((servData) => {
    const servBuilder = { ...servData, progCode: progCodeBuilder as ProgCode } as Omit<ServCode, "x">;
    (servBuilder as ServCode).x = new ServCodeUtils(servBuilder as ServCode);
    return servBuilder as ServCode;
  });

  // Close the circle, attach x
  progCodeBuilder.servCodes = servCodes;
  (progCodeBuilder as ProgCode).x = new ProgCodeUtils(progCodeBuilder as ProgCode);

  return progCodeBuilder as ProgCode;
}
```

- **`progServSelectors.ts`** is refactored to call `buildProgCode(...)` instead of doing the two-phase construction inline.
- **`ProgCodeUtils.getByServCodeIds`** also calls `buildProgCode(...)` so the scoped instance is fully circularized — each filtered `ServCode.progCode` points at the new scoped `ProgCode`, and `x` is properly attached to both.
- **Return type of `getByServCodeIds`** is `ProgCodeUtils` (the `x` of the new scoped `ProgCode`), not the `ProgCode` itself.

This differs from `centralSelectors.ts` which keeps construction inline because its three-level circle (Customer → Program → Service) has too many external dependency maps to encapsulate cleanly. `buildProgCode` works as a helper precisely because all external lookups are resolved before it is called.

**Key files to read when resuming for Step 2.5:**
- `src/app/realGreen/progServ/_lib/types/ProgCodeTypes.ts` — add `x: ProgCodeUtils` to `ProgCodeProps`
- `src/app/realGreen/progServ/_lib/types/ServCodeTypes.ts` — add `x: ServCodeUtils` to `ServCodeProps`
- `src/app/realGreen/progServ/_lib/selectors/progServSelectors.ts` — refactor to use `buildProgCode`
- `src/app/realGreen/priceTable/_lib/pricingFuncs.ts` — `getPriceChartPrice`, `isEcon` (used by `ProgCodeUtils`)
- `src/app/realGreen/customer/_lib/classes/ServiceUtils.ts` — reference implementation for the `x` pattern
- `src/app/realGreen/customer/selectors/centralSelectors.ts` — reference for the two-phase builder + mutate pattern

---

#### Step 3 — Dot-notation program variables
**Goal:** Support `@MLC.description`, `@MLC.servCount`, `@MLC.prefPrice`, etc. — dynamically generated from ProgCodes in Redux state.

**Design:**

**Variable naming:** `{programCode}.{property}` where `programCode` is the RealGreen program code string (e.g. `"MLC"`) and `property` is one of:
- `description` — `ProgCode.description`
- `servCount` — number of included ServCodes
- `prefPrice` — per-visit price from preferred price table + customer size
- `econPrice` — per-visit price from economy price table + customer size
- `price` — auto-selects pref or econ based on `isEcon({ minForPreferred, activeServiceCount })`
- `totalPrice` — `price * servCount`

**State additions to `quickSendSlice.ts`:**
```ts
type QSProgramConfig = {
  includedServCodes: ServCode[]; // full objects; default = all non-service-call codes
};

// Added to QuickSendState:
programConfigs: Record<string, QSProgramConfig>; // keyed by programCode e.g. "MLC"
```

**Auto-add behavior (Option A):** When the user selects a `@MLC.*` mention from the suggestion dropdown, if `"MLC"` is not yet in `programConfigs`, dispatch `addProgramConfig({ progCode })` which initializes it with all non-service-call ServCodes included. This makes persistence straightforward — `programConfigs` is always the explicit source of truth.

**Persistence note:** When saving to Mongo, serialize `includedServCodes` down to `includedServCodeIds: string[]`. When loading, re-hydrate from Redux `progServSelectors` (ProgCode/ServCode data is always in Redux from `useProgServ({ autoLoad: true })`).

**Dynamic suggestion items — IDE-style autocomplete:** `buildMentionSuggestion()` accepts a `getProgCodes` callback so `TemplateEditor` can pass in live Redux data. The suggestion system uses Tiptap's `query` string (everything typed after `@`) to implement two-level drill-down:

- **Before the dot** (`query = "MLC"`): show flat vars (`name`, `size`) + namespace items (`MLC →`, `TLC →`) filtered by query. Namespace items have `isNamespace: true`.
- **After the dot** (`query = "MLC.serv"`): split on `.`, find the matching ProgCode, filter its properties by the suffix. Show only leaf items.
- **Namespace `command`**: instead of inserting a mention node, replaces the typed text with `@{namespace}.` and keeps the suggestion open — exactly like IDE autocomplete.
- **Leaf `command`**: inserts a mention node with `id: "MLC.servCount"` (no trailing space).

The `MentionList` component renders namespace items with a `→` indicator to signal drill-down behavior.

**Controls panel:** `selectActivePrograms` parses `templateHtml` for mention `data-id` attributes with dot notation, extracts unique program code prefixes, and returns the matching `QSProgramConfig[]`. The left panel renders one collapsible section per active program with ServCode checkboxes.

**Selector additions to `quickSendSelect.ts`:**
- `selectActivePrograms` — parses templateHtml for `{code}.*` mention IDs, returns `QSProgramConfig[]`
- `selectProgramVariables` — for each active program, computes all resolved property values using `getPriceChartPrice` from `src/app/realGreen/priceTable/_lib/pricingFuncs.ts`
- `selectPreviewHtml` extended — handles dot-notation mention spans in addition to `name`/`size`

**Key files to read when resuming for Step 3:**
- `src/app/realGreen/progServ/_lib/types/ProgCodeTypes.ts` — `ProgCode`, `ProgCodeDoc`, `ProgCodeProps`
- `src/app/realGreen/progServ/_lib/types/ServCodeTypes.ts` — `ServCode`, `ServCodeDoc`
- `src/app/realGreen/progServ/_lib/selectors/progServSelectors.ts` — how to select ProgCodes from Redux
- `src/app/realGreen/priceTable/_lib/pricingFuncs.ts` — `getPriceChartPrice`, `isEcon`
- `src/app/realGreen/priceTable/_types/PriceTableTypes.ts` — `PriceTable` shape
- `src/app/realGreen/progServ/_lib/hooks/useProgServ.ts` — already written, add to QuickSend.tsx
- `src/app/realGreen/priceTable/usePriceTable.ts` — already written, add to QuickSend.tsx
- `src/app/quickSend/quickSendSlice.ts` — extend with `programConfigs`
- `src/app/quickSend/quickSendSelect.ts` — extend with program variable selectors
- `src/app/quickSend/mentionSuggestion.ts` — make dynamic (accept `getProgCodes` callback)
- `src/app/quickSend/TemplateEditor.tsx` — pass progCodes into suggestion config
- `src/app/quickSend/CustomerLookup.tsx` — add program config sections below customer controls

---

#### Step 4 — Persistence (future)
**Goal:** User can name and save a template.

**Storage model** (flat Mongo document):
```ts
type SavedQuickSendTemplate = {
  templateId: string;       // natural key (user-defined name slug)
  name: string;
  templateHtml: string;     // Tiptap HTML with mention spans intact
  programConfigs: {
    programCode: string;
    includedServCodeIds: string[]; // serialize down from full ServCode objects
  }[];
  // Note: customer state (custId, overrides) is NOT persisted — it's per-send, not per-template
};
```

**Loading:** Restore `templateHtml` + hydrate `programConfigs` by looking up each `programCode` in Redux `progServSelectors`. The controls panel renders immediately from the restored state.

---

### What We Are NOT Building
- A pre-defined template tree (the `quickSend_bad` approach)
- Admin-only template authoring — end users author their own templates
- Complex block/choice/group systems
