"use client";
import React from "react";
import { Container } from "@/components/Containers";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { ServCodeTab } from "./_components/ServCodeTab";
import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { can } from "@/permission/can";

export default function ServCodePage() {
  return (
    <GatedPanel requirement={can.servCodes.read}>
      <ServCodes />
    </GatedPanel>
  );
}

function ServCodes() {
  useProgServ({ autoLoad: true });

  return (
    <Container variant="scroll-shell">
      <div className="mb-4">
        <h2 className="text-2xl font-semibold tracking-tight">Service Codes</h2>
      </div>
      <ServCodeTab />
    </Container>
  );
}
