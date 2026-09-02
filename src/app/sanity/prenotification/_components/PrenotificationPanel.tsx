"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { prenotificationSelect } from "@/app/sanity/prenotification/prenotificationSelect";
import { PrenotificationCustomerList } from "@/app/sanity/prenotification/_components/PrenotificationCustomerList";
import { PrenotificationProgramList } from "@/app/sanity/prenotification/_components/PrenotificationProgramList";
import { PrenotificationServiceList } from "@/app/sanity/prenotification/_components/PrenotificationServiceList";
import { Tabs, TabsList, TabsTrigger } from "@/style/components/tabs";
import { useFullSeasonServices } from "@/app/realGreen/customer/hooks/useFullSeasonServices";
import { RefreshCw } from "lucide-react";
import { Button } from "@/style/components/button";

type PrenotificationTab = "customers" | "programs" | "services";

export function PrenotificationPanel() {
  const [activeTab, setActiveTab] = useState<PrenotificationTab>("customers");
  const { refresh, canRefresh } = useFullSeasonServices();

  const customerCount = useSelector(prenotificationSelect.customerCount);
  const programCount = useSelector(prenotificationSelect.programCount);
  const serviceCount = useSelector(prenotificationSelect.serviceCount);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab control + refresh */}
      <div className="shrink-0 px-4 pt-4 pb-3 flex items-center gap-3">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as PrenotificationTab)}
          className="flex-1"
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
        <Button
          variant="primary"
          intensity="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={refresh}
          disabled={!canRefresh}
          title="Refresh all customer data"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 space-y-1">
          {activeTab === "customers" && <PrenotificationCustomerList />}
          {activeTab === "programs" && <PrenotificationProgramList />}
          {activeTab === "services" && <PrenotificationServiceList />}
        </div>
      </div>
    </div>
  );
}
