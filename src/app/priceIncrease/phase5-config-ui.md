# Phase 5 — Config UI

**Goal:** Implement the Config page UI — settings CRUD, inline season plan editor, and flag mappings picker.

**Prerequisite:** Phases 1–4 complete. All reducers registered. `priceIncreaseSelect` exists.

---

## Required Reading (this phase only)

- `src/app/priceIncrease/priceIncreasePlan.md` — full module spec
- `src/app/priceIncrease/_lib/PriceIncreaseTypes.ts` — `IncreaseFlagMapping`, `IncreaseFlag`
- `src/app/priceIncrease/settings/settingsSelect.ts` — `priceIncreaseSettingsSelect`
- `src/app/priceIncrease/seasonIncreases/seasonIncreasesSelect.ts` — `seasonIncreasesSelect`
- `src/app/globalSettings/_lib/globalSettingsSelect.ts` — `globalSettingsSelect`
- `src/app/realGreen/flag/_selectors/flagSelect.ts` — `flagSelect`
- `src/app/realGreen/progServ/_lib/selectors/progServSelect.ts` — `progServSelect`
- `src/style/components/sheet.tsx` — Sheet component
- `src/style/components/button.tsx` — Button component
- `src/style/components/input.tsx` — Input component

---

## Architecture

### State: `priceIncreaseConfigSlice.ts`

All transient config UI state lives here. Registered as `priceIncreaseConfig` in the root reducer.

```typescript
type InlinePlanMode =
  | { type: "closed" }
  | { type: "new" }
  | { type: "edit"; seasonIncreasesId: string };

type PriceIncreaseConfigState = {
  settingsDraft: PriceIncreaseSettingsDoc | null;
  settingsDeleteConfirmId: string | null;
  inlinePlanMode: InlinePlanMode;
  inlinePlanDraft: SeasonIncreasesDoc | null;
  flagMappingsDraft: IncreaseFlagMapping[];
  flagPickerSelectedId: number | null;
};
```

**Actions:**
- `openSettingsSheet(doc | null)` — opens settings sheet; also resets inline plan state
- `closeSettingsSheet()` — closes sheet and resets inline plan state
- `updateSettingsDraft(partial)`
- `setSettingsDeleteConfirm(id | null)`
- `openInlinePlanNew()` — generates UUID, initializes blank draft
- `openInlinePlanEdit(doc)` — copies doc into draft
- `closeInlinePlan()`
- `updateInlinePlanDraft(partial)` — only `label` field
- `addInlinePlanRow()` — appends `{ season: index+2, increasePercent: 0 }`
- `removeLastInlinePlanRow()`
- `updateInlinePlanRowPercent({ index, increasePercent })`
- `setFlagMappingsDraft(mappings[])`
- `addFlagMapping(flagId)` — adds with `increasePercent: 0`, clears picker selection
- `removeFlagMapping(flagId)`
- `updateFlagMappingPercent({ flagId, increasePercent })`
- `setFlagPickerSelected(flagId | null)`

### Selectors: `priceIncreaseConfigSelect.ts`

```typescript
// Settings
priceIncreaseConfigSelect.settingsDraft
priceIncreaseConfigSelect.settingsSheetOpen
priceIncreaseConfigSelect.settingsDeleteConfirmId

// Inline plan editor
priceIncreaseConfigSelect.inlinePlanMode
priceIncreaseConfigSelect.inlinePlanIsOpen
priceIncreaseConfigSelect.inlinePlanIsNew
priceIncreaseConfigSelect.inlinePlanDraft
priceIncreaseConfigSelect.inlinePlanDraftRows   // SeasonIncrease[] + cumulativePercent
priceIncreaseConfigSelect.inlinePlanIsDirty     // always true in new mode; deepEqual in edit mode
priceIncreaseConfigSelect.inlinePlanCanSave     // dirty && label.length > 0

// Flag mappings
priceIncreaseConfigSelect.flagMappingsDraft
priceIncreaseConfigSelect.flagMappingsDraftSorted    // sorted ascending by increasePercent
priceIncreaseConfigSelect.flagMappingsDraftHydrated  // joined with flagDocMap → IncreaseFlag[]
priceIncreaseConfigSelect.availableFlags             // flagDocs not yet in draft
priceIncreaseConfigSelect.flagPickerSelectedId
priceIncreaseConfigSelect.flagMappingsIsValid        // all non-zero, no duplicates
priceIncreaseConfigSelect.flagMappingsIsDirty        // deepEqual vs stored GlobalSettings
```

---

## Component Tree

