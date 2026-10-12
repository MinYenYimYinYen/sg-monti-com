# Form Letter PDF Plan

## Goal

Create a PDF document that overlays typed content onto a preprinted form letter (Legal size, 8.5" x 14"). The document must align precisely with fixed fields on the physical form.

## Status: Planning — Awaiting Decisions

---

## Technical Approach

`@react-pdf/renderer` supports `position: "absolute"` with `top` and `left` props (in points, 72 pts/inch). This is how content is pinned to specific coordinates on the page to match a preprinted form.

A shared `BoundingBox` component will wrap this pattern, making it easy to place content at exact locations without writing raw style objects each time.

---

## BoundingBox Component (Proposed)

**Location:** `src/lib/pdf/_components/BoundingBox.tsx`

### Proposed Props

```tsx
type BoundingBoxProps = {
  x: number;        // left edge — in inches from page left
  y: number;        // top edge — in inches from page top
  width: number;    // box width — in inches
  height: number;   // box height — in inches
  align?: "topLeft" | "center";  // default: "topLeft"
  debug?: boolean;  // draws a visible border for alignment testing
  children: React.ReactNode;
};
```

Internally, inches are converted to points (`pts = inches * 72`) since that is the native PDF unit.

### Alignment Modes

- **`topLeft`** (default): Content flows from the top-left corner of the box. Standard for text fields.
- **`center`**: Content is centered both horizontally and vertically within the box. Useful for stamps, seals, or single-value fields.

### Debug Mode

When `debug={true}`, a visible border is drawn around the bounding box. This is used during development to verify alignment against the physical form — print with debug on, hold up to the preprinted form, adjust coordinates, repeat.

---

## Open Decisions (Need User Input)

1. **Units confirmed as inches?** — Inches are more natural when measuring a physical form with a ruler. The component converts to points internally. *(Assumed yes — confirm.)*

2. **Overflow behavior** — If content overflows the bounding box, should it clip (`overflow: "hidden"`) or be allowed to overflow? Clipping is safer for form overlays to prevent bleeding into adjacent fields. *(Assumed clip — confirm.)*

3. **Discriminated union vs flat props** — Current proposal uses flat props with an `align` enum. Alternative: discriminated union where `topLeft` takes `{ x, y, width, height }` and `center` takes `{ cx, cy }` (center-point coordinates). *(Awaiting preference.)*

4. **What is the specific form?** — Is this in `src/app/prepayLetters/`? What fields need to be filled in, and do we have the physical form to measure coordinates from?

5. **Rendering strategy** — `usePDF` (blob URL + iframe + download button) or `PDFViewer` (live in-page preview)? For a form letter that's printed and mailed, `usePDF` with a download button is likely the right choice.

---

## Coordinate System Reference

- Origin (0, 0) = **top-left** of the page
- X increases to the **right**
- Y increases **downward**
- Legal page = 8.5" wide × 14" tall = 612 pts × 1008 pts

When measuring the physical form:
- Measure from the **left edge** of the paper to get X
- Measure from the **top edge** of the paper to get Y
- Measure the field **width** and **height**

---

## Next Steps

1. Get answers to open decisions above
2. Build `BoundingBox.tsx` in `src/lib/pdf/_components/`
3. Update `pdf.readme.md` with BoundingBox documentation and coordinate system guidance
4. Build the feature-local form letter document in `src/app/prepayLetters/`
