import { AssignmentGroup } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";
import { PaceEngineInputs } from "@/app/pace/lib/PaceEngineInputs";
import { PastPhaseState } from "@/app/pace/lib/crawlPastPhase/crawlPastPhase";

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
 * The main job here is to validate the handoff state and return it unchanged.
 * If future phases need mainDate-specific adjustments, they belong here.
 */
export function crawlPresentPhase(
  _inputs: PaceEngineInputs,
  _assignmentGroups: AssignmentGroup[],
  pastState: PastPhaseState,
): PresentPhaseState {
  // The active pool already reflects mainDate reality:
  // - Completed services (doneDate <= mainDate) are excluded from the active pool.
  // - Printed services (schedDate === mainDate) are included — they are committed.
  // No additional adjustments needed at this boundary.
  return pastState;
}
