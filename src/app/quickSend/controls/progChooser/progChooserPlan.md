# ProgChooser Plan

## Overview

`progChooser` is a dynamic loop feature for QuickSend templates. Instead of pre-configuring
specific programs at template-authoring time (as the existing `program.{alias}.*` system does),
`progChooser` lets the **user at call time** select which programs to include. The template
author defines the *format* for each program using `@p.*` loop-variable mentions. The preview
resolver iterates over the selected programs and renders the format once per program.

---

## Mention System

### `@progChooser` (flat trigger mention)
- Added to `QSVariableKey` and `FLAT_ITEMS` in `mentionSuggestion.ts`.
- Inserting it into the template activates the `ProgChooserControl` in the left panel.
- In the **template editor** it renders its label (e.g. `@progChooser`) so the author can see it.
- In the **preview** it renders as an empty string — it is purely a control trigger.

### `@p` (loop-variable namespace)
- Added as a new namespace item at Level 0 in `mentionSuggestion.ts` (alongside `program`).
- Drilling into it exposes `@p.{prop}` leaf items.

### `@p.{prop}` (loop-variable leaf mentions)
- Props are the same set as `QSProgLeafKey` (TypeScript-enforced via the shared type and the
  existing `PROG_LEAF_PROPS` exhaustiveness helper).
- Available props: `description`, `servCount`, `prefPrice`, `econPrice`, `servPrice`,
  `subTotal`, `prepayDiscAmt`, `taxAmt`, `total`.
- These mentions are only meaningful inside a **loop paragraph** (see Preview Resolution below).

---

## Loop Semantics

Any `<p>` (paragraph) or `<tr>` (table row) in the template HTML that contains at least one
`@p.*` mention is treated as a **loop template unit**. At preview time:

1. The resolver finds all such paragraphs/rows.
2. For each loop unit, it clones the HTML once per selected progCode.
3. In each clone, `@p.{prop}` mention spans are replaced with the resolved value for that
   specific progCode.
4. The original loop unit is replaced with the N cloned units joined together.

Paragraphs/rows with no `@p.*` mentions are left completely untouched.

---

## State Shape (runtime only — not persisted)

All `progChooser` runtime state lives in `quickSendState` and is cleared when a template is
loaded or the editor is reset. It is **not** stored in `StoredTemplateDoc`.

```ts
type ProgChooser = {
  selectedProgCodeIds: string[];
  servCodeOverrides: Record<string, string[]>; // Phase 2: progCodeId → included servCodeIds (eager-written on selection)
  priceOverrides: Record<string, number>;      // Phase 3: progCodeId → override servPrice
  prepayId: string | null;                     // Phase 4: global prepay code
}
```

---

## Pricing Model

progChooser operates in **hypothetical/sales space** — it proposes services that do not yet
exist in RealGreen. It does not instantiate `Service` objects. Pricing is computed by a
dedicated pure function `computeProgChooserPricing` in `progChooserPricing.ts`.

### Price resolution cascade (Phase 3)

The effective per-visit price for a program is resolved as:

```
effectiveServPrice =
  priceOverrides[progCodeId]       // Phase 3: program-level override
  ?? progCode.x.getServPrice(size) // price chart (pref or econ)
```

`subTotal = effectiveServPrice × includedServCodes.length`

`servPrice` in `QSProgramVariables` always reflects the price-chart price (unchanged). It
remains meaningful for the common case (no overrides). Authors should use `@p.subTotal`
when a price override is in play.

Per-servCode price overrides were considered and deliberately excluded — a nested servCode
loop inside the progCode loop would be too complex to author and train. The `@p.servTable`
block mention already provides per-service detail using the uniform effective price.

### `progChooserPricing.ts`

Introduced in Phase 2 as a clean foundation. Phase 2 does not exercise the override path
but the function signature accepts `progPriceOverride` so Phase 3 requires no structural changes.

---

## Files Touched Per Phase

| File | Change |
|---|---|
| `QuickSendTypes.ts` | Add `"progChooser"` to `QSVariableKey`; add `"progChooser"` to `TemplateControlId` |
| `quickSendSlice.ts` | Add runtime state fields; add actions |
| `quickSendSelect.ts` | Add `selectActiveProgChooser`; update `CONTROL_DEPS`; update `resolveHtml` |
| `mentionSuggestion.ts` | Add `@progChooser` flat item; add `@p` namespace + leaf items |
| `controls/ProgChooserControl.tsx` | New component (grows each phase) |
| `Containers/QuickSend.tsx` | Add `"progChooser"` case to `renderControl` |

