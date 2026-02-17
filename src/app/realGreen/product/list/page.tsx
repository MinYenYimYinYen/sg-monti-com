"use client";
import React from "react";
import { Container } from "@/components/Containers";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import { useUnitConfig } from "@/app/realGreen/product/_lib/hooks/useUnitConfig";
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

export default function ListProducts() {
  useProduct({ autoLoad: true });
  useUnitConfig({ autoLoad: true });

  return (
    <Container variant={"page"}>
      <Tabs defaultValue={"singles"}>
        <TabsList>
          <TabsTrigger value={"singles"}>Singles</TabsTrigger>
          <TabsTrigger value={"masters"}>Masters</TabsTrigger>
          <TabsTrigger value={"subs"}>Subs</TabsTrigger>
          <TabsTrigger value={"conversions"}>Conversions</TabsTrigger>
        </TabsList>
        <TabsContent value={"singles"}>
          <SinglesTab />
        </TabsContent>
        <TabsContent value={"masters"}>
          <MastersTab />
        </TabsContent>
        <TabsContent value={"subs"}>
          <SubsTab />
        </TabsContent>
        <TabsContent value={"conversions"}>
          <ConversionsTab />
        </TabsContent>
      </Tabs>
    </Container>
  );
}
