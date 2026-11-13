"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { paceGroupSequenceActions } from "@/app/pace/groupSequence/groupSequenceSlice";
import { GroupSequence } from "@/app/pace/groupSequence/GroupSequenceTypes";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. It
 * defaults to allowed so write-only callers can omit it.
 */
export function useGroupSequence({
  autoLoad,
  canLoad = true,
}: { autoLoad?: boolean; canLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad && canLoad) {
      dispatch(
        paceGroupSequenceActions.getSequences({
          params: {},
          config: { staleTime: realGreenConst.paramTypesCacheTime },
        }),
      );
    }
  }, [autoLoad, canLoad, dispatch]);

  const upsertSequence = (sequence: GroupSequence) =>
    dispatch(
      paceGroupSequenceActions.upsertSequence({
        params: sequence,
        config: { force: true },
      }),
    );

  const deleteSequence = (sequenceId: string) =>
    dispatch(
      paceGroupSequenceActions.deleteSequence({
        params: { sequenceId },
        config: { force: true },
      }),
    );

  return { upsertSequence, deleteSequence };
}
