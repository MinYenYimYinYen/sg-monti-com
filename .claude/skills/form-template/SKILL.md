---
name: form-template
description: Work with the form template system in src/app/formTemplate - positioned slots on a preprinted form, the FormDataContract renderer map, the form data type registry, slot option schemas, FormDocument PDF rendering, and the template editor. Use when adding a form data type, adding or changing a slot or slot option, changing the template editor, or building a module that prints many pages of a form (batch mail merge).
---

# Form Template

Read `src/app/formTemplate/formDataContract.ts` first. The types and their comments are the spec. `src/app/prepayLetters/template/PrepayLetterTypes.tsx` is the one working consumer; copy its structure.

For PDF rules (`tw()`, no semantic colors, text inside `<Text>`), also load the `pdf-document` skill. The `render` half of every descriptor is react-pdf.

## Mental model

A **template** stores only where things go. A **data type** knows what goes there.

```
FormTemplateDoc.slots[i] = { slotId, key, x, y, width, height, options }
                                      |
FORM_DATA_TYPE_REGISTRY[template.dataType].contract[key]
                                      |
              render(data, options)  /  previewRender(data, scale, options)
```

- Slots hold position (inches, origin top-left, y down) and loose `options`. Never content.
- `key` is the bridge. A slot whose key is not in the contract is silently skipped by `FormDocument`.
- Every renderer receives the **whole data object**, not one field. Static slots (salutation, company name) ignore it.
- The same `key` may appear in many slots. `slotId` is the identity, never `key`.

## Naming (these are easy to confuse)

| Name | What it is |
|---|---|
| `formTemplate` (module) | The data module: Mongo-stored templates, slice, API, editor |
| `FormTemplateContract` | The **API** contract (`getAll`, `upsert`, `deleteOne`) |
| `FormDataContract<TData, TSlots>` | The **renderer map** for one data type. Not an API |
| `FormDataTypeDescriptor` | One registry entry: `label`, `sampleData`, `contract`, `backgroundImage?` |
| `FORM_DATA_TYPE_REGISTRY` / `FormDataType` | Registry and the union of its keys |
| `FormDocument` (`src/lib/pdf/`) | Renders one template + one data object as one page |

The word "Letter" belongs only to features (`PrepayLetterData`). The Mongoose model name is still the string `"FormLetterTemplate"` because it fixes the collection name. Never rename it.

## File map

```
src/app/formTemplate/            generic, imports no feature
  formDataContract.ts            descriptor, contract and registry-entry types, hasOptions()
  slotOptionSchema.ts            option schema + getSchemaDefaults. No React/Mongoose/Next imports
  FormTemplateTypes.ts           FormTemplateDoc<TDataType = string>, FormTemplateSlotDoc
  FormTemplateModel.ts, FormTemplateContract.ts, api/route.ts
  formTemplateSlice.ts, formTemplateSelect.ts, useFormTemplate.ts
  _components/                   editor: FormTemplateEditor, PagePreview, SlotEditor, DragHandle, SamplePdfDownload
  page.tsx                       passes FORM_DATA_TYPE_REGISTRY into the editor
src/app/formDataTypes/
  formDataTypeRegistry.ts        the ONLY file that imports features
src/lib/pdf/FormDocument.tsx     generic PDF page renderer
src/app/<feature>/<Feature>Types.tsx   data type, slot keys, contract, sample data, form image
```

### Dependency direction

`feature -> formTemplate` (types only) and `formDataTypeRegistry -> formTemplate + features`. **`formTemplate` must never import a feature or the registry.** The editor receives the registry as the `dataTypeRegistry` prop. `FormTemplateDoc.dataType` is a plain `string` inside the module; code that holds the registry may narrow it to `FormDataType`. A stored template can outlive its data type, so lookups must tolerate an unregistered `dataType`.
## Add a form data type

