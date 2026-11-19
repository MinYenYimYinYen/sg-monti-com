"use client";

import { Equal, Link2, Receipt } from "lucide-react";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav, type TabNavItem } from "@/components/PageLayout/TabNav";
import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { useSalesTaxDeps } from "@/app/salesTax/useSalesTaxDeps";
import { can } from "@/permission/can";

const TABS: readonly TabNavItem[] = [
  { label: "Report", href: "/salesTax", icon: Receipt },
  { label: "Mapping", href: "/salesTax/salesTaxMapping", icon: Link2 },
  { label: "Revenue Groups", href: "/salesTax/stateTaxRevenueGroups", icon: Equal },
];

const ROOT_HREF = "/salesTax";

/** The mapping read gates the whole feature, so its loads never fire for a user without it. */
export default function SalesTaxLayout({ children }: { children: React.ReactNode }) {
  return (
    <GatedPanel requirement={can.salesTaxMappings.read}>
      <SalesTaxShell>{children}</SalesTaxShell>
    </GatedPanel>
  );
}

// Separate from the gate so the deps hook is only ever called for a user who holds the read.
function SalesTaxShell({ children }: { children: React.ReactNode }) {
  useSalesTaxDeps();

  return (
    <PageLayout>
      <PageLayout.Header
        left={<span className="text-sm font-semibold">Sales Tax</span>}
        right={<TabNav items={TABS} rootHref={ROOT_HREF} />}
      />
      <PageLayout.Body>{children}</PageLayout.Body>
    </PageLayout>
  );
}
