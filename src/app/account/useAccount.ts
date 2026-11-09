import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { useQboAccount } from "@/app/qbo/account/useQboAccount";
import { useQboCustomer } from "@/app/qbo/customer/useQboCustomer";
import { useQboVendor } from "@/app/qbo/vendor/useQboVendor";
import { useRgAccount } from "@/app/realGreen/rgAccount/useRgAccount";
import { AccountMappingNameType } from "@/app/account/AccountMappingTypes";
import { accountMappingActions } from "@/app/account/accountMappingSlice";
import { qboConst } from "@/app/qbo/_lib/qboConst";

/**
 * Loads RealGreen accounts, QuickBooks accounts and the stored links between them, and exposes
 * actions only. Components read merged data from accountSelect.
 */
export function useAccount({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useAppDispatch();
  const { refresh: refreshQboAccounts } = useQboAccount({ autoLoad });
  // Customers and vendors are the choices for an account's default name.
  const { refresh: refreshQboCustomers } = useQboCustomer({ autoLoad });
  const { refresh: refreshQboVendors } = useQboVendor({ autoLoad });
  const { refresh: refreshRgAccounts } = useRgAccount({ autoLoad });

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        accountMappingActions.getAccountMappings({
          params: {},
          config: {
            loadingMsg: "Loading account mappings...",
            staleTime: qboConst.referenceCacheTime,
          },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const refresh = () => {
    refreshQboAccounts();
    refreshQboCustomers();
    refreshQboVendors();
    refreshRgAccounts();
    dispatch(
      accountMappingActions.getAccountMappings({
        params: {},
        config: { loadingMsg: "Loading account mappings...", force: true },
      }),
    );
  };

  /** Leaving the default name out clears any stored one, so relinking never keeps a stale name. */
  const upsertMapping = ({
    rgAccountId,
    qboAccountId,
    defaultNameType,
    defaultNameId,
  }: {
    rgAccountId: string;
    qboAccountId: string;
    defaultNameType?: AccountMappingNameType;
    defaultNameId?: string;
  }) =>
    dispatch(
      accountMappingActions.upsertAccountMapping({
        params: { rgAccountId, qboAccountId, defaultNameType, defaultNameId },
        config: { showLoading: false },
      }),
    );

  const removeMapping = (rgAccountId: string) =>
    dispatch(
      accountMappingActions.removeAccountMapping({
        params: { rgAccountId },
        config: { showLoading: false },
      }),
    );

  return { refresh, upsertMapping, removeMapping };
}
