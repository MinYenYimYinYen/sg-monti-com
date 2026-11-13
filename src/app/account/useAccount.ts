import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { useQboAccount } from "@/app/qbo/account/useQboAccount";
import { useQboCustomer } from "@/app/qbo/customer/useQboCustomer";
import { useQboVendor } from "@/app/qbo/vendor/useQboVendor";
import { useRgAccount } from "@/app/realGreen/rgAccount/useRgAccount";
import { depositFieldMappingActions } from "@/app/javelin/depositMapping/depositFieldMappingSlice";
import { AccountMappingNameType } from "@/app/account/AccountMappingTypes";
import { accountMappingActions } from "@/app/account/accountMappingSlice";
import { qboConst } from "@/app/qbo/_lib/qboConst";

/** Which of the loads this hook fires the caller may make. Absent means allowed, so write-only callers can skip it. */
type CanLoad = {
  depositLinks?: boolean;
  qboAccounts?: boolean;
  qboCustomers?: boolean;
  qboVendors?: boolean;
  rgAccounts?: boolean;
};

/**
 * Loads RealGreen accounts, QuickBooks accounts and the stored links between them, and exposes
 * actions only. Components read merged data from accountSelect.
 *
 * `canLoad` comes from the component, because hooks expose actions only and do not select. A load
 * the user may not make is skipped, so a user holding part of what this page uses gets no refused
 * request and no error toast.
 */
export function useAccount({ autoLoad, canLoad = {} }: { autoLoad: boolean; canLoad?: CanLoad }) {
  const {
    depositLinks: canLoadDepositLinks = true,
    qboAccounts: canLoadQboAccounts = true,
    qboCustomers: canLoadQboCustomers = true,
    qboVendors: canLoadQboVendors = true,
    rgAccounts: canLoadRgAccounts = true,
  } = canLoad;
  const dispatch = useAppDispatch();
  // Every hook is always called, in the same order. A flag only turns its autoLoad off.
  const { refresh: refreshQboAccounts } = useQboAccount({ autoLoad: autoLoad && canLoadQboAccounts });
  // Customers and vendors are the choices for an account's default name.
  const { refresh: refreshQboCustomers } = useQboCustomer({ autoLoad: autoLoad && canLoadQboCustomers });
  const { refresh: refreshQboVendors } = useQboVendor({ autoLoad: autoLoad && canLoadQboVendors });
  const { refresh: refreshRgAccounts } = useRgAccount({ autoLoad, canLoad: canLoadRgAccounts });

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
      // The deposit fields are linked on the same page, so their links load with the rest.
      if (canLoadDepositLinks) {
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
    }
  }, [autoLoad, canLoadDepositLinks, dispatch]);

  const refresh = () => {
    if (canLoadQboAccounts) refreshQboAccounts();
    if (canLoadQboCustomers) refreshQboCustomers();
    if (canLoadQboVendors) refreshQboVendors();
    refreshRgAccounts();
    dispatch(
      accountMappingActions.getAccountMappings({
        params: {},
        config: { loadingMsg: "Loading account mappings...", force: true },
      }),
    );
    if (canLoadDepositLinks) {
      dispatch(
        depositFieldMappingActions.getDepositFieldMappings({
          params: {},
          config: { loadingMsg: "Loading deposit account links...", force: true },
        }),
      );
    }
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
