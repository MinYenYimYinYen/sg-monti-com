---
name: tab-routed-page
description: Build or modify a page whose views are tabs implemented as Next.js App Router sub-routes with a shared header, using PageLayout and TabNav. Use when adding a new feature page with 2+ views, adding a tab or nested tab group to an existing layout, or reviewing a page layout for scroll/overflow problems.
---

# Tab-Routed Page

Reference implementations (read one before writing):
- `src/app/pace/layout.tsx` - header with date picker + icon `TabNav`, calls `usePaceDeps()`
- `src/app/pace/setup/layout.tsx` - nested tab group; parent already loads deps
- `src/app/productivity/layout.tsx`, `src/app/prepayLetters/layout.tsx`

Components: `src/components/PageLayout/PageLayout.tsx` (`PageLayout`, `.Header`, `.Body`) and `TabNav.tsx` (`TabNav`, `TabNavItem`).

## File structure

```
src/app/featureName/
  layout.tsx            "use client"; calls use<Feature>Deps(), renders PageLayout
  page.tsx              redirect("/featureName/tabA") or renders the root tab
  use<Feature>Deps.ts   orchestrates all data hooks for this feature
  tabA/page.tsx
  tabB/page.tsx
```

## Layout template

```tsx
"use client";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav, type TabNavItem } from "@/components/PageLayout/TabNav";
import { useFeatureDeps } from "@/app/featureName/useFeatureDeps";

const TABS: readonly TabNavItem[] = [
  { label: "Tab A", href: "/featureName" },
  { label: "Tab B", href: "/featureName/tabB" },
];

export default function FeatureLayout({ children }: { children: React.ReactNode }) {
  useFeatureDeps();
  return (
    <PageLayout>
      <PageLayout.Header
        left={/* feature-specific controls */}
        right={<TabNav items={TABS} rootHref="/featureName" />}
      />
      <PageLayout.Body>{children}</PageLayout.Body>
    </PageLayout>
  );
}
```

Tabs may carry a lucide `icon`. `Header` slots are optional.

## Rules

- `layout.tsx` is the only place the feature's deps hook is called. Sub-route pages and nested layouts never call it again (see the comment in `pace/setup/layout.tsx`).
- The deps hook is feature-specific, named `use<Feature>Deps`, and not shared between features.
- Sub-route `page.tsx` files are thin: render one panel component and nothing else.
- `TabNav` uses an exact match for `rootHref` and `pathname.startsWith(href)` for the others, so keep `rootHref` equal to the first tab's href when the root renders tab content.
- Folder names are camelCase; only `page.tsx`/`layout.tsx` and React component files break that.

## Scroll convention (check this on every page)

The root layout clips overflow, so the outermost element must establish a scroll context or content is silently cut off.
- `PageLayout.Body` is `flex-1 min-h-0 overflow-hidden`. The panel rendered inside it still needs `h-full overflow-y-auto` to scroll.
- Simple pages with no sticky header: `<div className="h-full overflow-y-auto"><div className="p-6 ...">...</div></div>`.
- If you find a page that violates this, flag it and propose the fix before finishing.

## Styling

Use semantic colors only (`bg-card`, `bg-primary/20`, `text-foreground`, `text-muted-foreground`). No `bg-white`, `bg-blue-*`, `text-gray-*`. Buttons use `variant` + `intensity` props. Details: `src/style/style.readme.md`.

## Verify

Run the IDE diagnostics on the new layout and pages. Do not start the dev server.
