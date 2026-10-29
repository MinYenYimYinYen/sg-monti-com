---
name: entity-file-menu
description: Add the standard File menu + active entity name + Save / Save As controls to a feature header for a draft-based, named entity (configs, templates, scenarios). Use when a feature edits a draft that is saved under a name, and needs Open / New / Save / Save As / unsaved-changes handling in its layout header.
---

# Entity File Menu

Reference implementation: `src/app/prepayLetters/config/_components/PrepayConfigFileControls.tsx`, rendered from `src/app/prepayLetters/layout.tsx` in the `PageLayout.Header` `left` slot.

Shared component: `src/components/EntityFileControls/` (`EntityFileControls`, `SaveAsDialog`, `UnsavedChangesDialog`). Do not rebuild these per feature; write a thin wrapper that wires the feature's selectors and actions into `EntityFileControls`.

## What the user sees

`[File ▾] [active name] [unsaved] [Save] [Save As]`

- **File menu**: New, Open…, plus consumer-supplied `extraMenuItems` (e.g. Delete) after a separator.
- **Active name**: shown next to File. Empty string shows "Untitled". Nothing is shown when `activeName` is `null`.
- **Save** (`variant="secondary" intensity="soft"`): not rendered when `activeName` is `null`. Rendered but disabled when `!isDirty || !canSave`.
- **Save As**: rendered only when `supportsMultiple` (default true), `onSaveAsAction` is given, and there is an active entity. Enabled even when clean.
- **Save As dialog**: name input prefilled with "`<name> copy`". If the trimmed, case-insensitive name matches anything in `existingNames`, an inline notice appears and the confirm button becomes a destructive **Overwrite**. Empty names cannot be confirmed.
- **Unsaved-changes guard**: `warnOnUnsavedChanges` (default true). New and Open show "Discard unsaved changes?" when `isDirty`.

## What the feature must supply

Selectors (in `featureSelect.ts`):
- `isDirty`: `false` when there is no draft; `true` when the draft has no saved match (looked up by natural key through a `Grouper` map); otherwise `!deepEqual(draft, saved)` using `@/lib/primatives/typeUtils/deepEqual`.
- `activeDisplayName`: `string | null`. `null` means no active entity.
- `existingNames`: the names a Save As can collide with. Scope this to what the backend actually keys on (e.g. own entities only when the key includes the owner).

Props wired in the wrapper: `onSaveAction`, `onSaveAsAction({ name })`, `onNewAction`, `onOpenAction`. Callback props must end in `Action`.

## Rules

- **Permissions belong to the API.** The UI does not enforce ownership on overwrite; a user without permission never receives the data. Any further UI restriction is the consumer's choice, passed through `canSave`.
- **After a successful save, the slice must set the draft to the saved doc** (`extraReducers` on the save thunk). This is what clears `isDirty` and switches the active entity to a Save As copy. Without it the header stays dirty.
- Save As builds a new doc with the key field blank (or new) and the new name; let the server generate the key.
- Hooks expose actions only; components read selectors directly (see `AGENTS.md`).
- Use `Dialog` from `@/style/components/dialog` for confirmations, not `Modal`.
- Semantic colors only; no `useMemo`/`useCallback`.
- Features with a single entity set `supportsMultiple={false}` and omit `onSaveAsAction`.
