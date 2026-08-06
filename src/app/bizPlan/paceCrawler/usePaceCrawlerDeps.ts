import { useActiveCustomers } from "@/app/realGreen/customer/hooks/useActiveCustomers";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useEmployee } from "@/app/realGreen/employee/useEmployee";
import { useAssignmentPlan } from "@/app/bizPlan/assignmentPlan/useAssignmentPlan";
import { useFlag } from "@/app/realGreen/flag/useFlag";
import { useSelectedCustFlags } from "@/app/realGreen/custFlag/_lib/useSelectedCustFlags";
import { CustomerContextMode } from "@/app/realGreen/customer/slices/customerSlices";
import { useDiscount } from "@/app/realGreen/discount/useDiscount";
import { usePriorityService } from "@/app/priorityService/usePriorityService";
import { usePlannedTimeOff } from "@/app/plannedTimeOff/usePlannedTimeOff";
import { useHoliday } from "@/app/holiday/useHoliday";

const PACE_CRAWLER_CONTEXTS: CustomerContextMode[] = ["active"];

export function usePaceCrawlerDeps() {
  useCustomerContext({ contexts: PACE_CRAWLER_CONTEXTS });
  useActiveCustomers({ autoLoad: true });
  useProgServ({ autoLoad: true });
  useEmployee({ autoLoad: true });
  useAssignmentPlan({ autoLoad: true });
  useFlag({ autoLoad: true });
  useSelectedCustFlags();
  useDiscount({ autoLoad: true });
  usePriorityService({ autoLoad: true });
  usePlannedTimeOff({ autoLoad: true });
  useHoliday({ autoLoad: true });
}
