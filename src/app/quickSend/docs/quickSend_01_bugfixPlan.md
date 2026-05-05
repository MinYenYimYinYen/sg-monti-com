# QuickSend — Bug Fix Plan

## Issues Addressed

| # | Issue | Status |
|---|---|---|
| 1 | Copy button copies original resolved HTML, not user-edited preview content | In scope |
| 3 | Installment programs bleed into `@totals.*` prepay calculations | In scope |
| 5 | Mentions cannot be inserted in the preview editor | In scope |
| 6 | Preview editor content is not editable (edits are overwritten) | In scope |
| 2 | Dual `@loop` / `@installment` namespace UX is clunky for template authors | Deferred |
| 4 | Template block reusability (`@template` namespace) | Deferred |

---

## Issue 1 + 6 — Copy and Editable Preview

### Root Cause

`PreviewEditor` is a Tiptap editor with `editable: true`, but:

1. **Copy reads from Redux** (`activePreviewHtml` in `QuickSendPage`), not from the editor's live content. After the user edits the preview, the editor diverges from Redux — the copy button sends the stale resolved version.

2. **`setContent` fires on every Redux change.** The `useEffect` watching `previewHtml` calls `editor.commands.setContent(previewHtml)` whenever the selector recomputes. Any Redux state change (customer, programs, size, tax rate) triggers a recompute, which overwrites user edits. The `lastPreviewRef` guard only skips re-sets when the HTML string is byte-for-byte identical — any variable change produces a new string.

3. **The in-place label update `useEffect`** (the second one in `PreviewEditor`) was an attempt to preserve edits while updating mention labels. It is now redundant given the decision below.

### Desired Behavior

- The preview editor is freely editable after the initial render.
- When any variable changes (customer, programs, size, tax rate), the preview **resets** to a fresh resolved render. This is intentional — it supports the "10 interactions" workflow where the user customizes each preview before copying.
- The copy button copies the editor's **current live content**, not the Redux selector output.
- The copy button remains disabled when the live content contains unfulfilled mentions (`{{`).

### Changes

**`src/app/quickSend/Containers/PreviewEditor.tsx`**

- Accept a `ref` prop (via `forwardRef`) that exposes `{ getHtml: () => string }` using `useImperativeHandle`. The parent uses this to read live content at copy time.
- Remove the `lastPreviewRef` guard from the `setContent` effect — always call `setContent` when `previewHtml` changes. This is the intentional reset behavior.
- Remove the second `useEffect` (in-place mention label updates). It is no longer needed.
- Remove the `resolvedVariables` selector read — it was only used by the removed effect.

**`src/app/quickSend/Containers/QuickSendPage.tsx`**

- Hold a `previewEditorRef` and pass it to `<PreviewEditor ref={previewEditorRef} ... />`.
- `handleCopy`: read `previewEditorRef.current?.getHtml() ?? ""` instead of `activePreviewHtml`.
- Copy button `disabled` check: read from `previewEditorRef.current?.getHtml() ?? ""` for the `{{` check.
- `activePreviewHtml` is still needed to pass as the `previewHtml` prop to `PreviewEditor` (it drives the reset). No change there.

---

## Issue 3 — Installment Programs Bleed into Totals

### Root Cause

`selectAggregates` sums `v.total`, `v.subTotal`, `v.taxAmt`, and `v.prepayDiscAmt` across **all** `ProgramVariables` including installment programs. An installment program's `total` includes its full annual price minus prepay discount — neither of which should appear in the prepay totals table.

Additionally, `dropNullOptionalBlocks` uses `allProgVars.length === 0` as the drop condition for `loop.*` blocks. Since `@loop.*` only iterates non-installment programs (already filtered in `resolveLoopMentions`), the drop condition should match — it should drop when there are no non-installment programs, not when there are no programs at all.

### Desired Behavior

Installment programs are fully excluded from all `@totals.*` aggregates. `@totals.subTotal`, `@totals.prepayDiscAmt`, `@totals.taxAmt`, and `@totals.total` reflect only regular (non-installment) programs.

`@loop.*` blocks are dropped when there are no non-installment programs selected (consistent with what `resolveLoopMentions` would produce).

### Changes

**`src/app/quickSend/quickSendSelect.ts`**

- `selectAggregates`: filter `vars` to `v.isInstallment === false` before summing. The `effectivePrepayPercent` input is still used for the `prepayDiscAmt` null-guard.

