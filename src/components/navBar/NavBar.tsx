"use client";

import Link from "next/link";
import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";
import { Button } from "@/style/components/button";
import NavMenu from "./NavMenu";
import { NotificationsPopover } from "./notifications/NotificationsPopover";
import { GlobalConfigMenu } from "./GlobalConfigMenu";
import { UserPopover } from "./UserPopover";
import { useNavBarDeps } from "./useNavBarDeps";
import { can } from "@/permission/can";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";

export default function NavBar() {
  useNavBarDeps();
  const isAuthenticated = useSelector(authSelect.isAuthenticated);
  const isInitialized = useSelector(authSelect.isInitialized);
  const allows = useSelector(userCapabilitiesSelect.allows);

  return (
    <nav
      className="sticky top-0 z-50 w-full border-b border-border bg-[color-mix(in_oklch,var(--accent)_20%,var(--background))] px-4 py-3 shadow-sm"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Menu */}
        <NavMenu />

        {/* Logo */}
        <Link
          href="/"
          className="text-xl font-bold text-foreground hover:opacity-80"
        >
          SGMonti
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!isInitialized ? (
            <Button variant="outline" size="sm" className="w-20" disabled>
              Loading
            </Button>
          ) : isAuthenticated ? (
            <>
              {allows(can.accessRequests.read) && <NotificationsPopover />}

              <GlobalConfigMenu />
              <UserPopover />
            </>
          ) : (
            <Button asChild variant="primary" size="sm">
              <Link href="/auth/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
