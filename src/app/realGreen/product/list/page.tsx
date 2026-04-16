"use client";
import React from "react";
import { Container } from "@/components/Containers";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import { useUnitConfig } from "@/app/realGreen/product/unitConfig/useUnitConfig";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/style/components/tabs";
import SinglesTab from "@/app/realGreen/product/list/tabs/SinglesTab";
import MastersTab from "@/app/realGreen/product/list/tabs/MastersTab";
import SubsTab from "@/app/realGreen/product/list/tabs/SubsTab";
import ConversionsTab from "@/app/realGreen/product/list/tabs/ConversionsTab";
import { ProductsFooter } from "@/app/realGreen/product/list/tabs/components/ProductsFooter";

export default function ListProducts() {
  useProduct({ autoLoad: true });
  useUnitConfig({ autoLoad: true });

  return (
    <Container variant={"scroll-shell"}>
      <Tabs defaultValue={"masters"} className="flex-1 flex flex-col min-h-0">
        <TabsList className="shrink-0">
          <TabsTrigger value={"masters"}>Masters</TabsTrigger>
          <TabsTrigger value={"subs"}>Subs</TabsTrigger>
          <TabsTrigger value={"singles"}>Singles</TabsTrigger>
          <TabsTrigger value={"conversions"}>Conversions</TabsTrigger>
        </TabsList>
        <TabsContent value={"masters"} className="flex-1 min-h-0">
          <MastersTab />
        </TabsContent>
        <TabsContent value={"subs"}>
          <SubsTab />
        </TabsContent>
        <TabsContent value={"singles"}>
          <SinglesTab />
        </TabsContent>
        <TabsContent value={"conversions"}>
          <ConversionsTab />
        </TabsContent>
      </Tabs>
      <ProductsFooter />
    </Container>
  );
}
