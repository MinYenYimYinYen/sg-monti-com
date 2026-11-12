"use client";

import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { UsersPanel } from "@/app/permission/_components/UsersPanel";
import { capabilityManagementCapabilities } from "@/app/permission/capabilityManagementCapabilities";

export default function PermissionUsersPage() {
  return (
    <GatedPanel requirement={capabilityManagementCapabilities.can.userCapabilities.read}>
      <UsersPanel />
    </GatedPanel>
  );
}
