import { GroupContext, PaceEngineResult } from "@/app/pace/PaceEngineTypes";
import { PaceEngineInputs } from "./PaceEngineInputs";
import { buildGroupContexts } from "./buildGroupContexts/buildGroupContexts";
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
 *   0. buildGroupContexts  — resolve groups from AssignmentGroups + SeasonPlan + AssignmentPlan
 *   1. crawlPastPhase      — walk days < mainDate; accumulate actual production history
 *   2. crawlPresentPhase   — handle mainDate handoff (printed = committed, done = done)
 *   3. crawlFuturePhase    — drain pools by goalDailyPrice; record projectedEndDate + timelines
 *   4. assembleGroupResults — combine past + present + future into GroupResult[]
 */
export function runPaceEngine(inputs: PaceEngineInputs): PaceEngineResult {
  const groupContexts: GroupContext[] = buildGroupContexts(inputs);
  const classifier = buildGroupSequenceClassifier(inputs.sequences);
  const pastState: PastPhaseState = crawlPastPhase(inputs, groupContexts, classifier);
  const presentState: PresentPhaseState = crawlPresentPhase(
    inputs,
    groupContexts,
    pastState,
  );
  const futureState: FuturePhaseState = crawlFuturePhase(
    inputs,
    groupContexts,
    presentState,
    classifier,
  );
  return assembleGroupResults(inputs, groupContexts, futureState, pastState);
}
