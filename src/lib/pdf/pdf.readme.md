# PDF Documentation

## Library Stack

- **`@react-pdf/renderer`** — React-based PDF generation. Renders a React component tree to a PDF document. Uses its own layout engine (not the browser DOM), so standard HTML/CSS does not apply.
- **`react-pdf-tailwind`** — Converts Tailwind-like class strings into `@react-pdf/renderer` style objects via `createTw()`.

---

## File Structure

```
src/lib/pdf/
  tw.ts                        ← Shared tw() styling utility
  _components/
    PDFNumber.tsx              ← PDF-safe number formatter
    pdfIcons.tsx               ← Lucide-style SVG icons for PDF
```

**Rule:** Only shared primitives live in `src/lib/pdf/`. Feature-specific PDF documents and layouts live alongside their feature page (e.g., `src/app/realGreen/product/mixChart/chartLayouts/`).

---

## Styling with `tw()`

`tw.ts` exports a single `tw()` function created by `react-pdf-tailwind`:

```typescript
import { tw } from "@/lib/pdf/tw";

// Usage
<View style={tw("flex flex-row gap-2 p-4 border border-black")} />
<Text style={tw("text-lg font-bold text-center")} />
```

### Supported Classes

`tw()` maps a subset of Tailwind classes to `@react-pdf/renderer` style objects. Most layout, spacing, typography, and border utilities work. It does **not** perfectly mirror Tailwind — some classes may be silently ignored.

### Critical Quirks

**No empty strings.** `tw()` will break if passed an empty string or a class string that resolves to nothing. Always use a ternary, never a falsy fallback:

```typescript
// ✓ DO — ternary between two real class strings
style={tw(index > 0 ? "border-t border-black" : "border-black")}

// ✗ DON'T — empty string fallback
style={tw(index > 0 ? "border-t" : "")}
```

**No CSS variables / semantic colors.** `@react-pdf/renderer` has no access to CSS custom properties. Use hardcoded hex or named colors:

```typescript
// ✓ DO
style={tw("bg-[#f5f5f5] border-gray-200")}

// ✗ DON'T — CSS variables don't resolve in PDF
style={tw("bg-card text-foreground")}
```

**Arbitrary values** work for colors and sizes: `bg-[#e5e5e5]`, `text-[9px]`, `w-[80px]`.

**Template literals** can be used to build class strings dynamically, but ensure no empty segments:

```typescript
style={tw(`flex flex-row border-b border-black ${index % 2 === 0 ? "bg-[#e5e5e5]" : "bg-white"}`)}
```

---

## PDFNumber

`PDFNumber` is the PDF equivalent of the web `Number` component. It shares `formatNumber` and `BaseNumberProps` from `src/components/Number.tsx` but renders a `<Text>` instead of `<data>`.

```typescript
import { PDFNumber } from "@/lib/pdf/_components/PDFNumber";

// Basic count
<PDFNumber>{count}</PDFNumber>

// Money
<PDFNumber isMoney={true} decimals={2}>{price}</PDFNumber>

// With style
<PDFNumber decimals={2} style={tw("text-[9px]")}>{ratePerKsf}</PDFNumber>
```

**Props** (all optional except `children`):

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `number \| string \| null \| undefined` | — | The value to format |
| `isMoney` | `boolean` | `false` | Formats as USD currency |
| `decimals` | `number` | `0` | Min/max fraction digits |
| `locale` | `string` | `"en-US"` | Intl locale |
| `useGrouping` | `boolean` | `true` | Thousands separators |
| `signDisplay` | `"auto" \| "never" \| "always" \| "exceptZero"` | `"auto"` | Sign display |
| `style` | `any \| any[]` | — | react-pdf style object(s) |

---

## PDF Icons (`pdfIcons.tsx`)

Icons are built with `@react-pdf/renderer`'s `Svg`, `Path`, `Line`, and `Polyline` primitives, mimicking the Lucide icon pattern. Each icon takes a single `size` prop.

