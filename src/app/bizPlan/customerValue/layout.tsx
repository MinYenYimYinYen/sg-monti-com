"use client";

import { ReactNode } from "react";
import { Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/style/components/button";
import { useCustomerValueDeps } from "@/app/bizPlan/customerValue/useCustomerValueDeps";
import { ZipCodeFilter } from "@/app/bizPlan/customerValue/ZipCodeFilter";

const NAV_LINKS = [
  { label: "By Zip Code", href: "/bizPlan/customerValue/byZipCode" },
  { label: "By Program", href: "/bizPlan/customerValue/byProgram" },
] as const;

export default function CustomerValueLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  useCustomerValueDeps();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Fixed header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-base font-semibold text-foreground">Customer Value</h1>
        </div>
        <div className="flex items-center gap-2">
          {NAV_LINKS.map(({ label, href }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Button
                key={href}
                variant={isActive ? "primary" : "outline"}
                intensity={isActive ? "solid" : "soft"}
                size="sm"
                asChild
              >
                <Link href={href}>{label}</Link>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Body: left filter panel + page content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — zip code filter (shared across all sub-pages) */}
        <div className="w-52 shrink-0 border-r border-border bg-card overflow-hidden">
          <ZipCodeFilter />
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
