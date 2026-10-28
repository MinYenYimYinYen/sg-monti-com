---
name: pdf-document
description: Create or modify PDF documents with @react-pdf/renderer and react-pdf-tailwind in this project, including tw() styling, PDFNumber, PDF icons, PositionedBox overlays on preprinted forms, and PDFViewer/usePDF rendering. Use when adding a printable document, letter, chart layout or cover sheet, or when PDF styles or text render wrongly.
---

# PDF Document

Read `src/lib/pdf/pdf.readme.md` first (required). It documents `PositionedBox` coordinates, the icon list and both rendering strategies in full. This skill is the checklist of things that break.

Shared primitives (only these live in `src/lib/pdf/`):
- `src/lib/pdf/tw.ts` - `tw()` styling
- `src/lib/pdf/_components/PDFNumber.tsx` - number formatting
- `src/lib/pdf/_components/pdfIcons.tsx` - SVG icons
- `src/lib/pdf/_components/PositionedBox.tsx` - absolute placement in inches

Feature documents live **next to their feature**, never in `src/lib/pdf/`. Examples: `src/app/realGreen/product/mixChart/chartLayouts/`, `src/app/scheduling/coverSheets/[routeDate]/page.tsx`.

## Rules that cause silent breakage

1. **`tw()` must never get an empty string** (or a string that resolves to nothing). Use a ternary between two real class strings: `tw(i > 0 ? "border-t border-black" : "border-black")`. Never `tw(cond ? "border-t" : "")`.
2. **No semantic colors or CSS variables.** `bg-card`, `text-foreground`, `bg-primary` do not resolve in PDF. Use hex or named colors: `bg-[#f5f5f5]`, `border-gray-200`. This is the one place the app's "never hardcode colors" rule is deliberately reversed. Icons hardcode `stroke="black"` for the same reason.
3. **All text must be inside `<Text>`.** Raw strings inside `<View>` fail. Structure is `Document` > `Page` > `View` > `Text`.
4. **`tw()` supports only a subset of Tailwind.** Unsupported classes are silently ignored, so check the output rather than assuming.
5. **Browser only.** Guard rendering with `const isClient = useIsClient()` (`@/lib/hooks/useIsClient`) and `if (!isClient) return null`. Never use `useEffect` + `setState` for this.
6. Format numbers with `PDFNumber` (`isMoney`, `decimals`), not the web `Number` component.
7. Page size is `"LETTER"` for all current documents (`"LEGAL"`, `"A4"` or `[612, 792]` points are supported).

## Choosing a renderer

- `PDFViewer`: live in-page preview of a configurable document. Example: `product/mixChart/page.tsx`.
- `usePDF` with an `iframe` and a download link: generate once data is loaded. Pass `document: undefined` while data is still loading. Example: `scheduling/coverSheets/[routeDate]/page.tsx`.

## Preprinted forms (`PositionedBox`)

Origin is the top-left of the page, `x` goes right, `y` goes down, units are inches (72 pt/inch). Develop with `showBoundingBox`, print against the real form, adjust, then remove it.

## Adding an icon

Copy the Lucide SVG path data into a new `<Name>PDFIcon` in `pdfIcons.tsx` using the existing `Svg`/`Path` pattern and a single `size` prop. Then add it to the table in `pdf.readme.md`.

## Verify

You cannot see the rendered PDF, so say clearly that layout was not visually checked.
