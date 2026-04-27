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
  servCodeOverrides: Record<string, string[]>; //Phase 2
  priceOverrides: Record<string, number>; //Phase 3
  servPriceOverrides: Record<string, Record<string, number>>; // Phase 4
  prepayId: string | null; // Phase 5
}
```

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

## Phase 1 — Core Loop (Minimal Viable Feature)

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

### State used
`progChooser.servCodeOverrides: Record<string, string[]>` — already declared in the
`ProgChooser` type; initialized to `{}` in Phase 1.

### Actions added
- `setProgChooserServCodeOverride({ progCodeId, servCodeIds })` — writes to
  `state.progChooser.servCodeOverrides[progCodeId]`.

### `ProgChooserControl` changes
- Each selected program row becomes expandable (accordion).
- Expanded view shows servCode checkboxes (same pattern as existing `ProgramConfig` control).
- Toggling a servCode updates `progChooser.servCodeOverrides[progCodeId]`.

### Preview resolver changes
- When computing `QSProgramVariables` for a loop iteration, use
  `progChooser.servCodeOverrides[progCodeId]` if present, otherwise default to all
  non-service-call servCodes.

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
- If `progChooser.priceOverrides[progCodeId]` is set, use it as `servPrice` and recompute
  `subTotal` and `total` accordingly. `prefPrice` and `econPrice` are unaffected.

---

## Phase 4 — Per-ServCode Price Overrides

**Goal:** User can override the price of individual servCodes within a selected program,
enabling fine-grained pricing adjustments.

### State used
`progChooser.servPriceOverrides: Record<string, Record<string, number>>` — already declared
in the `ProgChooser` type; initialized to `{}` in Phase 1.

### Actions added
- `setProgChooserServPriceOverride({ progCodeId, servCodeId, price })` — writes to
  `state.progChooser.servPriceOverrides[progCodeId][servCodeId]`.
- `clearProgChooserServPriceOverride({ progCodeId, servCodeId })` — deletes the entry.

### `ProgChooserControl` changes
- Each servCode row (in the expanded program view) gets a price override input.
- Entering a value sets `progChooser.servPriceOverrides[progCodeId][servCodeId]`.

### Preview resolver changes
- When computing `QSProgramVariables` for a loop iteration, apply per-servCode price
  overrides before summing to `servPrice` and `subTotal`.
- `@p.servTable` rows also reflect the per-servCode overrides.

---

## Phase 5 — Prepay Support (Global)

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
- When computing `QSProgramVariables` for each loop iteration, use `progChooser.prepayId`
  to look up the prepay percent and apply it to `prepayDiscAmt`, `taxAmt`, and `total`.
- `@p.prepay` resolves to the prepay percent (same as existing `program.{alias}.prepay`).

---

## Phase 6 — Aggregate Totals

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