```
config/page.tsx
  ConfigPanel
    SettingsSection          ← card list of PriceIncreaseSettings docs
      SettingsSheet          ← right-side sheet for add/edit
        InlinePlanEditor     ← inline accordion for season plan CRUD
    FlagMappingsSection      ← FlagPicker + exempt/manual dropdowns
      FlagPicker             ← dual-box flag selector
```

---

## Component Details

### `ConfigPanel.tsx`

- Seeds `flagMappingsDraft` from `globalSettingsSelect.increaseFlagMappings` on mount via `useEffect`
- Renders `SettingsSection` and `FlagMappingsSection`

### `SettingsSection.tsx`

- Card list of all `PriceIncreaseSettingsDoc` records
- Active card highlighted with `bg-accent/10 border-accent/30` and "Active" badge
- Actions per card: **Set Active**, **Edit**, **Delete** (inline confirm — two-click)
- **New** button generates UUID via `crypto.randomUUID()` and opens sheet
- Renders `SettingsSheet` at the bottom

### `SettingsSheet.tsx`

Right-side sheet (480px wide, scrollable). Fields:
- **Label** — text input
- **Program** — `<select>` from `progServSelect.progCodes` (shows `progCodeId`)
- **Increase Plan** — `<select>` from `seasonIncreasesSelect.docs` (shows `label`) + Edit (✎) and New (+) icon buttons
- **`InlinePlanEditor`** — renders inline below the Increase Plan row when open
- **Max Now / Max Ever / Ongoing** — number inputs (3-column grid)
- **Upsell Threshold / Upsell Bonus / Min Increase** — number inputs (3-column grid)
- **Manual Attention Threshold** — number input
- **Flag Rounding** — styled radio group (round / ceil / floor) with descriptions

Save button disabled unless `label`, `progCodeId`, and `seasonIncreasesId` are all non-empty.

### `InlinePlanEditor.tsx`

Inline accordion that appears below the Increase Plan dropdown in `SettingsSheet`.

- Shows when `inlinePlanIsOpen` is true
- Header: "New Increase Plan" or "Editing: {label}" with "(unsaved changes)" indicator
- **Label** input
- **Season rows**: 3-column grid (Season label | Increase % input | Cumulative %)
  - Season numbers are display-only (S2, S3, ...)
  - Cumulative is computed by `priceIncreaseConfigSelect.inlinePlanDraftRows`
- **Add Season** / **Remove Last** buttons
- **Save Plan** (disabled unless `inlinePlanCanSave`) / **Cancel** buttons
- On save: dispatches `upsertSeasonIncreases` with recomputed season numbers, calls `onPlanSaved(seasonIncreasesId)` to auto-select in settings draft, closes inline editor

### `FlagMappingsSection.tsx`

- Section header with **Save Changes** button
  - `variant="destructive"` when `flagMappingsIsDirty && flagMappingsIsValid`
  - Disabled when `!flagMappingsIsValid || !flagMappingsIsDirty`
- On save: optimistic `setSettings` dispatch + `updateSettings` API call
- Renders `FlagPicker`
- Validation error message when draft has zero-value or duplicate percents
- **Exempt Flag** and **Manual Flag** dropdowns below the picker
  - Sourced from `flagSelect.flagDocs` (all available flags, not just mapped ones)
  - Save immediately on change via optimistic `setSettings` + `updateSettings`

### `FlagPicker.tsx`

Dual-box picker:
- **Left box**: scrollable list of `availableFlags` (flags not yet mapped). Click to select/deselect.
- **Center**: `>` button (add selected) and `<` button (remove all)
- **Right box**: sorted by `increasePercent` ascending (via selector). Each row:
  - Flag `desc` (no flagId shown)
  - Integer-only percent input (1 = 1%)
  - Remove (✕) button

---

## Key Behaviors

- **UUID generation**: Both `settingsId` and `seasonIncreasesId` are generated client-side via `crypto.randomUUID()`. Users only enter a label.
- **Inline plan auto-select**: After saving a new plan via `InlinePlanEditor`, the new `seasonIncreasesId` is automatically selected in the settings draft via the `onPlanSaved` callback.
- **Inline plan dirty check**: In `new` mode, always dirty. In `edit` mode, uses `deepEqual` against the stored doc from `seasonIncreasesSelect.docs`.
- **Flag mappings dirty check**: Uses `deepEqual` against `globalSettingsSelect.increaseFlagMappings` (sorted ascending by `increasePercent`).
- **Optimistic updates**: Flag mappings save and exempt/manual flag changes dispatch `setSettings` before the API call so the UI reflects the change immediately.
- **Season plan CRUD location**: Season plans are managed exclusively via `InlinePlanEditor` inside `SettingsSheet`. There is no standalone Season Plans section on the config page.

---

## Verification

Run `tsc --noEmit` after completing all components. Confirm zero type errors.
