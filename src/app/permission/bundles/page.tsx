"use client";

import { BundlesPanel } from "@/app/permission/_components/BundlesPanel";
import { GatedPanel } from "@/app/permission/_components/GatedPanel";

export default function PermissionBundlesPage() {
  return (
    <GatedPanel requirement="superUser">
      <BundlesPanel />
    </GatedPanel>
  );
}
