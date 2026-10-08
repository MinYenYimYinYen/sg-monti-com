import { CrawlService } from "./buildCrawlServiceQueues";

// ---------------------------------------------------------------------------
// fillEmployeesRoundRobin
// ---------------------------------------------------------------------------

/**
 * Distributes available services across employees using round-robin assignment.
 *
 * Each round, one service is offered to each employee in order. An employee
 * accepts a service if it fits within their remaining budget (binary-split
 * search for the largest service ≤ budget). If no service fits but the employee
 * still has budget and services remain, the first service (largest) is assigned
 * as an overfill — that employee is then closed for the day.
 *
 * Rounds continue until `available` is empty or all employees are closed.
 *
 * Mutates `available` in place (splices out consumed services).
 *
 * @param available - Services ready to work, sorted price descending. Mutated.
 * @param employees - Ordered list of employees with their daily goal budgets.
 * @returns Per-employee drain amounts and the list of consumed services (for doneDate tracking).
 */
export function fillEmployeesRoundRobin({
  available,
  employees,
}: {
  available: CrawlService[];
  employees: { employeeId: string; budget: number }[];
}): { drained: Map<string, number>; consumed: CrawlService[] } {
  const drained = new Map<string, number>();
  for (const emp of employees) {
    drained.set(emp.employeeId, 0);
  }

  const consumed: CrawlService[] = [];

  // Track remaining budget per employee. Closed employees are removed from active list.
  const remaining = employees.map((emp) => ({ employeeId: emp.employeeId, budget: emp.budget }));

  while (available.length > 0 && remaining.length > 0) {
    let anyAssigned = false;

    // One pass through all active employees (one service per employee per round)
    let i = 0;
    while (i < remaining.length && available.length > 0) {
      const emp = remaining[i]!;

      // Close employees whose budget is already exhausted
      if (emp.budget <= 0) {
        remaining.splice(i, 1);
        // Don't increment i — next employee slides into position i
        continue;
      }

      // Binary search for the largest service that fits within remaining budget
      const idx = findLargestFitting(available, emp.budget);

      if (idx !== -1) {
        // Found a service that fits — assign it
        const service = available.splice(idx, 1)[0]!;
        emp.budget -= service.price;
        drained.set(emp.employeeId, (drained.get(emp.employeeId) ?? 0) + service.price);
        consumed.push(service);
        anyAssigned = true;
        i++;
      } else {
        // No service fits within budget — overfill with the first (largest) service.
        // This handles the case where every service exceeds this employee's goal.
        const service = available.splice(0, 1)[0]!;
        drained.set(emp.employeeId, (drained.get(emp.employeeId) ?? 0) + service.price);
        consumed.push(service);
        // Close this employee — they're over capacity for the day
        remaining.splice(i, 1);
        anyAssigned = true;
        // Don't increment i — next employee slides into position i
      }
    }

    // Safety: if a full round produced no assignments, break to avoid infinite loop
    if (!anyAssigned) break;
  }

  return { drained, consumed };
}

// ---------------------------------------------------------------------------
// findLargestFitting — binary search on price-descending sorted array
// ---------------------------------------------------------------------------

/**
 * Finds the index of the largest service whose price fits within `budget`.
 *
 * The array is sorted price descending, so we binary-search for the first
 * entry where `price <= budget`. Returns -1 if no service fits.
 *
 * This is O(log n) per call — much faster than a linear scan when prices
 * vary widely and the array is large.
 */
function findLargestFitting(services: CrawlService[], budget: number): number {
  if (services.length === 0 || budget <= 0) return -1;

  // If the smallest service (last element) doesn't fit, nothing fits
  if (services[services.length - 1]!.price > budget) return -1;

  // If the largest service (first element) fits, return it immediately
  if (services[0]!.price <= budget) return 0;

  // Binary search: find the leftmost index where price <= budget
  let lo = 0;
  let hi = services.length - 1;
  let result = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (services[mid]!.price <= budget) {
      result = mid;
      hi = mid - 1; // Try to find an earlier (larger) fitting service
    } else {
      lo = mid + 1;
    }
  }

  return result;
}
