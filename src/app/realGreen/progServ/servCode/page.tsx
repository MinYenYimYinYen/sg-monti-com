"use client";
import React from "react";
import { Container } from "@/components/Containers";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { ServCodeTab } from "./_components/ServCodeTab";
import { useSelector } from "react-redux";
import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { progServCapabilities } from "@/app/realGreen/progServ/progServCapabilities";

const { can } = progServCapabilities;

export default function ServCodePage() {
  return (
    <GatedPanel requirement={can.servCodes.read}>
      <ServCodes />
    </GatedPanel>
  );
}

function ServCodes() {
  const allows = useSelector(userCapabilitiesSelect.allows);
  // Only the service code list is shown here, so the program code load is skipped. The program
  // list is loaded by the program code page.
  useProgServ({
    autoLoad: true,
    canLoad: { progCodes: false, servCodes: allows(can.servCodes.read) },
  });

  return (
    <Container variant="scroll-shell">
      <div className="mb-4">
        <h2 className="text-2xl font-semibold tracking-tight">Service Codes</h2>
      </div>
      <ServCodeTab />
    </Container>
  );
}
