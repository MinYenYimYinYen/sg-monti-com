import { useAppDispatch } from "@/lib/hooks/redux";
import { capabilityBundleActions } from "@/app/permission/capabilityBundle/capabilityBundleSlice";
import { CapabilityBundleContract } from "@/app/permission/capabilityBundle/api/CapabilityBundleContract";

/**
 * The superuser-only write actions. It loads nothing: the Permission layout loads the data once
 * (usePermissionDeps), and screens read it with useSelector.
 */
export function useCapabilityBundle() {
  const dispatch = useAppDispatch();

  const upsertBundle = (params: CapabilityBundleContract["upsert"]["params"]) =>
    dispatch(
      capabilityBundleActions.upsertCapabilityBundle({
        params,
        config: { loadingMsg: "Saving bundle...", successMsg: "Bundle saved" },
      }),
    );

  const removeBundle = (params: CapabilityBundleContract["remove"]["params"]) =>
    dispatch(
      capabilityBundleActions.removeCapabilityBundle({
        params,
        config: { loadingMsg: "Deleting bundle...", successMsg: "Bundle deleted" },
      }),
    );

  return { upsertBundle, removeBundle };
}
