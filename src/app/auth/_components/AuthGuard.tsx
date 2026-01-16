"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";
import { AUTH_CONST } from "@/app/auth/_lib/authConst";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useSelector(authSelect.isAuthenticated);

  const isPublic = AUTH_CONST.PUBLIC_PATHS.some((path) =>
    pathname.startsWith(path),
  );

  useEffect(() => {
    if (!isPublic && !isAuthenticated) {
      const loginUrl = `auth/login?from=${encodeURIComponent(pathname)}`;
      router.push(loginUrl);
    }
  }, [isPublic, isAuthenticated, pathname, router]);

  // RENDER LOGIC
  // 1. Public Page? Always render.
  if (isPublic) {
    return <>{children}</>;
  }

  // 2. Protected Page & Not Authenticated? Render nothing (Effect will redirect).
  if (!isAuthenticated) {
    return null; // Or <LoadingSpinner />
  }

  // 3. Protected Page & Authenticated? Render.
  return <>{children}</>;
}
