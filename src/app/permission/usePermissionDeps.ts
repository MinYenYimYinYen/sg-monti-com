import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { capabilityBundleActions } from "@/app/permission/capabilityBundle/capabilityBundleSlice";
import { userCapabilitiesActions } from "@/app/permission/userCapabilities/userCapabilitiesSlice";
import { PERMISSION_STALE_MS } from "@/app/permission/_lib/permissionConst";

/** Loads everything the Permission screens read. Called only from the Permission layout. */
export function usePermissionDeps() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(
      userCapabilitiesActions.listUsers({
        params: {},
        config: { loadingMsg: "Loading users...", staleTime: PERMISSION_STALE_MS },
      }),
    );
    dispatch(
      userCapabilitiesActions.getAllUserCapabilities({
        params: {},
        config: { loadingMsg: "Loading user capabilities...", staleTime: PERMISSION_STALE_MS },
      }),
    );
  }, [dispatch]);

  useEffect(() => {
    dispatch(
      capabilityBundleActions.getAllCapabilityBundles({
        params: {},
        config: { loadingMsg: "Loading capability bundles...", staleTime: PERMISSION_STALE_MS },
      }),
    );
  }, [dispatch]);
}
