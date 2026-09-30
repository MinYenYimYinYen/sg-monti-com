# MentionEditor

A generic, reusable tiptap-based rich text editor that supports `@variable` mentions for flat, primitive variable sets. Built for use in config forms where users author template text that references live data values.

---

## Files

```
src/components/MentionEditor/
  MentionEditorUtils.ts   — Core types and static utility class
  MentionEditor.tsx       — Generic React component
  MentionList.tsx         — Keyboard-navigable mention dropdown
  mentionSuggestion.ts    — Tiptap suggestion config (flat variable list)
```

---

## Concepts

### FlatVars

The type constraint for the variable set `T`. Every key must be `string | number` — no nested objects, arrays, or booleans. This is enforced at compile time via:

```typescript
type _AssertFlat = MyVarsType extends FlatVars ? true : never;
```

If a non-primitive is added to the vars type, TypeScript errors at this assertion.

### VarParsers\<T\>

A mapped type that requires a formatter function for every key of `T`. Used with `satisfies` to get exhaustiveness checking — if a new key is added to `T`, TypeScript errors at the `satisfies` call site until a parser is provided.

```typescript
export type VarParsers<T extends FlatVars> = {
  [K in keyof T]: (value: T[K]) => string;
};
```

### MentionEditorUtils (static class)

Three static methods:

| Method | Purpose |
|---|---|
| `resolve(html, vars, parsers)` | Replaces all mention nodes in tiptap HTML with resolved plain text. Strips remaining HTML tags. Returns a plain text string. |
| `resolveOne(id, vars, parsers)` | Resolves a single variable id to its display string. Used internally by the editor. |
| `getSuggestionItems(vars, query)` | Returns the filtered `@` suggestion list from the keys of `vars`. |

---

## Component: `<MentionEditor<T>>`

### Props

```typescript
type Props<T extends FlatVars> = {
  value: string;           // Stored tiptap HTML (with mention nodes)
  onChange: (html: string) => void;
  vars: T;                 // Live variable values — keys become available @ mentions
  parsers: VarParsers<T>;  // Formatters for each variable
  disabled?: boolean;
  placeholder?: string;
  minHeight?: string;      // CSS min-height for the editor area (default: "80px")
};
```

### Modes

Toggled via the eye icon (top-right corner of the editor). Both modes are fully editable.

| Mode | Chip display | When to use |
|---|---|---|
| `"resolved"` (default) | Live value from `vars` (e.g. `2027`) | Normal editing — user sees what the letter will say |
| `"vars"` | Raw variable name (e.g. `@season`) | Inspecting template structure |

### Stored Format

The `value` prop and `onChange` output are always raw tiptap HTML with ProseMirror mention nodes:

```html
<p>The season is <span data-type="mention" data-id="season" data-label="season">2027</span>.</p>
```

The `data-id` attribute is the stable variable key. The visible text content is the display label (which changes with mode/vars). **Never parse the visible text — always use `data-id` for identity.**

### @ Mention Trigger

Type `@` anywhere in the editor to open the suggestion dropdown. The list is filtered by the characters typed after `@`. Press `Enter` or click to insert. Press `Escape` to dismiss.

Available variables are derived from `Object.keys(vars)` — no configuration needed beyond passing the `vars` prop.

---

## Usage

### 1. Define your vars type

```typescript
// Must extend FlatVars (string | number values only)
export type MyVars = {
  season: number;
  discountPercent: number;
  expirationDate: string;
};

// Compile-time guard — errors if a non-primitive is added
type _AssertFlat = MyVars extends FlatVars ? true : never;
const _check: _AssertFlat = true;
void _check;
```

### 2. Define parsers (with exhaustiveness enforcement)

```typescript
import type { VarParsers } from "@/components/MentionEditor/MentionEditorUtils";

export const myVarParsers = {
  season: (v) => String(v),
  discountPercent: (v) => `${v}%`,
  expirationDate: (v) => v,
} satisfies VarParsers<MyVars>;
// ^ TypeScript errors here if a key is missing from MyVars
```

