import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { validationError } from "@/app/study/_lib/studyCardServer";
import { CardScheduleModel, ReviewLogModel, StudyCardModel } from "@/app/study/StudyModels";
import type { MyReviews, SubmitReviewResult } from "@/app/study/StudyApiTypes";
import type { CardScheduleDoc, ReviewLogDoc, ReviewOutcome } from "@/app/study/StudyTypes";
import { STUDY_CONFIG } from "@/app/study/studyConst";
import { scheduleReview, type ScheduleState } from "@/app/study/studyScheduler";

// Server only; the caller has already connected to the database.

/** Days of log the study screen needs, to count today's limit across a time zone change. */
const RECENT_LOG_DAYS = 3;

export async function loadMyReviews({ userName, deckKey }: { userName: string; deckKey: string }): Promise<MyReviews> {
  const since = new Date(Date.now() - RECENT_LOG_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const [schedules, logs] = await Promise.all([
    CardScheduleModel.find({ userName, deckKey }).lean(),
    ReviewLogModel.find({ userName, deckKey, reviewedAt: { $gte: since } })
      .select({ cardKey: 1, reviewedAt: 1, phaseBefore: 1 })
      .lean(),
  ]);
  return {
    schedules: cleanMongoArray(schedules) as CardScheduleDoc[],
    recentReviewLogs: logs.map(({ cardKey, reviewedAt, phaseBefore }) => ({ cardKey, reviewedAt, phaseBefore })),
  };
}

function toState(schedule: CardScheduleDoc | null): ScheduleState | null {
  if (schedule === null) return null;
  const { phase, stepIndex, dueAt, intervalDays, easeFactor, repetitions, lapses, lastReviewedAt } = schedule;
  return { phase, stepIndex, dueAt, intervalDays, easeFactor, repetitions, lapses, lastReviewedAt };
}

/**
 * Records one answer. The card must be published, so a card taken back to a draft cannot collect
 * reviews. The schedule is read, advanced by the pure scheduler, and written back; the log row is
 * appended afterwards. Two answers to the same card in one instant are not expected from one person.
 */
export async function submitReview({
  userName,
  cardKey,
  outcome,
  now,
}: {
  userName: string;
  cardKey: string;
  outcome: ReviewOutcome;
  now: Date;
}): Promise<SubmitReviewResult> {
  const card = await StudyCardModel.findOne({ cardKey, status: "published" }).lean();
  if (!card) throw validationError("That card is not available for study.");

  const current = (await CardScheduleModel.findOne({ userName, cardKey }).lean()) as CardScheduleDoc | null;
  const next = scheduleReview({ schedule: toState(current), outcome, now, config: STUDY_CONFIG.scheduling });

  const scheduleDoc = await CardScheduleModel.findOneAndUpdate(
    { userName, cardKey },
    { $set: { ...next, deckKey: card.deckKey } },
    { upsert: true, new: true },
  ).lean();

  const reviewLog: ReviewLogDoc = {
    userName,
    cardKey,
    deckKey: card.deckKey,
    reviewedAt: now.toISOString(),
    outcome,
    phaseBefore: current === null ? "new" : current.phase,
    intervalDaysBefore: current?.intervalDays ?? 0,
    intervalDaysAfter: next.intervalDays,
  };
  await ReviewLogModel.create(reviewLog);

  return { schedule: cleanMongoObject(scheduleDoc!) as CardScheduleDoc, reviewLog };
}
