"use client";

import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { inventorySelectors } from "@/app/bizPlan/selectors/inventorySelectors";
import { createInventorySelectors } from "@/app/bizPlan/selectors/createInventorySelectors";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/style/components/tabs";
import { ProductsTable } from "@/app/bizPlan/products/components/ProductsTable";
import { ServiceCodeTable } from "@/app/bizPlan/products/components/ServiceCodeTable";
import { useActiveCustomers } from "@/app/realGreen/customer/hooks/useActiveCustomers";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import { useUnitConfig } from "@/app/realGreen/product/unitConfig/useUnitConfig";
import {
  getServiceStatuses,
  ServiceStatusType,
} from "@/app/realGreen/_lib/subTypes/serviceStatus";
import { RadioGroup, RadioGroupItem } from "@/style/components/radio-group";
import { UnitContext } from "@/app/realGreen/product/unitConfig/ProductUnitConfigTypes";
import { Container } from "@/components/Containers";

export default function BizPlanProductsPage() {
  useCustomerContext({ contexts: ["active"] });
  useActiveCustomers({ autoLoad: true });
  useProgServ({ autoLoad: true });
  useProduct({ autoLoad: true });
  useUnitConfig({ autoLoad: true });

  const summaryStats = useSelector(inventorySelectors.summaryStats);
  const currentSeason = useSelector(globalSettingsSelect.season);

  const [activeTab, setActiveTab] = useState("product");
  const [unitContext, setUnitContext] = useState<UnitContext>("purchase");

  const unfinishedServStats: ServiceStatusType[] = [
    "active",
    "printed",
    "asap",
  ];
  const allServStats: ServiceStatusType[] = [
    "active",
    "printed",
    "asap",
    "completed",
  ];

  const [servStatMode, setServStatMode] = useState<"unfinished" | "all">(
    "unfinished",
  );

  const servStats =
    servStatMode === "unfinished" ? unfinishedServStats : allServStats;

  // Create filtered selectors based on servStatMode toggle
  // This ensures ALL views (By Product, By Service Code) use the same filtered dataset
  const filteredSelectors = useMemo(
    () =>
      createInventorySelectors({
        serviceStatuses: getServiceStatuses(servStats),
      }),
    [servStats],
  );

  const productsPlanned = useSelector(filteredSelectors.productsPlanned);
  const productsByServCode = useSelector(filteredSelectors.productsByServCode);

  return (
    <Container variant={"scroll-shell"}>
      {/* Header Section */}
      <div className="mb-6 flex flex-col">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Products Needed
            </h1>
            <p className="text-muted-foreground">
              Season {currentSeason} - {summaryStats.totalServices} services
              loaded
            </p>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row">
            <RadioGroup
              variant="button-group"
              value={unitContext}
              onValueChange={(v) => setUnitContext(v as UnitContext)}
            >
              <RadioGroupItem value="app">Application</RadioGroupItem>
              <RadioGroupItem value="load">Loading</RadioGroupItem>
              <RadioGroupItem value="purchase">Purchasing</RadioGroupItem>
            </RadioGroup>
            <RadioGroup
              variant="button-group"
              value={servStatMode}
              onValueChange={(v) => setServStatMode(v as "unfinished" | "all")}
            >
              <RadioGroupItem value="unfinished">Unfinished</RadioGroupItem>
              <RadioGroupItem value="all">All</RadioGroupItem>
            </RadioGroup>
          </div>
        </div>
      </div>



      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto md:h-9">
          <TabsTrigger value="product">By Product</TabsTrigger>
          <TabsTrigger value="servCode">By Service Code</TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <TabsContent value="product">
            <ProductsTable
              products={productsPlanned}
              unitContext={unitContext}
            />
          </TabsContent>
          <TabsContent value="servCode">
            <ServiceCodeTable
              servCodes={productsByServCode}
              unitContext={unitContext}
            />
          </TabsContent>
        </div>
      </Tabs>
    </Container>
  );
}