---

## Phase 1 — Core Loop (Minimal Viable Feature) ✅

**Goal:** End-to-end loop works. Author writes `@progChooser` + `@p.*` mentions. User selects
programs at call time. Preview loops paragraphs/rows.

### State added
The `progChooser` field is added to `QuickSendState` as a nested `ProgChooser` object.
Phase 1 only uses `selectedProgCodeIds`; the other fields are initialized to their empty
defaults so the full type is valid from the start.

```ts
progChooser: ProgChooser  // { selectedProgCodeIds: [], servCodeOverrides: {}, ... }
```

### Actions added
- `toggleProgChooserProgCode(progCodeId: string)` — adds or removes a progCodeId from
  `state.progChooser.selectedProgCodeIds`.
- `clearProgChooserSelections()` — resets `state.progChooser` to its initial empty state
  (called by `clearTemplate` / `loadTemplate`).

### Mention changes
- `@progChooser` added to `FLAT_ITEMS`.
- `@p` namespace item added at Level 0.
- `@p.{prop}` leaf items added at Level 2 (reusing `PROG_LEAF_PROPS`).

### `ProgChooserControl` (Phase 1)
- Renders when `"progChooser"` is in `activeControlIds`.
- Shows a flat checkbox list of all available progCodes (from `progServSelect.progCodes`).
- Checking a program adds it to `progChooser.selectedProgCodeIds`.
- No servCode overrides yet — all non-service-call servCodes are included.

### Preview resolver changes
- `@progChooser` span → replaced with empty string.
- Loop paragraphs/rows → cloned once per selected progCode using whole-program pricing
  (all non-service-call servCodes, no overrides).
- `@p.{prop}` mentions inside clones → resolved using `QSProgramVariables` computed for
  that progCode.

### Test scenario
Author writes:
```
@progChooser

@p.description — @p.servPrice each
```
User selects 3 programs. Preview shows 3 lines, one per program.

---

## Phase 2 — ServCode Overrides Per Selected Program

**Goal:** User can expand each selected program and deselect individual servCodes, affecting
per-program pricing.

### Architecture decisions

**Eager write:** When a program is checked in the Select Programs zone, `servCodeOverrides[progCodeId]`
is immediately written with all non-service-call servCodeIds for that program. When unchecked,
the entry is removed. `servCodeOverrides[progCodeId]` is always the authoritative source of
truth for selected programs — no fallback logic is needed in the resolver.

**Two-zone layout:** The control is split into two collapsible accordion zones:
- **`SelectPrograms.tsx`**: flat checkbox list of all available progCodes. Starts expanded.
- **`ConfigurePrograms.tsx`**: one accordion row per selected program, default closed.
  Expanding a row reveals the servCode checkbox list for that program.

**`useProgChooser` hook:** All Redux dispatches are encapsulated in a `useProgChooser` hook
that returns plain functions. Components destructure from this hook; they do not call
`useAppDispatch` directly.

**`ServCodeCheckboxList` shared primitive:** Extracted to `controls/ServCodeCheckboxList.tsx`
and used by both `ProgramConfig` and `ProgChooserProgRow`. Props: `servCodes`, `selected`,
`onChange`.

**`progChooserPricing.ts`:** Introduced as a pure pricing function. Phase 2 does not exercise
override paths but the function signature accepts them for future phases.

**`ProgChooserTypes.ts`:** Types specific to the progChooser feature live here, not in
`QuickSendTypes.ts`.

### State used
`progChooser.servCodeOverrides: Record<string, string[]>` — already declared in the
`ProgChooser` type; initialized to `{}` in Phase 1.

### Actions added
- `setProgChooserServCodeOverride({ progCodeId, servCodeIds })` — writes to
  `state.progChooser.servCodeOverrides[progCodeId]`.
- Cleanup on deselect is handled inside `toggleProgChooserProgCode`: removing a progCodeId
  also deletes its `servCodeOverrides` entry.

### New files
```
controls/
  ServCodeCheckboxList.tsx          ← shared servCode checkbox primitive
progChooser/
  ProgChooserTypes.ts               ← types specific to this feature
  progChooserPricing.ts             ← pure pricing function (price cascade foundation)
  useProgChooser.ts                 ← hook: all dispatch actions
  SelectPrograms.tsx                ← "Select Programs" collapsible zone
  ConfigurePrograms.tsx             ← "Configure Selected" collapsible zone
  ProgChooserProgRow.tsx            ← per-program accordion row in ConfigurePrograms
```

