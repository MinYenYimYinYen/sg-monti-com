"use client";
import React from "react";
import { Container } from "@/components/Containers";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/style/components/tabs";
import SinglesTab from "@/app/realGreen/product/list/tabs/SinglesTab";
import MastersTab from "@/app/realGreen/product/list/tabs/MastersTab";

export default function ProductList() {
  useProduct({ autoLoad: true });
  return (
    <Container variant={"page"}>
      <Tabs defaultValue={"singles"}>
        <TabsList>
          <TabsTrigger value={"singles"}>Singles</TabsTrigger>
          <TabsTrigger value={"masters"}>Masters</TabsTrigger>
        </TabsList>
        <TabsContent value={"singles"}>
          <SinglesTab />
        </TabsContent>
        <TabsContent value={"masters"}>
          <MastersTab />
        </TabsContent>
      </Tabs>
    </Container>
  );
}
