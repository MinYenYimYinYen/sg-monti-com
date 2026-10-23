---
name: ui-styling
description: Style React components with this project's semantic color system (primary/accent/secondary/destructive) and ghost/soft/solid/bold intensity scale on Tailwind v4 and shadcn/ui, including adding new variant components with cva and fixing ScrollArea or flex scrolling. Use when building or restyling any UI, adding a button, badge, table, card or input, adding dark-mode-safe colors, or when a ScrollArea will not scroll.
---

# UI Styling

Full reference: `src/style/style.readme.md`. Variables: `src/style/tailwind.css`. Components: `src/style/components/*.tsx`. `cn` helper: `src/style/utils.ts`.

## Colors

| Variant | Color | Use |
|---|---|---|
| `primary` | Blue | Buttons, primary actions, tabs (most common action color) |
| `accent` | Green | Backgrounds, surfaces, NavBar, table rows (most used by area) |
| `secondary` | Orange | Alternative, less common |
| `destructive` | Burnt orange | Errors, deletes, warnings |

## Intensity

| Intensity | Look | Use |
|---|---|---|
| `ghost` | 10% bg, colored text | Subtle highlight, alternating rows |
| `soft` | 20% bg (30% dark mode), dark text | Light backgrounds, inactive states |
| `solid` | 100% bg, light text | **Default.** Active states, buttons, selected items |
| `bold` | 100% bg + shadow + semibold | Extra prominence |

Defaults are `variant="primary" intensity="solid"`. Components that take both props: `Button`, `Badge`. `Tabs` take `variant`; `TableRow` takes `variant="alternating" | "selected"`.

## Do

- Semantic colors: `bg-primary`, `bg-accent`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`.
- Tints via opacity: `bg-accent/10` (ghost), `bg-primary/20` (soft), `hover:bg-primary/90`.
- `bg-card` for inputs and popovers.
- Let focus rings follow the variant automatically.

## Don't

- Hardcoded colors: `bg-blue-500`, `bg-green-50`, `bg-white`, `text-gray-600`.
- Hardcoded focus rings (`focus:ring-blue-500`).
- Inline styles for brand colors, or overriding a semantic color via `className`.
- Exception: PDF output cannot use CSS variables. See the `pdf-document` skill.

## Adding a new variant component

Use `cva` with `variant` x `intensity` axes and 16 `compoundVariants` (4 colors x 4 intensities), default `primary` + `solid`. Export `VariantProps` types. Compound recipes: ghost `bg-{v}/10 text-{v}`; soft `bg-{v}/20 text-foreground dark:bg-{v}/30`; solid `bg-{v} text-{v}-foreground`; bold solid + `font-semibold shadow-lg`. Copy the structure from an existing file in `src/style/components/` rather than writing it from memory.

## Scrolling (the most common layout bug)

The root layout clips overflow, so the outermost element of every page must establish a scroll context.
- Simple page: `<div className="h-full overflow-y-auto"><div className="p-6 ...">...</div></div>`.
- Sticky header: `PageLayout` + `PageLayout.Body` (see the `tab-routed-page` skill); the content inside Body still needs `h-full overflow-y-auto`.
- A `ScrollArea` inside a flex column only scrolls if **every** `flex flex-col` ancestor between the fixed-height root and the `ScrollArea` has `min-h-0` (and `flex-1`). If it will not scroll, walk up the tree adding `min-h-0`. `<Container variant="page">` already includes `flex flex-col min-h-0`.
- When creating or reviewing page-level UI, check this and flag violations before finishing.

## React Compiler reminders for components

No `useCallback`/`useMemo`. Function props end in `Action`. No `useEffect` + `setState` to sync props to state; initialize `useState` from the prop and put a `key` on the component to reset it.

## Verify

Run the IDE diagnostics on edited files. Search the diff for `bg-white`, `bg-blue`, `bg-green`, `text-gray` before finishing. Do not start the dev server.
