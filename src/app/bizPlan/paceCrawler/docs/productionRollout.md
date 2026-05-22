# Pace Crawler — Production Rollout Plan

## Overview

The pace crawler was built iteratively with a suite of dev panels for debugging each
computation layer. This document describes the plan to ship a production UI while
preserving all dev tooling for future maintenance.

---

## File Changes

### New files

| File | Purpose |
|---|---|
| `PaceCrawlerDev.tsx` | Extracted dev UI — the current `page.tsx` tab layout verbatim |
| `PaceCrawler.tsx` | Production component — `EmployeeCardPanel` as the entry point with popover triggers |
| `gantt/page.tsx` | Dedicated Gantt sub-route (`/bizPlan/paceCrawler/gantt`) |

### Modified files

| File | Change |
|---|---|
| `page.tsx` | Becomes a thin shell — renders `<PaceCrawler />`. When dev debugging is needed, swap to `<PaceCrawlerDev />` manually. |

### Unchanged files

All `devComponents/` files remain untouched. `PaceCrawlerDev.tsx` imports them exactly
as `page.tsx` does today.

---

## Dev Preservation Strategy

`PaceCrawlerDev.tsx` is a straight copy of the current `page.tsx` body — same two
`TabsList` rows, same `TabsContent` panels, same `usePaceCrawlerDeps()` call. No dev
component is modified or deleted.

To switch back to dev mode: edit `page.tsx` to render `<PaceCrawlerDev />` instead of
`<PaceCrawler />`.

---

## Production Component: `PaceCrawler.tsx`

The production component is a thin wrapper that calls `usePaceCrawlerDeps()` and renders
`<EmployeeCardPanel>` as the primary view. The three popover triggers live in the
`EmployeeCardPanel` toolbar.

```
PaceCrawler
└── usePaceCrawlerDeps()
└── EmployeeCardPanel          ← primary view, full height
    └── toolbar
        ├── DatePicker          (existing)
        ├── stats summary       (existing)
        ├── [Assignments btn]   → Assignments popover
        ├── [Emp Timeline btn]  → EmployeeTimeLine popover
        ├── [SC Timeline btn]   → ServCodeTimeLine popover
        └── [Gantt btn]         → router.push("/bizPlan/paceCrawler/gantt")
```

---

## EmployeeCardPanel Toolbar Changes

The toolbar currently has: `DatePicker | stats text`

After rollout: `DatePicker | stats text | [spacer flex-1] | Assignments | Emp Timeline | SC Timeline | Gantt`

All four right-side buttons are added to the existing toolbar `div` with `justify-between`
or a `ml-auto` group.

### Gantt button
- Icon: `BarChart2` (lucide)
- Label: "Gantt"
- Action: `useRouter().push("/bizPlan/paceCrawler/gantt")`
- Variant: `primary` / `intensity="ghost"`

---

## Large Popovers

All three popovers use the shadcn `<Popover>` + `<PopoverContent>` with overridden sizing.
`PopoverContent` renders via Radix Portal so it escapes any overflow constraints.

### Sizing

```tsx
<PopoverContent
  className="w-[calc(100vw-2rem)] h-[calc(100vh-4rem)] p-0 flex flex-col"
  align="end"
  sideOffset={8}
>
```

### Window header (inside each PopoverContent)

A narrow header bar sits at the top of the popover content:

```tsx
<div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border bg-card">
  <span className="text-sm font-semibold text-foreground">{title}</span>
  <PopoverClose asChild>
    <Button size="icon" variant="ghost" intensity="ghost" className="h-6 w-6">
      <X className="w-3.5 h-3.5" />
    </Button>
  </PopoverClose>
</div>
```

The panel component fills the remaining space:

```tsx
<div className="flex-1 min-h-0 overflow-hidden">
  <AssignmentEditorPanel />   {/* or EmployeeTimelinePanel / ServCodeTimelinePanel */}
</div>
```

### Three popovers

| Trigger label | Icon | Panel rendered |
|---|---|---|
| Assignments | `Settings2` | `AssignmentEditorPanel` |
| Emp Timeline | `CalendarDays` | `EmployeeTimelinePanel` |
| SC Timeline | `GitBranch` | `ServCodeTimelinePanel` |

---

## Renamed Components

The exported component names are updated to match production naming. File names stay the
same to avoid breaking imports in `PaceCrawlerDev.tsx`.

| File | Old export | New export |
|---|---|---|
| `EmployeeTimelinePanel.tsx` | `EmployeeTimelinePanel` | `EmployeeTimeLine` |
| `ServCodeTimelinePanel.tsx` | `ServCodeTimelinePanel` | `ServCodeTimeLine` |

`PaceCrawlerDev.tsx` continues to import the old names — update those imports to the new
names after renaming.

---

## Gantt Sub-Route: `gantt/page.tsx`

```
/bizPlan/paceCrawler/gantt
```

```tsx
// gantt/page.tsx
"use client";

import { usePaceCrawlerDeps } from "@/app/bizPlan/paceCrawler/usePaceCrawlerDeps";
import { GanttChartPanel } from "@/app/bizPlan/paceCrawler/devComponents/GanttChartPanel";
import { Button } from "@/style/components/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function GanttPage() {
  usePaceCrawlerDeps();
  const router = useRouter();

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border bg-card">
        <Button
          size="sm"
          variant="primary"
          intensity="ghost"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </Button>
        <span className="text-sm font-semibold text-foreground">Gantt</span>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <GanttChartPanel />
      </div>
    </div>
  );
}
```

---

## Implementation Order

1. **Extract dev UI** — create `PaceCrawlerDev.tsx` (copy current `page.tsx` body)
2. **Update `page.tsx`** — render `<PaceCrawler />` (stub until step 3)
3. **Build `PaceCrawler.tsx`** — calls `usePaceCrawlerDeps()`, renders `<EmployeeCardPanel>`
4. **Modify `EmployeeCardPanel`** — add toolbar buttons (Assignments, Emp Timeline, SC Timeline, Gantt)
5. **Rename exports** — `EmployeeTimelinePanel` → `EmployeeTimeLine`, `ServCodeTimelinePanel` → `ServCodeTimeLine`
6. **Create `gantt/page.tsx`** — sub-route with back button + `<GanttChartPanel>`
7. **Smoke test** — verify all popovers open/close, Gantt route navigates correctly, dev component still compiles
