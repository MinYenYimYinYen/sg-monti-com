"use client";

import React from "react";
import { GlobalSettingsForm } from "@/app/globalSettings/_lib/components/GlobalSettingsForm";
import { Container } from "@/components/Containers";
import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { globalSettingsCapabilities } from "@/app/globalSettings/globalSettingsCapabilities";

const { can } = globalSettingsCapabilities;

export default function GlobalSettingsPage() {
  // The form loads settings on mount, so it is mounted only once the gate is open.
  return (
    <GatedPanel requirement={can.settings.read}>
      <Container variant={"page"}>
        <GlobalSettingsForm />
      </Container>
    </GatedPanel>
  );
}