### 3. Use in a form component

```tsx
import { MentionEditor } from "@/components/MentionEditor/MentionEditor";
import { myVarParsers } from "./myVarParsers";

function MyForm({ draft, onUpdate }: Props) {
  const vars: MyVars = {
    season: draft.season,
    discountPercent: draft.discountPercent,
    expirationDate: draft.expirationDate,
  };

  return (
    <MentionEditor
      value={draft.messageHtml}
      onChange={(html) => onUpdate({ messageHtml: html })}
      vars={vars}
      parsers={myVarParsers}
      placeholder="Type your message… use @ to insert variables"
      minHeight="80px"
    />
  );
}
```

---

## Redux Selector Integration

The `MentionEditorUtils.resolve()` method is designed to be called inside a `createSelector` to produce plain-text versions of template fields for downstream consumption (e.g. rendering the actual letter output).

### Pattern

```typescript
// In myFeatureSelect.ts
import { MentionEditorUtils } from "@/components/MentionEditor/MentionEditorUtils";
import { myVarParsers } from "./myVarParsers";
import type { MyVars } from "./myFeatureTypes";

const selectParsedDraft = createSelector([selectDraft], (draft) => {
  if (!draft) return null;

  // Extract only the vars subset — the full doc type may contain booleans etc.
  // that don't satisfy FlatVars.
  const vars: MyVars = {
    season: draft.season,
    discountPercent: draft.discountPercent,
    expirationDate: draft.expirationDate,
  };

  const resolve = (html: string) =>
    MentionEditorUtils.resolve(html, vars, myVarParsers);

  return {
    ...draft,
    messageHtml: resolve(draft.messageHtml),   // now plain text
    headerHtml: resolve(draft.headerHtml),
  };
});
```

### Why extract vars explicitly?

The full document type (e.g. `PrepayConfig`) contains fields like `showCreditBalance: boolean` that violate the `FlatVars` constraint. Passing the full doc to `resolve()` would be a TypeScript error. Extracting only the `MyVars` subset is the correct pattern.

### What `resolve()` does

1. Finds all `<span data-type="mention" data-id="...">` nodes in the HTML.
2. Looks up the `data-id` in `vars` and formats it with the matching parser.
3. Strips all remaining HTML tags (converting `<br>`, `</p>` etc. to newlines).
4. Returns a clean plain text string.

---

## How Chip Labels Stay in Sync

Tiptap's `renderHTML` is called when a node's ProseMirror **attributes** change — not on React re-renders. To keep chip labels live:

1. A `useEffect` in `MentionEditor` watches `[vars, parsers, mode]`.
2. On change, it walks `editor.state.doc.descendants()` to find all mention nodes.
3. For each node, it computes the new label and calls `tr.setNodeMarkup(pos, ...)` to patch the `label` attribute.
4. All patches are batched into a single transaction dispatched with `addToHistory: false` (so it doesn't pollute undo history or trigger `onChange`).
5. ProseMirror re-renders only the affected nodes.

This is why `renderHTML` simply reads `node.attrs.label` — the effect keeps it current.

---

## Constraints and Gotchas

- **`T` must be flat**: Only `string | number` values. Booleans, objects, and arrays are not supported and will cause a TypeScript error at the `_AssertFlat` assertion.
- **`parsers` must be exhaustive**: Use `satisfies VarParsers<T>` — not `as VarParsers<T>`. The `satisfies` keyword gives you the exhaustiveness check; `as` would silently allow missing keys.
- **Stored HTML contains display labels**: The `data-id` is the stable key; the text content is the display label. When loading saved HTML back into the editor, the effect will immediately re-resolve labels to match the current `vars` and `mode`.
- **No toolbar**: This editor is intentionally plain text with mention support only. For rich text editing (bold, headings, tables), see `src/app/quickSend/Containers/TemplateEditor.tsx`.
- **`onChange` fires on user edits only**: The label-patching transaction uses `addToHistory: false` and does not trigger `onChange`. The stored HTML always contains the raw `data-id` — not the resolved display value.