```typescript
import { HashPDFIcon, LandPlotPDFIcon, SproutPDFIcon, DollarSignPDFIcon } from "@/lib/pdf/_components/pdfIcons";

<HashPDFIcon size={12} />
<LandPlotPDFIcon size={12} />
```

**Available icons:**

| Export | Lucide Equivalent | Usage in App |
|---|---|---|
| `HashPDFIcon` | `Hash` | Service count |
| `LandPlotPDFIcon` | `LandPlot` | Property size (sq ft) |
| `SproutPDFIcon` | `Sprout` | Seed/pre-emergent indicator |
| `DollarSignPDFIcon` | `DollarSign` | Price/money |
| `SquarePDFIcon` | `Square` | Empty checkbox on the prepay letter |

### Adding a New Icon

Copy the SVG path data from Lucide (https://lucide.dev), then wrap it using the same pattern:

```typescript
export const MyNewPDFIcon = ({ size }: PDFIconProps) => (
  <Svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="black"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ height: size, width: size }}
  >
    <Path d="..." />
    {/* additional Path, Line, Polyline elements */}
  </Svg>
);
```

Note: `stroke="black"` is hardcoded — CSS variables do not work in PDF.

---

## PositionedBox

`PositionedBox` is a shared PDF layout primitive for placing content at an absolute position on a page. It is designed for overlaying typed content onto preprinted forms where fields must align precisely with fixed coordinates.

```typescript
import { PositionedBox } from "@/lib/pdf/_components/PositionedBox";

<PositionedBox x={1.5} y={3.25} width={2} height={0.25}>
  <Text style={tw("text-[10px]")}>John Smith</Text>
</PositionedBox>
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `x` | `number` | — | Left edge — inches from the left edge of the page |
| `y` | `number` | — | Top edge — inches from the top edge of the page |
| `width` | `number` | — | Box width in inches |
| `height` | `number` | — | Box height in inches |
| `align` | `"topLeft" \| "center"` | `"topLeft"` | Content alignment within the box |
| `showBoundingBox` | `boolean` | `false` | Draws a dashed red border for layout development |
| `children` | `React.ReactNode` | — | Content to render inside the box |

### Coordinate System

- **Origin (0, 0)** = top-left corner of the page
- **X** increases to the right
- **Y** increases downward
- **Unit**: inches (converted to points internally — 72 pts/inch)

| Page Size | Width | Height |
|---|---|---|
| Letter | 8.5" | 11" |
| Legal | 8.5" | 14" |

When measuring a physical form with a ruler:
- Measure from the **left edge** of the paper → `x`
- Measure from the **top edge** of the paper → `y`
- Measure the field **width** and **height**

### Alignment Modes

- **`topLeft`** (default): Content flows from the top-left corner of the box. Standard for text fields.
- **`center`**: Content is centered both horizontally and vertically. Useful for stamps, seals, or single-value fields.

### Overflow

Content that exceeds the box dimensions is clipped (`overflow: hidden`). This prevents content from bleeding into adjacent fields on the form.

### `showBoundingBox` Workflow

Use `showBoundingBox={true}` during development to verify alignment against a physical form:

1. Set `showBoundingBox={true}` on all `PositionedBox` instances
2. Generate and print the PDF
3. Hold the printout up to the preprinted form (or overlay them on a light table)
4. Adjust `x`, `y`, `width`, `height` as needed
5. Remove `showBoundingBox` (or set to `false`) when alignment is confirmed

```tsx
// Development — visible borders
<PositionedBox x={1.5} y={3.25} width={2} height={0.25} showBoundingBox>
  <Text style={tw("text-[10px]")}>John Smith</Text>
</PositionedBox>

// Production — borders hidden
<PositionedBox x={1.5} y={3.25} width={2} height={0.25}>
  <Text style={tw("text-[10px]")}>John Smith</Text>
</PositionedBox>
```

---

## Page Sizing

The `<Page>` component accepts a `size` prop with a named string or custom dimensions:

```typescript
// Named sizes (most common)
<Page size={"LETTER"} style={tw("p-4 text-xs")}>   // 8.5" x 11"
<Page size={"LEGAL"} style={tw("p-4 text-xs")}>    // 8.5" x 14"
<Page size={"A4"} style={tw("p-4 text-xs")}>       // 210mm x 297mm

// Custom size in points (72 pts/inch)
<Page size={[612, 792]} style={tw("p-4")}>
```

**Current app usage:**
- Mix Chart — `"LETTER"`
- Cover Sheets — `"LETTER"`

---

## Rendering Strategies

There are two ways to render a PDF document in the app. Choose based on the use case.

### 1. `PDFViewer` — Live In-Page Preview

Best for: interactive tools where the user configures the document and sees it update in real time.

```typescript
import { PDFViewer } from "@react-pdf/renderer";
import { useIsClient } from "@/lib/hooks/useIsClient";

export default function MyPage() {
  const isClient = useIsClient();
  if (!isClient) return null;

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <PDFViewer style={{ width: "100%", height: "100%" }}>
        <MyDocument />
      </PDFViewer>
    </div>
  );
}
```

**Example:** `src/app/realGreen/product/mixChart/page.tsx`

### 2. `usePDF` — Blob URL + iframe + Download

Best for: documents that are generated once (or when data is fully loaded) and need a download button.

```typescript
import { usePDF } from "@react-pdf/renderer";
import { useIsClient } from "@/lib/hooks/useIsClient";

