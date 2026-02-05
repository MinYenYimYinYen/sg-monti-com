"use client";

import Link from "next/link";
import { useAuth } from "@/app/auth/_hooks/useAuth";
import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";
import React, { useState, useEffect } from "react";
import { Inbox, Moon, Sun } from "lucide-react";
import AdminActionModal from "@/app/auth/_components/AdminActionModal";
import { Button } from "@/style/components/button";
import NavMenu from "./NavMenu";

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

  // Dark Mode State
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial theme
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle("dark");
    setIsDark((prev) => !prev);
  };

  return (
    <nav
      className="sticky top-0 z-50 w-full border-b border-border bg-[color-mix(in_oklch,var(--accent)_20%,var(--background))] px-4 py-3 shadow-sm"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/*Menu*/}
        <NavMenu />

        {/* Logo */}
        <Link
          href="/"
          className={"text-xl font-bold text-foreground hover:opacity-80"}
        >
          SGMonti
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {!isInitialized ? (
            // Loading Skeleton
            <Button variant="outline" size="sm" className="w-20" disabled={true}>
              Loading
            </Button>
          ) : isAuthenticated ? (
            <>
              {/* Dark Mode Toggle */}
              <Button
                variant="accent"
                intensity="ghost"
                size="icon"
                onClick={toggleDarkMode}
                aria-label="Toggle dark mode"
              >
                {isDark ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>

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

              <span className="hidden text-sm font-medium text-muted-foreground md:block">
                Hello, {user?.firstName}
              </span>
              <Button variant="destructive" size="sm" onClick={() => logout()}>
                Logout
              </Button>
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
