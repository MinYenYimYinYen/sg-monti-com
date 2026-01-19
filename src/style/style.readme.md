# Styling Architecture

This project uses a **Semantic Styling System** built on top of **Tailwind CSS v4**.

## 1. The Color Palette (CSS Variables)
We define our color scales (50-950) as CSS variables in a dedicated CSS file.
**Location:** `src/style/tailwind.css`

*   **Scales**: `text`, `background`, `primary`, `secondary`, `accent`.
*   **Dark Mode**: Supported via `.dark` class in `tailwind.css`.

## 2. The Semantic Theme (Tailwind Config)
We map these CSS variables to **Semantic Names** inside `tailwind.config.ts`.

| Semantic Name | Usage | Default Shade |
| :--- | :--- | :--- |
| `primary` | Main brand actions (buttons, active states) | `500` |
| `secondary` | Secondary actions | `500` |
| `accent` | Destructive actions, warnings, highlights | `500` |
| `text` | Body text | `900` |
| `background` | Page background | `50` |

**Usage in Tailwind:**
```tsx
// A solid primary button
<button className="bg-primary text-white">Click Me</button>

// A light secondary card
<div className="bg-secondary-100 text-secondary">Info Card</div>

// Muted text
<span className="text-text-500">Subtitle</span>
```

## 3. Component Pattern (Atomic UI)
We use reusable "Atomic" components located in `src/style/components/`.
These components wrap standard HTML elements with our Semantic Theme and accessibility primitives.

**Key Components:**
*   `Button`: Uses `bg-primary` (default), `bg-secondary` (secondary), `bg-accent-600` (destructive).
*   `Input`: Uses `border-background-300` and `focus:ring-primary`.
*   `Card`: Uses `bg-white` and `border-background-300`.
*   `Label`: Uses `text-text`.

**Polymorphism (`asChild`):**
The `Button` component supports the `asChild` prop to merge styles onto a child element (like a Next.js `Link`).
```tsx
<Button asChild>
  <Link href="/login">Login</Link>
</Button>
```

## 4. Layout Containers
We use a unified `Container` component to manage page width, centering, and standard padding.
**Location:** `src/style/components/Containers.tsx`

**Variants:**
*   `variant="page"` (Default): Standard page wrapper. Max-width `7xl`, centered, with standard padding.
*   `variant="centered"`: Full-screen flex container. Centers content vertically and horizontally (e.g., Login/Register).
*   `variant="fluid"`: Full-width container (100%). No max-width constraint. Useful for dashboards or large data grids.

**Usage:**
```tsx
// Standard Page
<Container title="My Page">
  <Content />
</Container>

// Login Screen
<Container variant="centered">
  <LoginForm />
</Container>

// Dashboard
<Container variant="fluid">
  <DataGrid />
</Container>
```

## 5. Adding New Styles
1.  **New Color Scale?** Add the CSS variables to `src/style/tailwind.css` inside `@layer base`.
2.  **New Semantic Role?** Add it to `tailwind.config.ts` inside `theme.extend.colors`.
3.  **New Component?** Create it in `src/style/components/` using `cva` for variants and `cn` for class merging.
