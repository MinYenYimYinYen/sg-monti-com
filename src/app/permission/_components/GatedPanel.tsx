"use client";

import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";
import { Notice } from "@/app/permission/_components/Notice";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import type { CapabilityRequirement } from "@/permission/PermissionTypes";
import { isGateOpen } from "@/permission/logic/navGate";

/**
 * Shows its children only to a user who passes `requirement`. This keeps a screen from being
 * shown when someone opens its URL directly; the server refuses the data either way.
 */
export function GatedPanel({
  requirement,
  children,
}: {
  requirement: CapabilityRequirement;
  children: React.ReactNode;
}) {
  const user = useSelector(authSelect.user);
  const mine = useSelector(userCapabilitiesSelect.mine);

  if (mine === null) {
    return <div className="h-full overflow-y-auto p-6 text-sm text-muted-foreground">Loading your permissions...</div>;
  }
  if (!isGateOpen({ gate: { capability: requirement }, user, mine })) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <Notice>You do not have access to this screen.</Notice>
      </div>
    );
  }
  return <>{children}</>;
}