function MyViewer({ loadingCount }: { loadingCount: number }) {
  const doc = <MyDocument />;
  // Pass undefined while data is still loading to defer generation
  const [instance] = usePDF({ document: loadingCount === 0 ? doc : undefined });

  if (loadingCount > 0) return <div>Loading...</div>;

  const url = instance.url;
  return (
    <div className="flex flex-col gap-2">
      {url && (
        <a href={url} download="my-document.pdf" className="...">
          Download PDF
        </a>
      )}
      {instance.loading && <span>Generating PDF...</span>}
      {instance.error && <span>Error generating PDF</span>}
      {url && (
        <div className="w-full h-[75vh]">
          <iframe src={url} className="w-full h-full border-0" title="My Document" />
        </div>
      )}
    </div>
  );
}
```

**Example:** `src/app/scheduling/coverSheets/[routeDate]/page.tsx`

### `useIsClient()` Requirement

**Always** guard PDF rendering with `useIsClient()`. `@react-pdf/renderer` is browser-only and will fail during SSR:

```typescript
const isClient = useIsClient();
if (!isClient) return null;
```

---

## Document Structure

A PDF document follows this component hierarchy:

```typescript
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { tw } from "@/lib/pdf/tw";

function MyDocument() {
  return (
    <Document title="My Document">
      <Page size={"LETTER"} style={tw("p-4 text-xs")}>
        <View style={tw("flex flex-col gap-2")}>
          <Text style={tw("text-lg font-bold")}>Title</Text>
          {/* content */}
        </View>
      </Page>
    </Document>
  );
}
```

- `<Document>` — root; accepts `title` for the PDF metadata
- `<Page>` — one page; `size` and `style` set dimensions and base styles
- `<View>` — block container (equivalent to `<div>`)
- `<Text>` — text node; all text **must** be inside `<Text>`
- `<Svg>`, `<Path>`, `<Line>`, etc. — vector graphics

**Key constraint:** Unlike HTML, `@react-pdf/renderer` does not allow raw text strings outside of `<Text>` nodes. Every string must be wrapped.

---

## Feature-Local PDF Components

PDF document components that are specific to a feature live next to that feature, not in `src/lib/pdf/`. Only primitives that are reused across multiple documents belong in `src/lib/pdf/_components/`.

```
src/app/realGreen/product/mixChart/
  chartLayouts/
    mixChartBySize.tsx          <- Feature-local PDF document
    mixChartByProductAmount.tsx <- Feature-local PDF document

src/app/scheduling/coverSheets/[routeDate]/
  page.tsx                      <- PDF document defined inline (large, complex)
```