### Updated files
```
controls/ProgramConfig.tsx          ← refactored to use ServCodeCheckboxList
progChooser/ProgChooserControl.tsx  ← refactored to two-zone layout
progChooser/progChooserSelect.ts    ← export servCodeOverrides selector
quickSendSlice.ts                   ← add setProgChooserServCodeOverride; update toggle cleanup
quickSendSelect.ts                  ← resolveProgChooserLoop now accepts pre-computed QSProgramVariables[]
                                       from progChooserSelect.progVars; no longer computes vars inline
```

### Preview resolver changes
- `progChooserSelect.progVars` is the authoritative pricing selector for the loop.
  `quickSendSelect.ts` consumes it as a pre-computed input — no pricing logic in the resolver.
- `resolveProgChooserLoop` signature simplified to `(html, allProgVars)`.
- `quickSendSelect.ts` exports `sizeOverride` to allow `progChooserSelect` to read it
  directly from `AppState` without creating a circular import.

---

## Phase 3 — Price Overrides Per Program

**Goal:** User can manually override the computed price for a selected program (e.g. to offer
a custom deal on a call).

### State used
`progChooser.priceOverrides: Record<string, number>` — already declared in the `ProgChooser`
type; initialized to `{}` in Phase 1.

### Actions added
- `setProgChooserPriceOverride({ progCodeId, price })` — writes to
  `state.progChooser.priceOverrides[progCodeId]`.
- `clearProgChooserPriceOverride(progCodeId)` — deletes
  `state.progChooser.priceOverrides[progCodeId]`, reverting to computed price.

### `ProgChooserControl` changes
- Each selected program row (in expanded view) gets a price override input field.
- Entering a value sets `progChooser.priceOverrides[progCodeId]`.
- Clearing the field removes the override.

### Preview resolver changes
- `progChooserPricing.ts` applies `priceOverrides[progCodeId]` as the per-visit price for
  all servCodes in that program (second level of the cascade).
- `servPrice` in `QSProgramVariables` is unaffected (still reflects price-chart price).
- `subTotal` and `total` reflect the override.

---

## Phase 4 — Prepay Support (Global)

**Goal:** A single prepay code applies to all selected programs. Prepay discount, tax, and
total are computed per program using the shared rate.

### State used
`progChooser.prepayId: string | null` — already declared in the `ProgChooser` type;
initialized to `null` in Phase 1.

### Actions added
- `setProgChooserPrepayId(prepayId: string | null)` — writes to
  `state.progChooser.prepayId`.

### `ProgChooserControl` changes
- A single prepay dropdown at the top of the control (not per-program).
- Selecting a prepay code sets `progChooser.prepayId`.

### Preview resolver changes
- `progChooserPricing.ts` accepts `prepayPercent` and applies it to `prepayDiscAmt`,
  `taxAmt`, and `total` for each loop iteration.
- `@p.prepay` resolves to the prepay percent (same as existing `program.{alias}.prepay`).

---

## Phase 5 — Aggregate Totals

**Goal:** `@progChooser.{aggregate}` mentions resolve to the sum of that field across all
selected programs. These are non-loop mentions — they can be placed anywhere in the template.

### New mention namespace: `@progChooser.{aggregate}`
Added at Level 1 off the `progChooser` namespace in `mentionSuggestion.ts`:
- `@progChooser.subTotal` — sum of all `@p.subTotal`
- `@progChooser.prepayDiscAmt` — sum of all `@p.prepayDiscAmt`
- `@progChooser.taxAmt` — sum of all `@p.taxAmt`
- `@progChooser.total` — sum of all `@p.total`

Per-service prices (`servPrice`, `prefPrice`, `econPrice`) are intentionally excluded because
they are not meaningful as cross-program aggregates.

### Mention system changes
- `@progChooser` becomes a **namespace** item at Level 0 (in addition to being a flat trigger).
- Level 1 items: `subTotal`, `prepayDiscAmt`, `taxAmt`, `total`.
- The flat `@progChooser` trigger (no dot) still inserts the control-trigger mention node.
- `@progChooser.{aggregate}` inserts a separate mention node with id `progChooser.{aggregate}`.

### Preview resolver changes
- After computing all per-program `QSProgramVariables` for the loop, sum the four aggregate
  fields across all selected programs.
- Replace `@progChooser.{aggregate}` spans with the formatted dollar amount.
- If no programs are selected, render as unfulfilled `{{progChooser.{aggregate}}}`.
