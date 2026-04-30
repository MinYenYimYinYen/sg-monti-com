import { useActiveCustomers } from "@/app/realGreen/customer/hooks/useActiveCustomers";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useEmployee } from "@/app/realGreen/employee/useEmployee";
import { useAssignmentPlan } from "@/app/bizPlan/assignmentPlan/useAssignmentPlan";
import { CustomerContextMode } from "@/app/realGreen/customer/slices/customerSlices";

// Module-level constant ensures referential stability across renders,
// preventing useCustomerContext's useEffect from firing on every re-render.
const PACE_CONTEXTS: CustomerContextMode[] = ["active"];

export function usePaceDeps() {
  useCustomerContext({ contexts: PACE_CONTEXTS });
  useActiveCustomers({ autoLoad: true });
  useProgServ({ autoLoad: true });
  useEmployee({ autoLoad: true });
  useAssignmentPlan({ autoLoad: true });
}