1. In `src/app/<feature>/`, create `<Feature>Types.tsx` (`.tsx`, it contains JSX renderers; add `"use client"`).
2. Define `<Feature>Data` (everything a renderer may need, fully hydrated) and a slot-key union `<Feature>Slot`.
3. Define option types with `SlotOptionSchema<T>` (reuse a shared `textOptionSchema` style). Add `type WithText = FieldDescriptorWithOptions<<Feature>Data, TextOptions>` shorthands.
4. Write the contract: each key has `label`, `optionSchema?`, `render` (react-pdf) and `previewRender` (DOM, multiply sizes by `scale`). End with `satisfies FormDataContract<<Feature>Data, <Feature>Slot>` so a missing key fails to compile. Each descriptor uses `satisfies WithText` etc.
5. Export `sample<Feature>Data` built with the shared sample-data helpers (`generateCustomer` for customers, never hand-built entities). If there is a scan of the blank form, import it statically (not from `public/`) and export it.
6. Add one entry to `FORM_DATA_TYPE_REGISTRY` in `src/app/formDataTypes/formDataTypeRegistry.ts`. Nothing else changes; the editor picks it up.

## Rules that cause silent breakage

1. **Renaming or removing a slot key orphans stored templates.** Unknown keys are skipped without any error. Keep the old key, or write a one-off migration, and say so in the summary.
2. **Options:** adding one is safe (defaults are merged under stored values). Removing one is harmless. **Changing an option's type is not safe**: a stored value of the old type is passed through. Give it a new name instead.
3. **`render` and `previewRender` are separate code paths.** Change both together and keep them visually equivalent.
4. **Renderers are pure and synchronous.** No fetching, no hooks, no dispatch. Hydrate data before it reaches the contract.
5. A renderer that returns `null` leaves its box empty (used for optional content such as upsells). A renderer that throws breaks the whole document.
6. `render` obeys the `pdf-document` rules. `previewRender` is DOM and follows `ui-styling`.
7. The registry and `FormDataContract` hold `any`/`unknown` data at the boundary. Type safety lives in each feature's `satisfies`, so never skip it.
8. Editor components: prop functions end in `Action`; delete handlers take a `slotId`.
9. Do not use `useEffect` + `setState` for client checks; use `useIsClient()` for client-only rendering (`PDFViewer`, `usePDF`).

## Printing many pages (batch module)

First implementation: `src/app/prepayLetters/renewalLetters/useRenewalLetterPdf.tsx`. It renders one `FormBatchDocument` per batch row with `pdf(...).toBlob()`, saves into a folder picked once (File System Access API, Chromium) or falls back to one anchor download per file. Rendering is unchunked (largest batch is about 1600 letters, not yet measured) and one failed file is reported by name without stopping the rest. `src/lib/pdf/FormPage.tsx` holds the shared slot loop used by both `FormDocument` and `FormBatchDocument`. The guidance below was written before it was built, so the chunking advice is still unverified.

- Reuse templates and contracts unchanged. Do not fork a data type for batch use.
- `FormDocument` renders exactly one `Page`. A batch needs a sibling that maps `dataItems` to many pages. Extract the per-page slot loop into a shared function used by both, so the single and batch paths cannot drift.
- Hydrate each page's data before rendering, in a selector or thunk. Never inside a renderer (rule 4).
- 100s to 1000s of pages in the browser with `usePDF`/`PDFViewer` is likely slow and memory-heavy. Measure before committing to browser rendering; server-side `renderToBuffer` or chunked PDFs (for example 100 to 250 pages each) are the alternatives. Do not assume.
- Decide up front how one bad record is handled: validate all data first, or isolate failures per page and report them. Never let one record abort a whole run silently.
- Mailing concerns to settle with the user: ordering (postal presort), duplex/back pages, and a manifest of what was printed.

## Verify

Check that nothing under `src/app/formTemplate/` imports a feature or `formDataTypeRegistry` (only `page.tsx` may). You cannot see the rendered PDF, so state that layout was not visually checked.