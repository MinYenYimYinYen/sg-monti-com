"use client";

import Link from "next/link";
import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";
import { useState } from "react";
import { Inbox } from "lucide-react";
import AdminActionModal from "@/app/auth/_components/AdminActionModal";
import { Button } from "@/style/components/button";
import NavMenu from "./NavMenu";
import { GlobalConfigMenu } from "./GlobalConfigMenu";
import { UserPopover } from "./UserPopover";

export default function NavBar() {
  const isAuthenticated = useSelector(authSelect.isAuthenticated);
  const isInitialized = useSelector(authSelect.isInitialized);
  const user = useSelector(authSelect.user);

  // Admin State
  const pendingUsers = useSelector(authSelect.adminPendingUsers);
  const pendingResets = useSelector(authSelect.adminPendingResets);
  const totalPending = pendingUsers.length + pendingResets.length;
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

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
              {user?.role === "admin" && (
                <>
                  <Button
                    variant="accent"
                    intensity="ghost"
                    size="icon"
                    className="relative"
                    onClick={() => setIsAdminModalOpen(true)}
                  >
                    <Inbox className="h-5 w-5" />
                    {totalPending > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                        {totalPending}
                      </span>
                    )}
                  </Button>
                  <AdminActionModal
                    isOpen={isAdminModalOpen}
                    onClose={() => setIsAdminModalOpen(false)}
                  />
                </>
              )}

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
