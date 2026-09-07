# Phase 4 — UI Shell + Orchestration

**Goal:** Wire up the deps hook, layout, and stub pages. The module becomes navigable with a working tab bar.

**Prerequisite:** Phases 1–3 complete. All reducers registered. `priceIncreaseSelect` exists.

---

## Required Reading (this phase only)

- `src/app/priceIncrease/priceIncreasePlan.md` — full module spec
- `src/app/priceIncrease/seasonIncreases/useSeasonIncreases.ts` — hook to call
- `src/app/priceIncrease/settings/useSettings.ts` — hook to call
- `src/app/globalSettings/_lib/useGlobalSettings.ts` — hook to call (for autoLoad)
- `src/components/PageLayout/PageLayout.tsx` — layout shell
- `src/components/PageLayout/TabNav.tsx` — tab navigation

---

## Step 1 — `usePriceIncreaseDeps.ts`

**File:** `src/app/priceIncrease/usePriceIncreaseDeps.ts`

```typescript
import { useSeasonIncreases } from "@/app/priceIncrease/seasonIncreases/useSeasonIncreases";
import { usePriceIncreaseSettings } from "@/app/priceIncrease/settings/useSettings";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";

export function usePriceIncreaseDeps() {
  useGlobalSettings({ autoLoad: true });
  useSeasonIncreases();
  usePriceIncreaseSettings();
}
```

---

## Step 2 — `layout.tsx`

**File:** `src/app/priceIncrease/layout.tsx`

```typescript
"use client";

import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav, TabNavItem } from "@/components/PageLayout/TabNav";
import { usePriceIncreaseDeps } from "@/app/priceIncrease/usePriceIncreaseDeps";

const TABS: readonly TabNavItem[] = [
  { label: "Config", href: "/priceIncrease/config" },
  { label: "Summary", href: "/priceIncrease/summary" },
  { label: "By Customer", href: "/priceIncrease/byCustomer" },
] as const;

export default function PriceIncreaseLayout({ children }: { children: React.ReactNode }) {
  usePriceIncreaseDeps();

  return (
    <PageLayout>
      <PageLayout.Header right={<TabNav items={TABS} rootHref="/priceIncrease/config" />} />
      <PageLayout.Body>{children}</PageLayout.Body>
    </PageLayout>
  );
}
```

---

## Step 3 — `page.tsx` (root redirect)

**File:** `src/app/priceIncrease/page.tsx`

```typescript
import { redirect } from "next/navigation";

export default function PriceIncreasePage() {
  redirect("/priceIncrease/config");
}
```

---

## Step 4 — `config/page.tsx` (stub)

**File:** `src/app/priceIncrease/config/page.tsx`

```typescript
export default function PriceIncreaseConfigPage() {
  return <div className="p-4 text-muted-foreground">Config — coming soon</div>;
}
```

---

## Step 5 — `summary/page.tsx` (stub)

**File:** `src/app/priceIncrease/summary/page.tsx`

```typescript
export default function PriceIncreaseSummaryPage() {
  return <div className="p-4 text-muted-foreground">Summary — coming soon</div>;
}
```

---

## Step 6 — `byCustomer/page.tsx` (stub)

**File:** `src/app/priceIncrease/byCustomer/page.tsx`

```typescript
export default function PriceIncreaseByCustomerPage() {
  return <div className="p-4 text-muted-foreground">By Customer — coming soon</div>;
}
```

---

## Verification

Run `ide_diagnostics` on:
- `src/app/priceIncrease/usePriceIncreaseDeps.ts`
- `src/app/priceIncrease/layout.tsx`
- `src/app/priceIncrease/page.tsx`
- `src/app/priceIncrease/config/page.tsx`
- `src/app/priceIncrease/summary/page.tsx`
- `src/app/priceIncrease/byCustomer/page.tsx`

Confirm no type errors. The module is now navigable at `/priceIncrease`.

---

## Post-Phase Checklist

After all four phases are complete, verify the full module:

1. All files in the file structure from `priceIncreasePlan.md` exist.
2. `src/store/reducers/index.ts` has both `seasonIncreases` and `priceIncreaseSettings` registered.
3. `src/app/globalSettings/_lib/GlobalSettingsTypes.ts` has `increaseFlagMappings: IncreaseFlagMapping[]`.
4. `src/app/globalSettings/_lib/globalSettingsSelect.ts` exports `increaseFlagMappings`.
5. `src/app/realGreen/customer/_lib/classes/ServiceUtils.ts` has `get acquisitionPrice()`.
6. Run `tsc --noEmit` to confirm the full project compiles cleanly.
