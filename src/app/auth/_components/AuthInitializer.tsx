"use client";

import { ReactNode, useEffect } from "react";
import { useSelector } from "react-redux";
import { authActions, authSelect } from "@/app/auth/authSlice";
import { useAppDispatch } from "@/lib/hooks/redux";

export default function AuthInitializer({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const isInitialized = useSelector(authSelect.isInitialized);
  const isAuthenticated = useSelector(authSelect.isAuthenticated);
  const user = useSelector(authSelect.user);

  // 1. Check Auth on Mount
  useEffect(() => {
    if (!isInitialized && !isAuthenticated) {
      dispatch(
        authActions.checkAuth({ config: { showLoading: false }, params: {} }),
      );
    }
  }, [dispatch, isInitialized, isAuthenticated]);

  // 2. Fetch Admin Actions if Admin
  useEffect(() => {
    if (isAuthenticated && user?.role === "admin") {
      dispatch(
        authActions.getPendingActions({
          params: {},
          config: { showLoading: false },
        }),
      );
    }
  }, [dispatch, isAuthenticated, user?.role]);

  return <>{children}</>;
}
