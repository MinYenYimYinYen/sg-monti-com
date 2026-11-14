"use client";

import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { UsersPanel } from "@/app/permission/_components/UsersPanel";
import { can } from "@/permission/can";

export default function PermissionUsersPage() {
  return (
    <GatedPanel requirement={can.userCapabilities.read}>
      <UsersPanel />
    </GatedPanel>
  );
}
