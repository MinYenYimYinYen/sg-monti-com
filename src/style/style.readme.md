# Styling Architecture

This project uses a **Semantic Styling System** built on top of **Tailwind CSS v4** and **Radix UI**.

## 1. The Semantic Theme
We do not use raw colors (e.g., `bg-blue-500`) in our components. Instead, we use **Semantic Variables** that describe the *intent* of the color.

**Location:** `src/style/globals.scss` (inside the `@theme` block).

| Semantic Name | Usage | Maps To (Brand) |
| :--- | :--- | :--- |
| `primary` | Main actions (Submit buttons) | `sg-blue` |
| `secondary` | Alternative actions (Cancel) | `sg-green` |
| `destructive` | Dangerous actions (Delete) | `sg-orange` |
| `accent` | Interactive highlights | `sg-blue-light` |
| `muted` | Subdued text/backgrounds | `slate-100` |
| `surface` | Cards, Modals, Panels | `white` |
| `background` | Page background | `sg-just-off-white` |
| `border` | Hairlines, Dividers | `slate-200` |

**Usage in Tailwind:**
```tsx
<div className="bg-primary text-primary-foreground">...</div>
```

## 2. Component Pattern (shadcn/ui style)
We use reusable "Atomic" components located in `src/style/components/`.
These components wrap standard HTML elements with our Semantic Theme and accessibility primitives.

**Key Components:**
*   `Button`: Supports variants (`default`, `outline`, `ghost`, `destructive`).
*   `Input`: Standardized form input.
*   `Card`: For grouping content.
*   `Label`: Accessible form labels.

**Polymorphism (`asChild`):**
The `Button` component supports the `asChild` prop to merge styles onto a child element (like a Next.js `Link`).
```tsx
<Button asChild>
  <Link href="/login">Login</Link>
</Button>
```

## 3. Layout Containers
We use standardized containers to ensure consistent spacing and alignment.
**Location:** `src/style/components/Containers.tsx`

*   `CenteredContainer`: Full-screen, centered content (Login/Register pages).

## 4. Adding New Styles
1.  **New Color?** Add it to `src/style/_colors.scss` (Sass variable) -> Add to `:root` -> Add to `@theme` in `globals.scss`.
2.  **New Component?** Create it in `src/style/components/` using `cva` for variants and `cn` for class merging.
3.  **One-off Style?** Use Tailwind utility classes directly, but prefer Semantic colors (`bg-muted`) over raw colors (`bg-gray-100`).
