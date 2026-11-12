"use client";

import { useSelector } from "react-redux";
import { Boxes, Users } from "lucide-react";
import { authSelect } from "@/app/auth/authSlice";
import { capabilityManagementCapabilities } from "@/app/permission/capabilityManagementCapabilities";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { usePermissionDeps } from "@/app/permission/usePermissionDeps";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav, type TabNavItem } from "@/components/PageLayout/TabNav";
import { isGateOpen } from "@/permission/logic/navGate";

const { can } = capabilityManagementCapabilities;

const USERS_TAB: TabNavItem = { label: "Users", href: "/permission/users", icon: Users };
const BUNDLES_TAB: TabNavItem = { label: "Bundles", href: "/permission/bundles", icon: Boxes };

export default function PermissionLayout({ children }: { children: React.ReactNode }) {
  const user = useSelector(authSelect.user);
  const mine = useSelector(userCapabilitiesSelect.mine);

  const canSeeUsers = isGateOpen({ gate: { capability: can.userCapabilities.read }, user, mine });
  const canReadBundles = isGateOpen({ gate: { capability: can.bundles.read }, user, mine });
  const isSuperUser = isGateOpen({ gate: { capability: "superUser" }, user, mine });

  // Each load runs only when the user may read it, so nobody triggers a refused request.
  usePermissionDeps({ loadUsers: canSeeUsers, loadBundles: canReadBundles });

  const tabs: TabNavItem[] = [];
  if (canSeeUsers) tabs.push(USERS_TAB);
  if (isSuperUser) tabs.push(BUNDLES_TAB);

  return (
    <PageLayout>
      <PageLayout.Header
        left={<h1 className="text-sm font-semibold text-foreground">Permissions</h1>}
        right={tabs.length > 0 ? <TabNav items={tabs} rootHref={tabs[0]!.href} /> : undefined}
      />
      <PageLayout.Body>{children}</PageLayout.Body>
    </PageLayout>
  );
}
