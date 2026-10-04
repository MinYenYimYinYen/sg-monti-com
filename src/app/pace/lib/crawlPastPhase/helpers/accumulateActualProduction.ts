import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";

const COMPLETED_STATUSES = new Set(getServiceStatuses(["completed"]));
const PRINTED_STATUSES = new Set(getServiceStatuses(["printed"]));

/**
 * Accumulates actual production for each group, broken down by employee and date.
 *
 * For completed services (status "S"), production is attributed to each employee
 * listed in `production.doneBys` weighted by their `percent` share.
 *
 * For printed services (status "$"), the full price is attributed to the employee
 * on the most recent assignment's schedDate (100% credit — no doneBys yet).
 *
 * Returns: Map<groupId, Map<employeeId, Map<date, price>>>
 */
export function accumulateActualProduction(
  servCodes: ServCodeDeep[],
  servCodeToGroupId: Map<string, string>,
  mainDate: string,
): Map<string, Map<string, Map<string, number>>> {
  // groupId → employeeId → date → accumulated price
  const result = new Map<string, Map<string, Map<string, number>>>();

  for (const servCode of servCodes) {
    const groupId = servCodeToGroupId.get(servCode.servCodeId);
    if (!groupId) continue; // not in any assigned group

    for (const service of servCode.services) {
      if (COMPLETED_STATUSES.has(service.status) && service.production) {
        const effectiveDate = service.production.doneDate;
        if (!effectiveDate || effectiveDate >= mainDate) continue;

        const { doneBys } = service.production;

        if (doneBys.length > 0) {
          // Attribute price proportionally to each doneBy employee
          for (const doneBy of doneBys) {
            if (!doneBy.employeeId) continue;
            const share = service.price * doneBy.percent;
            addProduction(result, groupId, doneBy.employeeId, effectiveDate, share);
          }
        } else {
          // No doneBys — attribute full price to an anonymous "team" key
          // so group-level totals remain accurate even without employee attribution
          addProduction(result, groupId, "_team", effectiveDate, service.price);
        }
      } else if (PRINTED_STATUSES.has(service.status)) {
        const mostRecent = service.assignments.mostRecent;
        if (!mostRecent?.schedDate || mostRecent.schedDate >= mainDate) continue;

        const employeeId = mostRecent.employeeId ?? "_team";
        addProduction(result, groupId, employeeId, mostRecent.schedDate, service.price);
      }
    }
  }

  return result;
}

function addProduction(
  result: Map<string, Map<string, Map<string, number>>>,
  groupId: string,
  employeeId: string,
  date: string,
  price: number,
): void {
  if (!result.has(groupId)) result.set(groupId, new Map());
  const byEmployee = result.get(groupId)!;

  if (!byEmployee.has(employeeId)) byEmployee.set(employeeId, new Map());
  const byDate = byEmployee.get(employeeId)!;

  byDate.set(date, (byDate.get(date) ?? 0) + price);
}
