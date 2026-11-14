"use client";

import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { can } from "@/permission/can";
import { UpsellPrioritiesPage } from "./_components/UpsellPrioritiesPage";

export default function UpsellPrioritiesRoutePage() {
  return (
    <GatedPanel requirement={can.upsellPriorities.read}>
      <UpsellPrioritiesPage />
    </GatedPanel>
  );
}
