"use client";

import { ReactNode, useEffect } from "react";
import { useSelector } from "react-redux";
import { authActions, authSelect } from "@/app/auth/authSlice";
import { useAppDispatch } from "@/lib/hooks/redux";
import { userCapabilitiesActions } from "@/app/permission/userCapabilities/userCapabilitiesSlice";
import { PERMISSION_STALE_MS } from "@/app/permission/_lib/permissionConst";

export default function AuthInitializer({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const isInitialized = useSelector(authSelect.isInitialized);
  const isAuthenticated = useSelector(authSelect.isAuthenticated);
  const user = useSelector(authSelect.user);

  // 1. Check Auth on Mount
  useEffect(() => {
    if (!isInitialized && !isAuthenticated) {
      dispatch(
        authActions.checkAuth({
          config: { showLoading: false, silentError: true },
          params: {},
        }),
      );
    }
  }, [dispatch, isInitialized, isAuthenticated]);

  // 2. Load the signed-in user's own resolved capabilities, for <Can>. Runs after login and
  // after session restore alike, since both set isAuthenticated. Logout clears them.
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(
        userCapabilitiesActions.getMyCapabilities({
          params: {},
          config: { showLoading: false, silentError: true, staleTime: PERMISSION_STALE_MS },
        }),
      );
    }
  }, [dispatch, isAuthenticated]);

  // 3. Fetch Admin Actions if Admin
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
