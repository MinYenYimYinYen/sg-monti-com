# Prepay Letters: Possible Issues

## 1. Messaging fields are stored as HTML, letters need plain text

### How configs are stored

- The seven messaging fields on `PrepayConfig` (`universalMessage`, `autoRenewMessage`, `dontAutoRenewMessage`, `autoRenewHeader`, `dontAutoRenewHeader`, `currentServicesHeader`, `upsellServicesHeader`) are tiptap HTML strings written by `MentionEditor`.
- A mention chip is stored as `<span data-type="mention" data-id="season" ...>@season</span>`. **`data-id` is the content.** The text inside the span is only a cached display label.
- `MentionEditor` canonicalizes its output (`MentionEditorUtils.canonicalizeMentions`), so new saves contain `@<id>` as the chip text.
- Configs saved before that change (e.g. "November Letters") have resolved values such as `2027` baked into the chip text. They are rewritten to the canonical form on their next save.
- `prepayConfigSelect.isDirty` compares with chip text canonicalized, so those older configs do not show as unsaved on open.

### What letter generation must do

The stored HTML cannot be put into a PDF directly. Letter generation must resolve it to plain text:

- Use `prepayConfigSelect.parsedDraft`, or call `MentionEditorUtils.resolve(html, vars, prepayLetterVarParsers)` on a loaded config.
- `resolve` replaces each chip with `parsers[id](vars[id])` and strips the remaining tags. It resolves against the config's *current* values (season, discount percents, expiration date), so the output never goes stale.
- Never read the raw HTML fields when rendering a letter.

### Known limits of `resolve()` and `canonicalizeMentions()`

- Both regexes expect `data-type="mention"` before `data-id` in the span's attributes. This holds for tiptap's current output and would break if the serialization order changed.
- Formatting is flattened. `</p>` and `<br>` become newlines; bold, italics and lists are lost.
- Only a few HTML entities are decoded (`&amp; &lt; &gt; &nbsp; &quot;`). Others, such as `&#39;`, pass through as-is.
- An unknown variable id falls back to the raw id, so a typo appears in the letter as plain `foo`.

### Alternative considered: store `{ editor, rawText }` per field

Changing each messaging field from `string` to `{ editor: string; rawText: string }` would avoid parsing at letter time.

Not adopted, because:

- It creates two sources of truth that can drift. `rawText` goes stale when `season`, a discount or the expiration date changes without the text being edited, unless it is recomputed on every save.
- It cannot support customer-level mentions (for example a customer name), because those can only be resolved at render time.
- It needs a type change, a Mongoose schema change, API changes, a migration of existing documents, and edits to every field in `PrepayConfigPage`.

Revisit if something outside this app needs plain text directly from the database. In that case compute `rawText` in the save path (API or `saveConfig`), never in the editor's `onChange`, so it cannot go stale.

Precedent for storing both: `RouteNoteEditor` saves `noteHtml` plus a plain `note` resolved at save time. That works there because it has no variables.