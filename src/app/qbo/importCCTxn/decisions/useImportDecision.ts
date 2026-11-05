import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { importDecisionActions } from "@/app/qbo/importCCTxn/decisions/importDecisionSlice";
import { SaveDecisionsParams } from "@/app/qbo/importCCTxn/types/ImportDecisionTypes";

/**
 * Actions for the Map tab's draft. Nothing here calls the server until `saveDecisions`. The draft
 * and everything derived from it are read with useSelector(importDecisionSelect...).
 */
export function useImportDecision() {
  const dispatch = useAppDispatch();

  const pickVendor = ({
    rowId,
    merchantKey,
    vendorId,
    storedVendorId,
  }: {
    rowId: string;
    merchantKey: string;
    vendorId: string;
    storedVendorId: string | null;
  }) => dispatch(importDecisionActions.pickVendor({ rowId, merchantKey, vendorId, storedVendorId }));

  const pickAccount = ({
    rowId,
    merchantKey,
    accountId,
  }: {
    rowId: string;
    merchantKey: string;
    accountId: string;
  }) => dispatch(importDecisionActions.pickAccount({ rowId, merchantKey, accountId }));

  const setRowSkipped = ({ rowId, isSkipped }: { rowId: string; isSkipped: boolean }) =>
    dispatch(importDecisionActions.setRowSkipped({ rowId, isSkipped }));

  const setAlwaysSkip = ({
    merchantKey,
    isAlwaysSkip,
  }: {
    merchantKey: string;
    isAlwaysSkip: boolean;
  }) => dispatch(importDecisionActions.setAlwaysSkip({ merchantKey, isAlwaysSkip }));

  const setRowConfirmed = ({
    rowId,
    merchantKey,
    vendorId,
    isConfirmed,
  }: {
    rowId: string;
    merchantKey: string;
    vendorId: string;
    isConfirmed: boolean;
  }) => dispatch(importDecisionActions.setRowConfirmed({ rowId, merchantKey, vendorId, isConfirmed }));

  // Forced, and never deduplicated: a save writes, and it sends the draft as it is right now.
  const saveDecisions = (params: SaveDecisionsParams) =>
    dispatch(
      importDecisionActions.saveDecisions({
        params,
        config: { force: true, loadingMsg: "Saving decisions..." },
      }),
    );

  const discardDraft = () => dispatch(importDecisionActions.discardDraft());

  return {
    pickVendor,
    pickAccount,
    setRowSkipped,
    setAlwaysSkip,
    setRowConfirmed,
    saveDecisions,
    discardDraft,
  };
}

/** Clears the save status when the Map tab goes away, so a later visit starts quiet. */
export function useResetImportDecisionStatus() {
  const dispatch = useAppDispatch();
  useEffect(
    () => () => {
      dispatch(importDecisionActions.resetSaveStatus());
    },
    [dispatch],
  );
}
