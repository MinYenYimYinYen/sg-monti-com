"use client";

import Link from "next/link";
import { useAuth } from "@/app/auth/_hooks/useAuth";
import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";
import { Button } from "@/style/components/Button";

export default function NavBar() {
  const { logout } = useAuth();
  const user = useSelector(authSelect.user);
  const isAuthenticated = useSelector(authSelect.isAuthenticated);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-sg-green-brdr bg-sg-green-bg px-4 py-3 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="text-xl font-bold text-sg-green-brdr hover:opacity-80"
        >
          SGMonti
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <span className="hidden text-sm font-medium text-sg-green-brdr md:block">
                Hello, {user?.firstName}
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => logout({ loadingMsg: "Logging out..." })}
              >
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
