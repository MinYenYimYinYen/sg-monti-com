import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { corruptedSyncRecordActions } from "@/app/realGreen/customer/sync/corruptedRecords/corruptedSyncRecordSlice";

/**
 * Auto-fetches all corrupted sync records from MongoDB on mount.
 * Params are not yet implemented — the fetch currently returns all records.
 *
 * TODO: Add filtering params (entityType, timestamp range) once the
 * investigation UI query shape is finalized.
 */
export function useCorruptedSyncRecord() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(
      corruptedSyncRecordActions.getCorruptedSyncRecords({
        params: {},
        config: { loadingMsg: "Loading corrupted sync records..." },
      }),
    );
  }, [dispatch]);
}
