import { usePrintedCustomers } from "@/app/realGreen/customer/hooks/usePrintedCustomers";
import { useFlag } from "@/app/realGreen/flag/useFlag";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useCustFlag } from "@/app/realGreen/custFlag/_lib/useCustFlag";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useUnitConfig } from "@/app/realGreen/product/unitConfig/useUnitConfig";
import { useEmployee } from "@/app/realGreen/employee/useEmployee";
import { useCallAhead } from "@/app/realGreen/callAhead/useCallAhead";
import { useServiceCondition } from "@/app/realGreen/serviceCondition/_lib/useServiceCondition";
import { useCondition } from "@/app/realGreen/conditionCode/useCondition";
import { useSelector } from "react-redux";
import { coverSheetsSelect } from "@/app/scheduling/coverSheets/_lib/selectors/coverSheetsSelect";
import { useServiceEta } from "@/app/scheduling/eta/useServiceEta";
import { useAssignments } from "@/app/assignment/useAssignments";
import { useRouteNotes } from "@/app/routeNotes/useRouteNotes";
import { SchedulingCanLoad } from "@/app/scheduling/_libShared/schedulingCanLoad";

/**
 * `canLoad` comes from the page, because hooks expose actions only and do not select. Every hook
 * is still called on every render, in the same order: a flag only turns its load off.
 */
export function useCoverSheetDeps({ canLoad }: { canLoad: SchedulingCanLoad }) {
  useCustomerContext({ contexts: ["printed"] });
  usePrintedCustomers({ autoLoad: true, canLoad: canLoad.customers });
  useProgServ({
    autoLoad: true,
    canLoad: { progCodes: canLoad.progCodes, servCodes: canLoad.servCodes },
  });
  useUnitConfig({ autoLoad: true, canLoad: canLoad.unitConversions });
  useProduct({
    autoLoad: true,
    canLoad: {
      products: canLoad.products,
      unitConversions: canLoad.unitConversions,
      appMethods: canLoad.appMethods,
    },
  });
  useFlag({ autoLoad: true, canLoad: canLoad.flags });
  useEmployee({ autoLoad: true, canLoad: canLoad.employees });
  useCallAhead({
    autoLoad: true,
    canLoad: {
      callAheads: canLoad.callAheads,
      keywords: canLoad.callAheadKeywords,
    },
  });
  useCondition({ autoLoad: true, canLoad: canLoad.conditionCodes });
  useServiceCondition({ canLoad: canLoad.serviceConditions });
  const { localCoverSheetsConfig } = useGlobalSettings({
    autoLoad: true,
    canLoad: canLoad.globalSettings,
  });

  useCustFlag({
    custStatuses: ["9"],
    flagIds: localCoverSheetsConfig.flagIds,
    canLoad: canLoad.customerFlags,
  });

  const printedServices = useSelector(coverSheetsSelect.printedServices);
  useServiceEta({
    servIds: printedServices.map((s) => s.servId),
    canLoad: canLoad.serviceEtas,
  });
  useAssignments({
    servIds: printedServices.map((s) => s.servId),
    canLoad: canLoad.assignments,
  });

  // Load route notes for all dates that have printed services.
  const allDates = useSelector(coverSheetsSelect.allDates) as string[];
  const minDate = allDates[0] ?? "";
  const maxDate = allDates[allDates.length - 1] ?? "";
  useRouteNotes({ minDate, maxDate, canLoad: canLoad.routeNotes });
}
