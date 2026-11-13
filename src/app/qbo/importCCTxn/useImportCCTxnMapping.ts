import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { importCCTxnMappingActions } from "@/app/qbo/importCCTxn/importCCTxnMappingSlice";
import { qboConst } from "@/app/qbo/_lib/qboConst";
import {
  CardAssignment,
  FormatAccount,
  MerchantMapping,
  SkipRule,
} from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";

/** Which mapping lists the caller may load. Absent means allowed, so write-only callers can skip it. */
type CanLoad = {
  formatAccounts?: boolean;
  cardAssignments?: boolean;
  merchantMappings?: boolean;
  skipRules?: boolean;
};

/**
 * Loads the four mapping lists when `autoLoad` is set (cached) and exposes actions only.
 * `canLoad` comes from the layout, because hooks expose actions only and do not select. A list the
 * user may not read is skipped, so no refused request and no error toast.
 */
export function useImportCCTxnMapping({
  autoLoad,
  canLoad = {},
}: {
  autoLoad: boolean;
  canLoad?: CanLoad;
}) {
  const {
    formatAccounts: canLoadFormatAccounts = true,
    cardAssignments: canLoadCardAssignments = true,
    merchantMappings: canLoadMerchantMappings = true,
    skipRules: canLoadSkipRules = true,
  } = canLoad;
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!autoLoad) return;
    const config = { loadingMsg: "Loading import mappings...", staleTime: qboConst.referenceCacheTime };
    // The assignable users are the choices for a card assignment, so they follow that read.
    if (canLoadCardAssignments) {
      dispatch(importCCTxnMappingActions.getAssignableUsers({ params: {}, config }));
      dispatch(importCCTxnMappingActions.getCardAssignments({ params: {}, config }));
    }
    if (canLoadFormatAccounts) {
      dispatch(importCCTxnMappingActions.getFormatAccounts({ params: {}, config }));
    }
    if (canLoadMerchantMappings) {
      dispatch(importCCTxnMappingActions.getMerchantMappings({ params: {}, config }));
    }
    if (canLoadSkipRules) {
      dispatch(importCCTxnMappingActions.getSkipRules({ params: {}, config }));
    }
  }, [
    autoLoad,
    canLoadFormatAccounts,
    canLoadCardAssignments,
    canLoadMerchantMappings,
    canLoadSkipRules,
    dispatch,
  ]);

  const saveFormatAccount = (formatAccount: FormatAccount) =>
    dispatch(
      importCCTxnMappingActions.upsertFormatAccount({
        params: { formatAccount },
        config: { loadingMsg: "Saving format accounts..." },
      }),
    );

  const saveCardAssignment = (cardAssignment: CardAssignment) =>
    dispatch(
      importCCTxnMappingActions.upsertCardAssignment({
        params: { cardAssignment },
        config: { loadingMsg: "Saving card assignment..." },
      }),
    );

  const saveMerchantMapping = (merchantMapping: MerchantMapping) =>
    dispatch(
      importCCTxnMappingActions.upsertMerchantMapping({
        params: { merchantMapping },
        config: { loadingMsg: "Saving merchant mapping..." },
      }),
    );

  // Ticking a description as seen next to the vendor. It never changes the vendor or accounts.
  const confirmMerchant = ({
    merchantKey,
    description,
  }: {
    merchantKey: string;
    description: string;
  }) =>
    dispatch(
      importCCTxnMappingActions.confirmMerchant({
        params: { merchantKey, description },
        config: { loadingMsg: "Confirming..." },
      }),
    );

  const deleteMerchantMapping = ({
    merchantKey,
    ownerUserName,
  }: {
    merchantKey: string;
    ownerUserName: string | null;
  }) =>
    dispatch(
      importCCTxnMappingActions.deleteMerchantMapping({
        params: { merchantKey, ownerUserName },
        config: { loadingMsg: "Deleting merchant mapping..." },
      }),
    );

  const saveSkipRule = (skipRule: SkipRule) =>
    dispatch(
      importCCTxnMappingActions.upsertSkipRule({
        params: { skipRule },
        config: { loadingMsg: "Saving skip rule..." },
      }),
    );

  const deleteSkipRule = (merchantKey: string) =>
    dispatch(
      importCCTxnMappingActions.deleteSkipRule({
        params: { merchantKey },
        config: { loadingMsg: "Deleting skip rule..." },
      }),
    );

  return {
    saveFormatAccount,
    saveCardAssignment,
    saveMerchantMapping,
    confirmMerchant,
    deleteMerchantMapping,
    saveSkipRule,
    deleteSkipRule,
  };
}
