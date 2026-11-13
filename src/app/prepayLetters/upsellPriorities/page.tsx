"use client";

import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { prepayLettersCapabilities } from "../prepayLettersCapabilities";
import { UpsellPrioritiesPage } from "./_components/UpsellPrioritiesPage";

export default function UpsellPrioritiesRoutePage() {
  return (
    <GatedPanel requirement={prepayLettersCapabilities.can.upsellPriorities.read}>
      <UpsellPrioritiesPage />
    </GatedPanel>
  );
}
