# Form Letter PDF Plan

## Goal

Create a PDF document that overlays typed content onto a preprinted form letter (Legal size, 8.5" x 14"). The document must align precisely with fixed fields on the physical form.

---

## Status: Phase 1–3 Complete — Phase 4 In Progress

The template editor is fully functional with a live PDF preview mode. The next step is measuring the physical form and expanding `PrepayLetterData` with the actual form fields.

---

## Decisions Log

| # | Decision | Resolution |
|---|---|---|
| 1 | Units | **Inches.** Converted to points internally (72 pts/inch). |
| 2 | Overflow | **Hidden by default.** Prevents content bleeding into adjacent fields. |
| 3 | Props style | **Flat props.** More explicit than discriminated union for positioning. |
| 4 | Specific form | **Doesn't matter for shared components.** Prepay letter specifics handled in `src/app/prepayLetters/`. |
| 5 | Rendering concern | **`PositionedBox` has no rendering concern.** It is a pure layout primitive. Rendering strategy lives at the feature level. |
| 6 | Template keys | **Typed data contracts.** Keys come from a TypeScript type (`PrepayLetterData`). `samplePrepayLetterData` provides preview values. |
| 7 | Table types | **`LabelValuePair[]`.** Both dynamic (programs) and static (totals) cases use `LabelValuePair[]`. The consuming module transforms domain data into pairs. |
| 8 | `LabelValuePair` formatting | **Per-pair.** `isMoney`, `decimals`, and `annotation` live on each `LabelValuePair`. Allows mixed formatting and annotation within a single list. |
| 9 | Column widths | **Label takes available space; value right-aligns using only the space it needs.** Annotation column (e.g. "10% off") appears between label and value when any pair has one. |
| 10 | Field rendering intent | **`FormLetterDataContract<T>`.** Each data type declares a contract using `satisfies FormLetterDataContract<PrepayLetterData>`. TypeScript enforces exhaustiveness — adding a field to the type without updating the contract is a compile-time error. |
| 11 | Runtime registry | **`FORM_LETTER_DATA_TYPE_REGISTRY`.** Bridges TypeScript types to the editor at runtime. Each entry provides `label`, `sampleData`, `contract`, and optionally `backgroundImage`. |
| 12 | Background image | **`StaticImageData` via `next/image`.** Stored in the registry (not in Mongo). Rendered faintly behind slot boxes in the CSS handles overlay. Kept out of `public/` to prevent direct download. |
| 13 | Renderer ownership | **Feature module owns all renderers.** `FieldDescriptor` carries `label`, `render` (react-pdf), and `previewRender` (DOM). The generic `FormLetterDocument` and editor call these — no component switching on `slot.component`. |
| 14 | Static slots | **Defined in the contract, not in the data type.** Static slots (e.g. salutations, company name) are extra keys in the contract beyond `PrepayLetterData`. Their renderers ignore the `value` argument. |
| 15 | Editor preview modes | **Two modes: Handles and PDF.** Handles mode = CSS overlay with drag handles and `previewRender` content. PDF mode = live `PDFViewer` rendering the actual PDF. Replaces the old "Sample / Labels" toggle. |
| 16 | Drag handles | **Side handles only.** Left/right edges resize width (left also adjusts x). Top/bottom edges resize height (top also adjusts y). Center moves the slot. One dimension changes at a time for precise alignment. |
| 17 | Mirror components | **Eliminated.** The old `PreviewTextField`, `PreviewNumberField`, `PreviewLabelValueList` shared components are deleted. Each feature module provides its own `previewRender` functions in its contract. |
| 18 | `PrepayLetterTypes` file extension | **`.tsx`** — the file contains JSX renderers and must be a `.tsx` file. Imported without extension so bundler resolution handles it. |

---

## Architecture Overview

### The Three Layers

