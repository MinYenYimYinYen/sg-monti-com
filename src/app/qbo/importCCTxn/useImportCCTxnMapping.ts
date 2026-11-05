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

/** Loads all four mapping lists when `autoLoad` is set (cached) and exposes actions only. */
export function useImportCCTxnMapping({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!autoLoad) return;
    const config = { loadingMsg: "Loading import mappings...", staleTime: qboConst.referenceCacheTime };
    dispatch(importCCTxnMappingActions.getAssignableUsers({ params: {}, config }));
    dispatch(importCCTxnMappingActions.getFormatAccounts({ params: {}, config }));
    dispatch(importCCTxnMappingActions.getCardAssignments({ params: {}, config }));
    dispatch(importCCTxnMappingActions.getMerchantMappings({ params: {}, config }));
    dispatch(importCCTxnMappingActions.getSkipRules({ params: {}, config }));
  }, [autoLoad, dispatch]);

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