- `resolveHtml` (and its call in `selectPreviewHtml` / `selectAllPreviewHtmls`): the `nonInstallmentVars` local variable is already computed inside `resolveHtml`. Pass it to `dropNullOptionalBlocks` as the `allProgVars` argument instead of the full `progVars`. Rename the parameter in `dropNullOptionalBlocks` to `nonInstallmentVars` for clarity, or add a separate parameter.

  Current signature:
  ```ts
  function dropNullOptionalBlocks(
    html: string,
    allProgVars: ProgramVariables[],      // used for loop.* drop check
    installmentVars: ProgramVariables[],  // used for installment.* drop check
    aggregates: ProgramAggregates,
  )
  ```

  Updated: pass `nonInstallmentVars` as the first array argument so the `loop.*` drop check matches what `resolveLoopMentions` will actually render.

---

## Issue 5 — Mentions in the Preview Editor

### Desired Behavior

The preview editor supports `@` mention insertion with the same suggestion UI as the template editor. Mentions resolve immediately after insertion. If required data is missing, they show the red-highlight error state (`{{mentionId}}`). The `dropNullOptionalBlocks` conditional rendering does **not** apply in the preview editor — the user sees error-state chips rather than silently dropped blocks, giving immediate feedback.

### Architecture Decision

**Local re-resolve on `onUpdate`** (Option A): The preview editor maintains its own content independently of Redux. When the user inserts a mention, the editor's `onUpdate` fires. At that point, run `resolveHtml` locally against the editor's current HTML using the current selector values (read via refs). Call `setContent` with the resolved result.

This avoids Redux round-trips and keeps the preview editor self-contained. The `resolveHtml` function is extracted to a shared file so both the selector and the preview editor can import it.

To avoid fighting the user's cursor on every keystroke, the re-resolve only runs when the updated HTML contains unresolved mention spans (i.e., `data-type="mention"` nodes whose label still matches their raw `id`). A simple heuristic: check if `editor.getHTML()` contains `data-id=` after `onUpdate` — if so, re-resolve.

### New File

**`src/app/quickSend/lib/resolveHtml.ts`**

Extract the following from `quickSendSelect.ts` into this file (all as named exports):
- `resolveHtml` (the main pipeline function)
- `dropNullOptionalBlocks`
- `resolveLoopLike`, `resolveLoopMentions`, `resolveInstallmentMentions`, `resolveTotalsMentions`
- `resolveProgMention`
- `shouldDropSegment`
- `escapeReplacement`
- `UNFULFILLED_MARK`

`quickSendSelect.ts` imports from `resolveHtml.ts` instead of defining these inline.

### Changes

**`src/app/quickSend/Containers/PreviewEditor.tsx`**

- Add `useSelector` reads for `qsSelect.effectiveProgramConfigs`, `progServSelect.progCodes`, `qsSelect.activeAuxIds` — same pattern as `TemplateEditor`.
- Add `useRef` wrappers for these values so the suggestion callbacks always read the latest.
- Add `suggestion: buildMentionSuggestion({ getSelectedProgCodes, getExistingAuxIds })` to the `Mention` extension config.
- Add `onUpdate` callback: if the editor's current HTML contains `data-id=` (unresolved mentions), run `resolveHtml` locally and call `editor.commands.setContent(resolved, { emitUpdate: false })`.
- The `resolveHtml` call in `onUpdate` needs the current values of: `nameOverride`, `sizeOverride`, `effectiveTaxRate`, `season`, `prepayPercent`, `progVarMap`, `customer`, `auxValues`, `progVars`, `aggregates`. Read these via `useSelector` and store in refs so the `onUpdate` closure always has fresh values.

---

## File Structure Changes

```
src/app/quickSend/
  lib/
    programPricing.ts          (unchanged)
    resolveHtml.ts             ← NEW: extracted from quickSendSelect.ts
  quickSendSelect.ts           ← imports resolveHtml from lib/resolveHtml.ts
  Containers/
    PreviewEditor.tsx          ← forwardRef, mention support, local re-resolve
    QuickSendPage.tsx          ← previewEditorRef, copy reads from editor
```

---

## Open Questions / Decisions Made

| Question | Decision |
|---|---|
| Should variable changes reset the preview or preserve edits? | Reset — supports the 10-interactions workflow |
| Should copy read from Redux or the editor? | Editor live content |
| Should copy be disabled when preview has unfulfilled mentions? | Yes — keep existing `{{` check |
| Should `resolveHtml` be extracted to a shared file? | Yes — `lib/resolveHtml.ts` |
| Should `dropNullOptionalBlocks` apply in the preview editor? | No — show error state instead |
| Should installment programs be excluded from all `@totals.*`? | Yes — fully excluded |
| Template block reusability (`@template` namespace)? | Deferred to a future plan |
| `@loop` / `@installment` dual-namespace UX? | Deferred — behavior is correct after Issue 3 fix |
