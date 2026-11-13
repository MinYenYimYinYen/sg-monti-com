import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { corruptedSyncRecordActions } from "@/app/realGreen/customer/sync/corruptedRecords/corruptedSyncRecordSlice";

/**
 * Auto-fetches all corrupted sync records from MongoDB on mount.
 * Params are not yet implemented — the fetch currently returns all records.
 *
 * TODO: Add filtering params (entityType, timestamp range) once the
 * investigation UI query shape is finalized.
 *
 * `canLoad` comes from the component, because hooks expose actions only and do not select. It
 * defaults to allowed so callers that do not gate can omit it.
 */
export function useCorruptedSyncRecord({
  canLoad = true,
}: { canLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!canLoad) return;
    dispatch(
      corruptedSyncRecordActions.getCorruptedSyncRecords({
        params: {},
        config: { loadingMsg: "Loading corrupted sync records..." },
      }),
    );
  }, [canLoad, dispatch]);
}
