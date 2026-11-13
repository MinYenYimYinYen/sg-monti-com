"use client";

import { ReactNode, useEffect } from "react";
import { useSelector } from "react-redux";
import { authActions, authSelect } from "@/app/auth/authSlice";
import { useAppDispatch } from "@/lib/hooks/redux";
import { userCapabilitiesActions } from "@/app/permission/userCapabilities/userCapabilitiesSlice";
import { PERMISSION_STALE_MS } from "@/app/permission/_lib/permissionConst";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { authCapabilities } from "@/app/auth/authCapabilities";

const { can } = authCapabilities;

export default function AuthInitializer({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const isInitialized = useSelector(authSelect.isInitialized);
  const isAuthenticated = useSelector(authSelect.isAuthenticated);
  const allows = useSelector(userCapabilitiesSelect.allows);
  const canReadAccessRequests = allows(can.accessRequests.read);

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

  // 3. Fetch the pending approvals and password resets for whoever may read them. This runs again
  // once the user's capabilities have loaded, which is after login.
  useEffect(() => {
    if (isAuthenticated && canReadAccessRequests) {
      dispatch(
        authActions.getPendingActions({
          params: {},
          config: { showLoading: false },
        }),
      );
    }
  }, [dispatch, isAuthenticated, canReadAccessRequests]);

  return <>{children}</>;
}
