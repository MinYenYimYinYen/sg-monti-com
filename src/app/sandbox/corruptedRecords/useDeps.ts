import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useCorruptedSyncRecord } from "@/app/realGreen/customer/sync/corruptedRecords/useCorruptedSyncRecord";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useCorruptedRecordsCustomers } from "@/app/realGreen/customer/hooks/useCorruptedRecordsCustomers";
import { corruptedSyncRecordSelect } from "@/app/realGreen/customer/sync/corruptedRecords/corruptedSyncRecordSelect";

/**
 * Orchestrates all data hooks for the Corrupted Records investigation feature.
 *
 * Called once in layout.tsx — sub-route pages never call these hooks again.
 *
 * Contexts active:
 * - "corruptedRecords": neighbor services around each corrupted gap (ServId Context tab)
 * - "customerQuery": ad-hoc customer queries (Employee Corrupted? tab, Programs Without Services tab)
 */
export function useDeps() {
  useCorruptedSyncRecord();
  useProgServ({ autoLoad: true });
  useCustomerContext({ contexts: ["corruptedRecords", "customerQuery", "active"] });

  // Collect all neighbor servIds from the service-type corrupted records
  // so the corruptedRecords context can load their customer/program/service hierarchy.
  const byEntityType = useSelector(corruptedSyncRecordSelect.byEntityType);
  const serviceRecords = byEntityType.get("service") ?? [];

  const neighborServIds = useMemo(() => {
    const ids = new Set<number>();
    for (const record of serviceRecords) {
      if (record.entityBeforeId !== null) ids.add(record.entityBeforeId);
      if (record.entityAfterId !== null) ids.add(record.entityAfterId);
    }
    return [...ids];
  }, [serviceRecords]);

  useCorruptedRecordsCustomers(neighborServIds);
}
