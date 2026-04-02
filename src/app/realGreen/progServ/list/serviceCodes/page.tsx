"use client";
import React from "react";
import { Container } from "@/components/Containers";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { ServCodeTab } from "@/app/realGreen/progServ/list/serviceCodes/ServCodeTab";

export default function ListServiceCodes() {
  useProgServ({ autoLoad: true });

  return (
    <Container variant="page">
      <div className="mb-4">
        <h2 className="text-2xl font-semibold tracking-tight">Service Codes</h2>
      </div>
      <ServCodeTab />
    </Container>
  );
}
