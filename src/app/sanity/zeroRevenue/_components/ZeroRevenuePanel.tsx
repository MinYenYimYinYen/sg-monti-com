"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { zeroRevenueSelect } from "@/app/sanity/zeroRevenue/zeroRevenueSelect";
import { ZeroCustomerList } from "@/app/sanity/zeroRevenue/_components/ZeroCustomerList";
import { ZeroProgramList } from "@/app/sanity/zeroRevenue/_components/ZeroProgramList";
import { ZeroServiceList } from "@/app/sanity/zeroRevenue/_components/ZeroServiceList";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/style/components/tabs";
import { AlertTriangle } from "lucide-react";

type ZeroRevenueTab = "customers" | "programs" | "services";

export function ZeroRevenuePanel() {
  const [activeTab, setActiveTab] = useState<ZeroRevenueTab>("customers");

  const customerCount = useSelector(zeroRevenueSelect.customers).length;
  const programCount = useSelector(zeroRevenueSelect.programs).length;
  const serviceCount = useSelector(zeroRevenueSelect.services).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Waterfall callout */}
      <div className="shrink-0 mx-4 mt-4 mb-2 flex items-start gap-2 rounded-md border border-secondary/30 bg-secondary/10 px-3 py-2 text-xs text-secondary">
        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          Address <strong>Customers</strong> first — fixing customer-level pricing will reduce program and service counts downstream.
        </span>
      </div>

      {/* Tab control */}
      <div className="shrink-0 px-4 pb-3">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as ZeroRevenueTab)}
          className="flex-none"
        >
          <TabsList variant="primary">
            <TabsTrigger value="customers" variant="primary">
              Customers{customerCount > 0 ? ` (${customerCount})` : ""}
            </TabsTrigger>
            <TabsTrigger value="programs" variant="primary">
              Programs{programCount > 0 ? ` (${programCount})` : ""}
            </TabsTrigger>
            <TabsTrigger value="services" variant="primary">
              Services{serviceCount > 0 ? ` (${serviceCount})` : ""}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 space-y-1">
          {activeTab === "customers" && <ZeroCustomerList />}
          {activeTab === "programs" && <ZeroProgramList />}
          {activeTab === "services" && <ZeroServiceList />}
        </div>
      </div>
    </div>
  );
}
