"use client";
import React, { useState } from "react";
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
import { FooterPortal } from "@/components/FooterPortal";
import { Modal } from "@/components/Modal";
import { AppMethodCRUD } from "@/app/realGreen/product/appMethod/AppMethodCRUD";
import { Badge } from "@/style/components/badge";

export default function ListProducts() {
  useProduct({ autoLoad: true });
  useUnitConfig({ autoLoad: true });
  const [isAppMethodCRUDOpen, setIsAppMethodCRUDOpen] = useState(false);

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
      <FooterPortal>
        <Badge variant={"outline"} onClick={() => setIsAppMethodCRUDOpen(true)}>
          Application Methods
        </Badge>
        <Modal
          title="Application Methods"
          isOpen={isAppMethodCRUDOpen}
          onClose={() => setIsAppMethodCRUDOpen(false)}
          className={"w-full max-w-6xl h-[75vh]"}
        >
          <AppMethodCRUD />
        </Modal>
      </FooterPortal>
    </Container>
  );
}
