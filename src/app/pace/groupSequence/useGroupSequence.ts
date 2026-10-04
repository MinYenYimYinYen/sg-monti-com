"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { paceGroupSequenceActions } from "@/app/pace/groupSequence/groupSequenceSlice";
import { GroupSequence } from "@/app/pace/groupSequence/GroupSequenceTypes";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

export function useGroupSequence({ autoLoad }: { autoLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        paceGroupSequenceActions.getSequences({
          params: {},
          config: { staleTime: realGreenConst.paramTypesCacheTime },
        }),
      );
    }
  }, [autoLoad, dispatch]);

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
