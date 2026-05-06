import { useActiveCustomers } from "@/app/realGreen/customer/hooks/useActiveCustomers";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useEmployee } from "@/app/realGreen/employee/useEmployee";
import { useAssignmentPlan } from "@/app/bizPlan/assignmentPlan/useAssignmentPlan";
import { useFlag } from "@/app/realGreen/flag/useFlag";
import { useSelectedCustFlags } from "@/app/realGreen/custFlag/_lib/useSelectedCustFlags";
import { CustomerContextMode } from "@/app/realGreen/customer/slices/customerSlices";
import { useDiscount } from "@/app/realGreen/discount/useDiscount";

// Module-level constant ensures referential stability across renders,
// preventing useCustomerContext's useEffect from firing on every re-render.
const PACE_CONTEXTS: CustomerContextMode[] = ["active"];

export function usePaceDeps() {
  useCustomerContext({ contexts: PACE_CONTEXTS });
  useActiveCustomers({ autoLoad: true });
  useProgServ({ autoLoad: true });
  useEmployee({ autoLoad: true });
  useAssignmentPlan({ autoLoad: true });
  useFlag({ autoLoad: true });
  useSelectedCustFlags();
  useDiscount({autoLoad: true})
}
