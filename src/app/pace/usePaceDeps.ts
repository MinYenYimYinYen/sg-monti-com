"use client";

import { useSelector } from "react-redux";
import { usePaceAssignmentGroup } from "@/app/pace/assignmentGroup/useAssignmentGroup";
import { useGroupSequence } from "@/app/pace/groupSequence/useGroupSequence";
import { usePaceAssignmentPlan } from "@/app/pace/assignmentPlan/useAssignmentPlan";
import { usePaceSeasonPlan } from "@/app/pace/seasonPlan/useSeasonPlan";
import { useActiveCustomers } from "@/app/realGreen/customer/hooks/useActiveCustomers";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useEmployee } from "@/app/realGreen/employee/useEmployee";
import { useDiscount } from "@/app/realGreen/discount/useDiscount";
import { usePriorityService } from "@/app/priorityService/usePriorityService";
import { usePlannedTimeOff } from "@/app/plannedTimeOff/usePlannedTimeOff";
import { useHoliday } from "@/app/holiday/useHoliday";
import { useEmployeeAvailability } from "@/app/employeeAvailability/useEmployeeAvailability";
import { useAssignments } from "@/app/assignment/useAssignments";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { CustomerContextMode } from "@/app/realGreen/customer/slices/customerSlices";

const PACE_CONTEXTS: CustomerContextMode[] = ["active"];

/**
 * Single orchestration point for all data the pace engine needs.
 * Called once in layout.tsx — sub-pages never call these hooks directly.
 */
export function usePaceDeps() {
  useCustomerContext({ contexts: PACE_CONTEXTS });
  useActiveCustomers({ autoLoad: true });
  useProgServ({ autoLoad: true });
  useEmployee({ autoLoad: true });
  usePaceAssignmentPlan({ autoLoad: true });
  usePaceAssignmentGroup({ autoLoad: true });
  useGroupSequence({ autoLoad: true });
  usePaceSeasonPlan({ autoLoad: true });
  useDiscount({ autoLoad: true });
  usePriorityService({ autoLoad: true });
  usePlannedTimeOff({ autoLoad: true });
  useHoliday({ autoLoad: true });
  useEmployeeAvailability({ autoLoad: true });

  // Load assignments for all active services so the past crawl phase can
  // build the assigned-per-date map for valid production date detection.
  const serviceDocs = useSelector(centralSelect.serviceDocs);
  useAssignments({ servIds: serviceDocs.map((s) => s.servId) });
}
