import { useActiveCustomers } from "@/app/realGreen/customer/hooks/useActiveCustomers";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useEmployee } from "@/app/realGreen/employee/useEmployee";
import { useAssignmentPlan } from "@/app/bizPlan/assignmentPlan/useAssignmentPlan";

export function usePaceDeps() {
  useCustomerContext({ contexts: ["active"] });
  useActiveCustomers({ autoLoad: true });
  // useProgServ({ autoLoad: true });
  useEmployee({ autoLoad: true });
  useAssignmentPlan({ autoLoad: true });
}