```
Layer 1 — Shared PDF Primitives (src/lib/pdf/_components/)
  PositionedBox       ← absolute positioning, inch coords, overflow hidden
  LabelValueList      ← generic label/value pair renderer (with optional annotation column)
  PDFNumber           ← existing

Layer 2 — Form Template Data Module (src/app/formTemplate/)
  Types, Model, API, Slice, Selectors, Hook, Editor UI
  Stores FormLetterTemplateDoc in MongoDB
  Provides a visual editor for building templates

Layer 3 — Feature-Local Letter (src/app/prepayLetters/)
  PrepayLetterData type + sample data + rendering contract
  PrepayLabelValueList — feature-local PDF component (3-column: label, annotation, value)
  PreviewPrepayLabelValueList — DOM preview for handles mode
  PrepayLetterDocument — feature-local PDF document (TODO)
```

---

## Type System

### FieldDescriptor (renderer contract)

```ts
type FieldDescriptor<TValue = unknown> = {
  label: string;                                          // shown in editor slot list
  render: (value: TValue) => React.ReactNode;             // react-pdf component
  previewRender: (value: TValue, scale: number) => React.ReactNode; // DOM component
};
```

### FormLetterDataContract

```ts
type FormLetterDataContract<T extends FormLetterData> =
  { [K in keyof T]: FieldDescriptor<T[K]> }   // enforces all data keys are covered
  & Record<string, FieldDescriptor<any>>;       // allows additional static keys
```

### Slot (position + key only — no component type)

```ts
type FormLetterSlotDoc = {
  key: string;           // bridges template to contract
  x: number;             // inches from left edge of page
  y: number;             // inches from top edge of page
  width: number;         // inches
  height: number;        // inches
};
```

### Template Document

```ts
type FormLetterTemplateDoc = {
  templateId: string;
  templateName: string;
  dataType: FormLetterDataType;  // narrowed union from FORM_LETTER_DATA_TYPE_REGISTRY keys
  pageSize: "LETTER" | "LEGAL";
  slots: FormLetterSlotDoc[];
};
```

### LabelValuePair

```ts
type LabelValuePair = {
  label: string;
  value: string | number | null;
  isMoney?: boolean;
  decimals?: number;
  annotation?: string;  // e.g. "10% off" — shown between label and value
};
```

### PrepayLetterData (stub — expand after measuring the form)

```ts
type PrepayLetterData = {
  customerName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  programs: LabelValuePair[];
  totals: LabelValuePair[];
};
```

---

## Generic Renderer

```tsx
// src/lib/pdf/FormLetterDocument.tsx
function FormLetterDocument({ template, data, contract }) {
  return (
    <Document>
      <Page size={template.pageSize}>
        {template.slots.map((slot) => {
          const descriptor = contract[slot.key];
          if (!descriptor) return null;
          return (
            <PositionedBox key={slot.key} x={slot.x} y={slot.y} width={slot.width} height={slot.height}>
              {descriptor.render(data[slot.key])}
            </PositionedBox>
          );
        })}
      </Page>
    </Document>
  );
}
```

---

## File Structure

```
src/lib/pdf/
  _components/
    PositionedBox.tsx          ← DONE
    LabelValueList.tsx         ← DONE (annotation column added)
    PDFNumber.tsx              ← existing
    pdfIcons.tsx               ← existing
  FormLetterDocument.tsx       ← DONE (contract-based dispatch)

src/app/formTemplate/
  FormTemplateTypes.ts         ← DONE (simplified — no FormLetterElement union)
  FormTemplateModel.ts         ← DONE (simplified — no component/isMoney/decimals on slot)
  FormTemplateContract.ts      ← DONE
  formTemplateSlice.ts         ← DONE (previewMode: "handles" | "pdf")
  formTemplateSelect.ts        ← DONE
  formLetterDataTypes.ts       ← DONE (FieldDescriptor with render+previewRender; registry with contract)
  useFormTemplate.ts           ← DONE
  api/
    route.ts                   ← DONE
  _components/
    FormTemplateEditor.tsx     ← DONE (Handles/PDF toggle, contract from registry)
    PagePreview.tsx            ← DONE (two-mode: handles overlay + PDFViewer)
    SlotEditor.tsx             ← DONE (shows label from contract)
    DragHandle.tsx             ← DONE (side handles: left/right/top/bottom/center)
    SamplePdfDownload.tsx      ← DONE (passes contract to FormLetterDocument)

src/app/prepayLetters/
  PrepayLetterTypes.tsx        ← DONE (contract with render+previewRender; sample data with annotations)
  PrepayLabelValueList.tsx     ← DONE (feature-local PDF, 3-column with annotation)
  PreviewPrepayLabelValueList.tsx ← DONE (feature-local DOM preview for handles mode)
  prepayLetterForm.jpg         ← DONE (scanned blank form for CSS preview background)
  PrepayLetterDocument.tsx     ← TODO (feature-local PDF document)
  formLetterPlan.md            ← This file
```

