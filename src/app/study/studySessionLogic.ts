import type { CardScheduleDoc, StudyCardDoc } from "@/app/study/StudyTypes";
import type { StudyConfig } from "@/app/study/studyConst";
import {
  buildStudyQueue,
  countToday,
  dayKeyOf,
  findNextDueAt,
  pickNextCard,
  type StudyQueue,
} from "@/app/study/studyQueueLogic";

// One call that turns what is in the store into what the study screen shows. Pure: `now` is passed in.

export type StudySessionView = {
  card: StudyCardDoc | null;
  queue: StudyQueue;
  /** Cards left to answer in this sitting, counting the one on screen. */
  remaining: number;
  /** When a card now waiting on a short step comes due, for "come back in a few minutes". */
  nextDueAt: string | null;
};

export function buildSessionView({
  cards,
  schedules,
  recentReviewLogs,
  now,
  config,
}: {
  cards: StudyCardDoc[];
  schedules: CardScheduleDoc[];
  recentReviewLogs: { reviewedAt: string; phaseBefore: string }[];
  now: Date;
  config: StudyConfig["dailyLimits"];
}): StudySessionView {
  const today = countToday({
    reviewLogs: recentReviewLogs,
    todayKey: dayKeyOf({ instant: now, timeZone: config.timeZone }),
    timeZone: config.timeZone,
  });
  const queue = buildStudyQueue({ cards, schedules, today, now, config });
  return {
    card: pickNextCard(queue),
    queue,
    remaining: queue.learning.length + queue.reviews.length + queue.newCards.length,
    nextDueAt: findNextDueAt({ cards, schedules, now }),
  };
}

/** "in 8 minutes", "in about 2 hours", "tomorrow": how long until a card comes back. */
export function describeWait({ dueAt, now }: { dueAt: string; now: Date }): string {
  const minutes = Math.max(1, Math.round((new Date(dueAt).getTime() - now.getTime()) / 60_000));
  if (minutes < 60) return `in ${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in about ${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.round(hours / 24);
  return days === 1 ? "tomorrow" : `in ${days} days`;
}
