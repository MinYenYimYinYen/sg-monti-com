import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { usePrintedCustomers } from "@/app/realGreen/customer/hooks/usePrintedCustomers";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useEmployee } from "@/app/realGreen/employee/useEmployee";
import { useCallAhead } from "@/app/realGreen/callAhead/useCallAhead";
import { useSelector } from "react-redux";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { useServiceEta } from "@/app/scheduling/eta/useServiceEta";
import { useAssignments } from "@/app/assignment/useAssignments";
import { usePlannedTimeOff } from "@/app/plannedTimeOff/usePlannedTimeOff";
import { SchedulingCanLoad } from "@/app/scheduling/_libShared/schedulingCanLoad";

/**
 * `canLoad` comes from the page, because hooks expose actions only and do not select. Every hook
 * is still called on every render, in the same order: a flag only turns its load off.
 */
export function usePrenotify({ canLoad }: { canLoad: SchedulingCanLoad }) {
  useCustomerContext({ contexts: ["printed"] });
  usePrintedCustomers({ autoLoad: true, canLoad: canLoad.customers });
  useProgServ({
    autoLoad: true,
    canLoad: { progCodes: canLoad.progCodes, servCodes: canLoad.servCodes },
  });
  useEmployee({ autoLoad: true, canLoad: canLoad.employees });
  useCallAhead({
    autoLoad: true,
    canLoad: {
      callAheads: canLoad.callAheads,
      keywords: canLoad.callAheadKeywords,
    },
  });
  // Required for employeeRoutedStatusSelect conflict detection.
  usePlannedTimeOff({ autoLoad: true, canLoad: canLoad.absences });

  const serviceDocs = useSelector(centralSelect.serviceDocs);
  useServiceEta({
    servIds: serviceDocs.map((s) => s.servId),
    canLoad: canLoad.serviceEtas,
  });
  useAssignments({
    servIds: serviceDocs.map((s) => s.servId),
    canLoad: canLoad.assignments,
  });
}
