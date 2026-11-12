import { useAppDispatch } from "@/lib/hooks/redux";
import { userCapabilitiesActions } from "@/app/permission/userCapabilities/userCapabilitiesSlice";
import { UserCapabilitiesContract } from "@/app/permission/userCapabilities/api/UserCapabilitiesContract";

type Params<Op extends keyof UserCapabilitiesContract> = UserCapabilitiesContract[Op]["params"];

/**
 * The assignment actions. It loads nothing: the Permission layout loads the data once
 * (usePermissionDeps), and screens read it with useSelector.
 */
export function useUserCapabilities() {
  const dispatch = useAppDispatch();

  const assignBundle = (params: Params<"assignBundle">) =>
    dispatch(userCapabilitiesActions.assignCapabilityBundle({ params, config: { loadingMsg: "Assigning bundle..." } }));

  const removeBundle = (params: Params<"removeBundle">) =>
    dispatch(
      userCapabilitiesActions.removeCapabilityBundleFromUser({ params, config: { loadingMsg: "Removing bundle..." } }),
    );

  const addDirect = (params: Params<"addDirect">) =>
    dispatch(userCapabilitiesActions.addDirectCapability({ params, config: { loadingMsg: "Adding capability..." } }));

  const removeDirect = (params: Params<"removeDirect">) =>
    dispatch(
      userCapabilitiesActions.removeDirectCapability({ params, config: { loadingMsg: "Removing capability..." } }),
    );

  return { assignBundle, removeBundle, addDirect, removeDirect };
}
