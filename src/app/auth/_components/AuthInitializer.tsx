"use client";

import { ReactNode, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { authActions, authSelect } from "@/app/auth/authSlice";
import { AppDispatch } from "@/store";

export default function AuthInitializer({ children }: { children: ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const isInitialized = useSelector(authSelect.isInitialized);
  const isAuthenticated = useSelector(authSelect.isAuthenticated);
  const user = useSelector(authSelect.user);

  // 1. Check Auth on Mount
  useEffect(() => {
    if (!isInitialized && !isAuthenticated) {
      dispatch(authActions.checkAuth({ showLoading: false }));
    }
  }, [dispatch, isInitialized, isAuthenticated]);

  // 2. Fetch Admin Actions if Admin
  useEffect(() => {
    if (isAuthenticated && user?.role === "admin") {
      dispatch(authActions.getPendingActions({ showLoading: false }));
    }
  }, [dispatch, isAuthenticated, user?.role]);

  return <>{children}</>;
}
