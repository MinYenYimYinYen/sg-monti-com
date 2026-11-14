"use client";

import React from "react";
import { GlobalSettingsForm } from "@/app/globalSettings/_lib/components/GlobalSettingsForm";
import { Container } from "@/components/Containers";
import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { can } from "@/permission/can";

export default function GlobalSettingsPage() {
  // The form loads settings on mount, so it is mounted only once the gate is open.
  return (
    <GatedPanel requirement={can.globalSettings.read}>
      <Container variant={"page"}>
        <GlobalSettingsForm />
      </Container>
    </GatedPanel>
  );
}
