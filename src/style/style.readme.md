# Styling Architecture

This project uses a **Semantic Styling System** built on top of **Tailwind CSS v4** and **Sass**.

## 1. The Color Palette (Sass Generation)
We generate a full spectrum of color variants (5-95) using a Sass mixin.
**Location:** `src/style/lib/_palette.scss` & `src/style/_colors.scss`.

*   **Base Colors**: Defined in `_colors.scss` (`$sg-blue`, `$sg-green`, etc.).
*   **Generated Variables**:
    *   `--sg-blue-50`: The Base Color.
    *   `--sg-blue-5` to `--sg-blue-45`: Lighter tints (mixed with white).
    *   `--sg-blue-55` to `--sg-blue-95`: Darker shades (mixed with black).

## 2. The Semantic Theme (Tailwind v4)
We map these generated variables to **Semantic Names** inside the `@theme` block in `src/style/globals.scss`.
**Note:** Tailwind v4 requires custom theme variables to start with `--color-`.

| Semantic Name | CSS Variable | Usage |
| :--- | :--- | :--- |
| `sg-blue-bg` | `--sg-blue-10` | Light backgrounds (surfaces, accents) |
| `sg-blue-brdr` | `--sg-blue-50` | Solid elements (buttons, borders, text) |
| `sg-green-bg` | `--sg-green-10` | Success backgrounds |
| `sg-green-brdr` | `--sg-green-50` | Success text/buttons |
| `sg-orange-bg` | `--sg-orange-10` | Warning backgrounds |
| `sg-orange-brdr` | `--sg-orange-50` | Warning text/buttons |
| `sg-warn-fg` | `red` | Destructive actions |

**Usage in Tailwind:**
```tsx
// A solid blue button
<button className="bg-sg-blue-brdr text-white">Click Me</button>

// A light blue card
<div className="bg-sg-blue-bg text-sg-blue-brdr">Info Card</div>
```

## 3. Component Pattern (Atomic UI)
We use reusable "Atomic" components located in `src/style/components/`.
These components wrap standard HTML elements with our Semantic Theme and accessibility primitives.

**Key Components:**
*   `Button`: Uses `sg-blue-brdr` (default), `sg-green-brdr` (secondary), `sg-warn-fg` (destructive).
*   `Input`: Uses `border-sg-gray-brdr` and `focus:ring-sg-blue-brdr`.
*   `Card`: Uses `bg-white` and `border-sg-gray-brdr`.
*   `Label`: Uses `text-sg-text`.

**Polymorphism (`asChild`):**
The `Button` component supports the `asChild` prop to merge styles onto a child element (like a Next.js `Link`).
```tsx
<Button asChild>
  <Link href="/login">Login</Link>
</Button>
```

## 4. Layout Containers
We use standardized containers to ensure consistent spacing and alignment.
**Location:** `src/style/components/Containers.tsx`

*   `CenteredContainer`: Full-screen, centered content (Login/Register pages). Uses `bg-background` (Off-White).

## 5. Adding New Styles
1.  **New Brand Color?** Add it to `src/style/_colors.scss` using `@include generate-palette(...)`.
2.  **New Semantic Role?** Add it to `src/style/globals.scss` inside `@theme` with the `--color-` prefix.
3.  **New Component?** Create it in `src/style/components/` using `cva` for variants and `cn` for class merging.
