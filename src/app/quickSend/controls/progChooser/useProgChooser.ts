"use client";

import { useAppDispatch } from "@/lib/hooks/redux";
import { quickSendActions } from "@/app/quickSend/quickSendSlice";

/**
 * Encapsulates all Redux dispatch actions for the progChooser feature.
 * Components destructure from this hook rather than calling useAppDispatch directly.
 */
export function useProgChooser() {
  const dispatch = useAppDispatch();

  const toggleProgCode = ({ progCodeId, defaultServCodeIds }: { progCodeId: string; defaultServCodeIds: string[] }) => {
    dispatch(quickSendActions.toggleProgChooserProgCode({ progCodeId, defaultServCodeIds }));
  };

  const setServCodeOverride = ({ progCodeId, servCodeIds }: { progCodeId: string; servCodeIds: string[] }) => {
    dispatch(quickSendActions.setProgChooserServCodeOverride({ progCodeId, servCodeIds }));
  };

  const setPriceOverride = ({ progCodeId, price }: { progCodeId: string; price: number }) => {
    dispatch(quickSendActions.setProgChooserPriceOverride({ progCodeId, price }));
  };

  const clearPriceOverride = (progCodeId: string) => {
    dispatch(quickSendActions.clearProgChooserPriceOverride(progCodeId));
  };

  const setPrepayId = (prepayId: string | null) => {
    dispatch(quickSendActions.setProgChooserPrepayId(prepayId));
  };

  return { toggleProgCode, setServCodeOverride, setPriceOverride, clearPriceOverride, setPrepayId };
}
