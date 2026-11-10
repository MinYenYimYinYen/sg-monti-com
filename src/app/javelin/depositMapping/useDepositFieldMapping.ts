import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { qboConst } from "@/app/qbo/_lib/qboConst";
import { AccountMappingNameType } from "@/app/account/AccountMappingTypes";
import { DepositLinkKey } from "@/app/javelin/JavelinTypes";
import { depositFieldMappingActions } from "@/app/javelin/depositMapping/depositFieldMappingSlice";

/** Loads the deposit field links when `autoLoad` is set and exposes actions only. */
export function useDepositFieldMapping({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        depositFieldMappingActions.getDepositFieldMappings({
          params: {},
          config: {
            loadingMsg: "Loading deposit account links...",
            staleTime: qboConst.referenceCacheTime,
          },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  /** Leaving the default name out clears any stored one, so relinking never keeps a stale name. */
  const upsertLink = ({
    field,
    qboAccountId,
    defaultNameType,
    defaultNameId,
  }: {
    field: DepositLinkKey;
    qboAccountId: string;
    defaultNameType?: AccountMappingNameType;
    defaultNameId?: string;
  }) =>
    dispatch(
      depositFieldMappingActions.upsertDepositFieldMapping({
        params: { field, qboAccountId, defaultNameType, defaultNameId },
        config: { showLoading: false },
      }),
    );

  const removeLink = (field: DepositLinkKey) =>
    dispatch(
      depositFieldMappingActions.removeDepositFieldMapping({
        params: { field },
        config: { showLoading: false },
      }),
    );

  return { upsertLink, removeLink };
}
