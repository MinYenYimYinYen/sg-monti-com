import { AssignmentGroup } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";
import { PaceEngineInputs } from "@/app/pace/lib/PaceEngineInputs";
import { PastPhaseState } from "@/app/pace/lib/crawlPastPhase/crawlPastPhase";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";

const ACTIVE_STATUSES = new Set(getServiceStatuses(["active", "asap"]));

export type PresentPhaseState = PastPhaseState;

/**
 * Phase 2: Handle the mainDate handoff.
 *
 * The mainDate is the past/future split point. Services on mainDate are treated as:
 * - `doneDate === mainDate` (status "S"): already completed — already counted in past phase.
 * - `schedDate === mainDate` (status "$"): printed — committed and expected to complete today.
 *   These are already included in the active pool from the past phase (status "$" is actionable).
 *
 * The present phase is intentionally thin. The past phase already computed the active pool
 * as of mainDate (including printed services). The future phase starts draining from that pool.
 *
 * Credit-hold adjustment: services belonging to credit-hold customers are excluded from
 * the forward pool here. Past production history is preserved — only the remaining active
 * pool is reduced. This prevents the future phase from projecting work that won't happen.
 */
export function crawlPresentPhase(
  inputs: PaceEngineInputs,
  _assignmentGroups: AssignmentGroup[],
  pastState: PastPhaseState,
): PresentPhaseState {
  const { servCodes } = inputs;
  const { poolStates, servCodeToGroupId } = pastState;

  // Subtract active service prices for credit-hold customers from each group's poolRemaining.
  // This keeps past production intact while preventing the future phase from projecting
  // work that the team won't be doing (credit-hold customers are not scheduled).
  for (const servCode of servCodes) {
    const groupId = servCodeToGroupId.get(servCode.servCodeId);
    if (!groupId) continue;

    const poolState = poolStates.get(groupId);
    if (!poolState) continue;

    for (const service of servCode.services) {
      if (!ACTIVE_STATUSES.has(service.status) && service.status !== "$") continue;
      if (!service.program.customer.x.isCreditHold) continue;

      poolState.poolRemaining = Math.max(0, poolState.poolRemaining - service.price);
    }
  }

  return pastState;
}
