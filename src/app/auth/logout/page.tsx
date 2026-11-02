"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/app/auth/_hooks/useAuth";
import { AuthCard } from "@/app/auth/_components/AuthCard";

export default function LogoutPage() {
  const { logout } = useAuth();
  const hasStarted = useRef(false);

  // Hard navigation (not router.push) so the cleared cookies are what the proxy
  // sees on the next request and Redux starts fresh, same reasoning as Login.tsx.
  // The redirect happens even if logout fails: the thunk reports its own errors
  // through the global toast, and an unsent cookie delete only bounces the user home.
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    logout().then(() => {
      window.location.href = "/auth/login";
    });
  }, [logout]);

  return (
    <AuthCard
      title="Signing out"
      description="You are being signed out and sent to the login page."
    >
      <p className="text-center text-sm text-muted-foreground">
        If you are having trouble logging in, please contact an administrator for help.
      </p>
    </AuthCard>
  );
}
