"use client";

import { ReactNode, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { authActions, authSelect } from "@/app/auth/authSlice";
import { AppDispatch } from "@/store";

export default function AuthInitializer({ children }: { children: ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const isInitialized = useSelector(authSelect.isInitialized);
  const isAuthenticated = useSelector(authSelect.isAuthenticated);

  useEffect(() => {
    // If we haven't checked yet, and we aren't already logged in (e.g. from a previous session in memory), check.
    if (!isInitialized && !isAuthenticated) {
      // We pass showLoading: false because we might want a custom splash screen or just silent check
      dispatch(authActions.checkAuth({ showLoading: false }));
    }
  }, [dispatch, isInitialized, isAuthenticated]);

  // Optional: You could return a global splash screen here if !isInitialized
  // For now, we just render children and let AuthGuard handle protection
  return <>{children}</>;
}
