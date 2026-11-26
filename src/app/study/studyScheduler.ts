import type { CardScheduleDoc, ReviewOutcome, SchedulePhase } from "@/app/study/StudyTypes";
import type { StudyConfig } from "@/app/study/studyConst";

// A two-button take on Anki's SM-2 flow. A new card moves through learning steps (minutes), graduates
// to a review interval (days) that grows by the ease factor each time the learner knew it, and drops
// into relearning steps when it is missed. Pure: no clock, no store. The caller passes `now`.

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

/** What changes on every answer. The identity fields (`userName`, `cardKey`, `deckKey`) and timestamps stay with the caller. */
export type ScheduleState = Pick<
  CardScheduleDoc,
  "phase" | "stepIndex" | "dueAt" | "intervalDays" | "easeFactor" | "repetitions" | "lapses" | "lastReviewedAt"
>;

type SchedulingConfig = StudyConfig["scheduling"];

/** A card nobody has answered yet, as the scheduler sees it. */
function buildNewState({ now, config }: { now: Date; config: SchedulingConfig }): ScheduleState {
  return {
    phase: "learning",
    stepIndex: 0,
    dueAt: now.toISOString(),
    intervalDays: 0,
    easeFactor: config.startingEase,
    repetitions: 0,
    lapses: 0,
    lastReviewedAt: now.toISOString(),
  };
}

function roundEase(ease: number): number {
  return Math.round(ease * 100) / 100;
}

function addMinutes({ from, minutes }: { from: Date; minutes: number }): string {
  return new Date(from.getTime() + minutes * MS_PER_MINUTE).toISOString();
}

/**
 * With an exam date set, no card is due later than a few days before it, so every card comes up once
 * more before the test. A card is never pushed earlier than the minimum interval from now, or one
 * answered after the cutoff would be due again immediately.
 */
export function capDueAtForExam({
  dueAt,
  now,
  config,
}: {
  dueAt: Date;
  now: Date;
  config: SchedulingConfig;
}): Date {
  if (config.examDate === null) return dueAt;
  const examMs = new Date(config.examDate).getTime();
  if (Number.isNaN(examMs)) return dueAt;
  const latestMs = examMs - config.examBufferDays * MS_PER_DAY;
  const earliestMs = now.getTime() + config.minimumIntervalDays * MS_PER_DAY;
  return new Date(Math.min(dueAt.getTime(), Math.max(latestMs, earliestMs)));
}

function clampIntervalDays({ days, config }: { days: number; config: SchedulingConfig }): number {
  return Math.min(config.maximumIntervalDays, Math.max(config.minimumIntervalDays, Math.round(days)));
}

function buildReviewDue({
  intervalDays,
  now,
  config,
}: {
  intervalDays: number;
  now: Date;
  config: SchedulingConfig;
}): string {
  const dueAt = new Date(now.getTime() + intervalDays * MS_PER_DAY);
  return capDueAtForExam({ dueAt, now, config }).toISOString();
}

function getSteps({ phase, config }: { phase: SchedulePhase; config: SchedulingConfig }): readonly number[] {
  return phase === "relearning" ? config.relearningStepsMinutes : config.learningStepsMinutes;
}

/** Moves a learning or relearning card forward one step, or graduates it when the steps run out. */
function advanceStep({
  state,
  now,
  config,
}: {
  state: ScheduleState;
  now: Date;
  config: SchedulingConfig;
}): ScheduleState {
  const steps = getSteps({ phase: state.phase, config });
  const nextStepIndex = state.stepIndex + 1;
  if (nextStepIndex < steps.length) {
    return { ...state, stepIndex: nextStepIndex, dueAt: addMinutes({ from: now, minutes: steps[nextStepIndex] }) };
  }

  // A lapsed card keeps the interval it was left with. A new card starts at the graduating interval.
  const intervalDays = clampIntervalDays({
    days: state.phase === "relearning" ? state.intervalDays : config.graduatingIntervalDays,
    config,
  });
  return {
    ...state,
    phase: "review",
    stepIndex: 0,
    intervalDays,
    repetitions: state.repetitions + 1,
    dueAt: buildReviewDue({ intervalDays, now, config }),
  };
}

/** Sends a card back to the first of its learning or relearning steps. With no steps it graduates at once. */
function restartSteps({
  state,
  phase,
  now,
  config,
}: {
  state: ScheduleState;
  phase: SchedulePhase;
  now: Date;
  config: SchedulingConfig;
}): ScheduleState {
  const steps = getSteps({ phase, config });
  // Index -1 so that advancing lands on the first step, or graduates when there are none.
  if (steps.length === 0) return advanceStep({ state: { ...state, phase, stepIndex: -1 }, now, config });
  return { ...state, phase, stepIndex: 0, dueAt: addMinutes({ from: now, minutes: steps[0] }) };
}

function answerReviewCard({
  state,
  outcome,
  now,
  config,
}: {
  state: ScheduleState;
  outcome: ReviewOutcome;
  now: Date;
  config: SchedulingConfig;
}): ScheduleState {
  if (outcome === "knew") {
    const easeFactor = roundEase(Math.max(config.minimumEase, state.easeFactor + config.easeChangeOnKnew));
    const intervalDays = clampIntervalDays({ days: state.intervalDays * easeFactor, config });
    return {
      ...state,
      easeFactor,
      intervalDays,
      repetitions: state.repetitions + 1,
      dueAt: buildReviewDue({ intervalDays, now, config }),
    };
  }

  const lapsed: ScheduleState = {
    ...state,
    easeFactor: roundEase(Math.max(config.minimumEase, state.easeFactor - config.easeLossOnMiss)),
    // Can be zero (the default restarts the card). Graduating from relearning clamps it up to the minimum.
    intervalDays: Math.round(state.intervalDays * config.lapseIntervalMultiplier),
    repetitions: 0,
    lapses: state.lapses + 1,
  };
  return restartSteps({ state: lapsed, phase: "relearning", now, config });
}

/**
 * The card's new state after one answer. Pass `null` for a card the user has never seen.
 * "Knew it" advances the card; "missed" sends it back to the start of its steps (a review card also
 * loses ease and counts a lapse).
 */
export function scheduleReview({
  schedule,
  outcome,
  now,
  config,
}: {
  schedule: ScheduleState | null;
  outcome: ReviewOutcome;
  now: Date;
  config: SchedulingConfig;
}): ScheduleState {
  const current = schedule ?? buildNewState({ now, config });
  const answered: ScheduleState = { ...current, lastReviewedAt: now.toISOString() };

  if (answered.phase === "review") return answerReviewCard({ state: answered, outcome, now, config });
  if (outcome === "knew") return advanceStep({ state: answered, now, config });
  return restartSteps({ state: answered, phase: answered.phase, now, config });
}

/** A card with no schedule is new, and a new card is always available. */
export function isDue({ schedule, now }: { schedule: Pick<CardScheduleDoc, "dueAt"> | null; now: Date }): boolean {
  if (schedule === null) return true;
  return new Date(schedule.dueAt).getTime() <= now.getTime();
}
