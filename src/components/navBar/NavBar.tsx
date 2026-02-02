"use client";

import Link from "next/link";
import { useAuth } from "@/app/auth/_hooks/useAuth";
import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";
import { useState } from "react";
import { Inbox } from "lucide-react";
import AdminActionModal from "@/app/auth/_components/AdminActionModal";
import { Button } from "@/style/components/button";

export default function NavBar() {
  const { logout } = useAuth();
  const user = useSelector(authSelect.user);
  const isAuthenticated = useSelector(authSelect.isAuthenticated);
  const isInitialized = useSelector(authSelect.isInitialized);

  // Admin State
  const pendingUsers = useSelector(authSelect.adminPendingUsers);
  const pendingResets = useSelector(authSelect.adminPendingResets);
  const totalPending = pendingUsers.length + pendingResets.length;
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  return (
    <nav
      className="sticky top-0 z-50 w-full border-b border-border bg-secondary 
    px-4 py-3 shadow-sm"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/*Menu*/}
        <div>Menu</div>


        {/* Logo */}
        <Link
          href="/public"
          className="text-xl font-bold text-primary hover:opacity-80"
        >
          SGMonti
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {!isInitialized ? (
            // Loading Skeleton
            <Button variant="ghost" size="sm" className="w-20" disabled={true}>
              Loading
            </Button>
          ) : isAuthenticated ? (
            <>
              {user?.role === "admin" && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative mr-2 text-foreground hover:bg-accent hover:text-accent-foreground"
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

              <span className="hidden text-sm font-medium text-muted-foreground md:block">
                Hello, {user?.firstName}
              </span>
              <Button variant="destructive" size="sm" onClick={() => logout()}>
                Logout
              </Button>
            </>
          ) : (
            <Button asChild variant="default" size="sm">
              <Link href="/auth/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
