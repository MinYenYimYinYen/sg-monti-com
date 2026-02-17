"use client";

import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { inventorySelectors } from "@/app/bizPlan/selectors/inventorySelectors";
import { createInventorySelectors } from "@/app/bizPlan/selectors/createInventorySelectors";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/style/components/card";
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
import { LandPlot } from "lucide-react";
import {
  getServiceStatuses,
  ServiceStatusType,
} from "@/app/realGreen/_lib/subTypes/serviceStatus";
import { RadioGroup, RadioGroupItem } from "@/style/components/radio-group";

export default function BizPlanProductsPage() {
  useCustomerContext({ contexts: ["active"] });
  useActiveCustomers({ autoLoad: true });
  useProgServ({ autoLoad: true });
  useProduct({ autoLoad: true });

  const summaryStats = useSelector(inventorySelectors.summaryStats);
  const currentSeason = useSelector(globalSettingsSelect.season);

  const [activeTab, setActiveTab] = useState("product");

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

  // Format large numbers with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(Math.round(num));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Product Inventory Analysis</h1>
          <div className="flex gap-2">
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

        <p className="text-muted-foreground">
          Season {currentSeason} - {summaryStats.totalServices} services loaded
        </p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Total Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(summaryStats.totalServices)}
            </div>
            <p className="text-xs text-muted-foreground">Across all programs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Area</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <LandPlot size={24} />
              <div>{formatNumber(summaryStats.totalArea)}</div>
            </div>
            <p className="text-xs text-muted-foreground">Service coverage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(summaryStats.totalProducts)}
            </div>
            <p className="text-xs text-muted-foreground">
              Unique products used
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="product">By Product</TabsTrigger>
          <TabsTrigger value="servCode">By Service Code</TabsTrigger>
          <TabsTrigger value="employee">By Employee</TabsTrigger>
          <TabsTrigger value="comparison">LY vs TY</TabsTrigger>
        </TabsList>

        <TabsContent value="product">
          <div className="mt-4">
            <ProductsTable products={productsPlanned} />
          </div>
        </TabsContent>

        <TabsContent value="servCode">
          <div className="mt-4">
            <ServiceCodeTable servCodes={productsByServCode} />
          </div>
        </TabsContent>

        <TabsContent value="employee">
          <div className="mt-4">
            <p>By Employee tab - Coming soon</p>
          </div>
        </TabsContent>

        <TabsContent value="comparison">
          <div className="mt-4">
            <p>LY vs TY Comparison tab - Coming soon</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
