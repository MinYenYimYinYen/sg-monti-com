import {
  PaceEngineResult,
  GroupPoolState,
} from "@/app/pace/lib/PaceEngineTypes";
import { PaceEngineInputs } from "./PaceEngineInputs";
import {
  crawlPastPhase,
  PastPhaseState,
} from "./crawlPastPhase/crawlPastPhase";
import {
  crawlPresentPhase,
  PresentPhaseState,
} from "./crawlPresentPhase/crawlPresentPhase";
import {
  crawlFuturePhase,
  FuturePhaseState,
} from "./crawlFuturePhase/crawlFuturePhase";
import { assembleGroupResults } from "./assembleGroupResults/assembleGroupResults";
import { buildGroupSequenceClassifier } from "./groupSequenceClassifier";

/**
 * The pace engine entry point.
 *
 * A pure function — reads no Redux state directly.
 * Receives all data as a plain `PaceEngineInputs` object and returns `PaceEngineResult`.
 * Fully testable in isolation.
 *
 * Phases:
 *   1. crawlPastPhase      — walk days < mainDate; accumulate actual production history
 *   2. crawlPresentPhase   — handle mainDate handoff (printed = committed, done = done)
 *   3. crawlFuturePhase    — drain pools by goalDailyPrice; record projectedEndDate + timelines
 *   4. assembleGroupResults — combine past + present + future into PaceEngineResult
 *
 * AssignmentGroups are fully hydrated by the selector layer before reaching the engine —
 * they carry sequenceId, plannedStart/End, goalsByEmployee, and assignedEmployeeIds.
 * No separate "buildGroupContexts" phase is needed.
 */
export function runPaceEngine(inputs: PaceEngineInputs): PaceEngineResult {
  const { assignmentGroups } = inputs;
  const classifier = buildGroupSequenceClassifier(inputs.sequences);
  const pastState: PastPhaseState = crawlPastPhase(inputs, assignmentGroups);

  // Snapshot pool states before the future phase mutates them in-place.
  // crawlFuturePhase drains poolRemaining on the shared poolStates Map, so by the
  // time assembleGroupResults runs, pastState.poolStates reflects post-drain values.
  // The snapshot preserves the as-of-mainDate pool state for the present CrawlerDay.
  const presentPoolStatesSnapshot = new Map<string, GroupPoolState>(
    [...pastState.poolStates.entries()].map(([groupId, state]) => [
      groupId,
      { ...state },
    ]),
  );

  const presentState: PresentPhaseState = crawlPresentPhase(
    inputs,
    assignmentGroups,
    pastState,
  );
  const futureState: FuturePhaseState = crawlFuturePhase(
    inputs,
    assignmentGroups,
    presentState,
    classifier,
  );
  return assembleGroupResults(inputs, assignmentGroups, futureState, {
    ...pastState,
    poolStates: presentPoolStatesSnapshot,
  });
}