---

## Template Editor Features

- **Two-panel layout**: left panel (fields + slot editor + metadata) + right panel (page preview)
- **Available Fields**: derived from `Object.keys(contract)` — includes both data-driven and static keys. Shows human-readable `label` from the contract.
- **Positioned slots**: click to select, edit position in `SlotEditor`
- **Drag handles**: 4 side handles (left/right/top/bottom) + center move handle on selected slot. Each handle changes only one dimension at a time.
- **Zoom**: `−` / `+` buttons (20%–200%), state in Redux
- **Preview modes**: Handles (CSS overlay with `previewRender` content + drag handles) / PDF (live `PDFViewer`)
- **Background image**: faint scanned form rendered behind slots via `next/image`
- **JSON sheet**: view raw template JSON (for debugging)
- **Print Sample**: downloads `sample-{dataType}.pdf` via `usePDF`

---

## Build Phases

### Phase 1 — Shared PDF Primitives ✅
- [x] `PositionedBox.tsx`
- [x] `LabelValueList.tsx` (annotation column added)
- [x] `FormLetterDocument.tsx` (contract-based dispatch)

### Phase 2 — FormTemplate Data Module ✅
- [x] `FormTemplateTypes.ts` (simplified)
- [x] `FormTemplateModel.ts` (simplified)
- [x] `FormTemplateContract.ts`
- [x] `formTemplateSlice.ts` (previewMode: "handles" | "pdf")
- [x] `formTemplateSelect.ts`
- [x] `formLetterDataTypes.ts` (FieldDescriptor with render+previewRender)
- [x] `useFormTemplate.ts`
- [x] `api/route.ts`

### Phase 3 — Template Editor UI ✅
- [x] `PagePreview.tsx` (two-mode: handles overlay + PDFViewer)
- [x] `SlotEditor.tsx` (shows label from contract)
- [x] `FormTemplateEditor.tsx` (Handles/PDF toggle)
- [x] `DragHandle.tsx` (side handles)
- [x] `SamplePdfDownload.tsx` (passes contract)

### Phase 4 — PrepayLetters Feature 🔄
- [x] `PrepayLetterTypes.tsx` — contract with render+previewRender; sample data with annotations
- [x] `PrepayLabelValueList.tsx` — feature-local PDF, 3-column with annotation
- [x] `PreviewPrepayLabelValueList.tsx` — feature-local DOM preview for handles mode
- [x] `prepayLetterForm.jpg` — scanned form background
- [ ] Measure physical form with ruler → update `PrepayLetterTypes.tsx` with real fields
- [ ] Build template in editor → position all fields → save to MongoDB
- [ ] `PrepayLetterDocument.tsx` — feature-local PDF document (when ready to generate real letters)

---

## Coordinate System Reference

- Origin (0, 0) = **top-left** of the page
- X increases to the **right**
- Y increases **downward**
- Legal page = 8.5" wide × 14" tall = 612 pts × 1008 pts

When measuring the physical form:
- Measure from the **left edge** of the paper → `x`
- Measure from the **top edge** of the paper → `y`
- Measure the field **width** and **height**

## Alignment Workflow

1. Open `/formTemplate` in the app
2. Create or load the PrepayLetter template
3. Add fields from the Available Fields list
4. Use drag handles to position each field on the page (Handles mode)
5. Switch to PDF mode to see the live PDF output
6. Click "Print Sample" to download `sample-PrepayLetter.pdf`
7. Hold the printout up to the physical form to verify alignment
8. Adjust positions as needed, repeat
9. Save the template when alignment is confirmed
