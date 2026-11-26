import type { CardScheduleDoc, StudyCardDoc } from "@/app/study/StudyTypes";
import type { StudyConfig } from "@/app/study/studyConst";
import { isDue } from "@/app/study/studyScheduler";

// Which cards a student sees next. Pure: callers pass `now` and the data.

/** The calendar day of an instant in the business's time zone, as YYYY-MM-DD. */
export function dayKeyOf({ instant, timeZone }: { instant: Date; timeZone: string }): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** What a student has already done today, from the review log. Reviews of a card that is new count once. */
export type TodayCounts = { newCards: number; reviews: number };

export type StudyQueue = {
  /** Cards in learning or relearning whose step has come due. Always shown, never limited: a card mid-step is already started. */
  learning: StudyCardDoc[];
  /** Graduated cards that are due, oldest due first, up to what is left of today's review limit. */
  reviews: StudyCardDoc[];
  /** Cards never seen, in reading order, up to what is left of today's new limit. */
  newCards: StudyCardDoc[];
  /** What the limits held back, so the screen can say so instead of seeming to run dry. */
  heldBack: { reviews: number; newCards: number };
};

function byDueAt(schedulesByCardKey: Map<string, CardScheduleDoc>) {
  return (a: StudyCardDoc, b: StudyCardDoc) => {
    const aDue = schedulesByCardKey.get(a.cardKey)?.dueAt ?? "";
    const bDue = schedulesByCardKey.get(b.cardKey)?.dueAt ?? "";
    return aDue.localeCompare(bDue);
  };
}

/**
 * Splits the deck's published cards into what to study now. Learning cards come first and are never
 * cut by a limit. Reviews and new cards each get what is left of today's allowance, so a student who
 * studied this morning is not handed a full set again in the afternoon.
 */
export function buildStudyQueue({
  cards,
  schedules,
  today,
  now,
  config,
}: {
  cards: StudyCardDoc[];
  schedules: CardScheduleDoc[];
  today: TodayCounts;
  now: Date;
  config: StudyConfig["dailyLimits"];
}): StudyQueue {
  const schedulesByCardKey = new Map(schedules.map((schedule) => [schedule.cardKey, schedule]));
  const published = cards.filter((card) => card.status === "published");

  const learning: StudyCardDoc[] = [];
  const dueReviews: StudyCardDoc[] = [];
  const unseen: StudyCardDoc[] = [];

  for (const card of published) {
    const schedule = schedulesByCardKey.get(card.cardKey) ?? null;
    if (schedule === null) unseen.push(card);
    else if (!isDue({ schedule, now })) continue;
    else if (schedule.phase === "review") dueReviews.push(card);
    else learning.push(card);
  }

  const reviewsLeft = Math.max(0, config.reviewsPerDay - today.reviews);
  const newLeft = Math.max(0, config.newCardsPerDay - today.newCards);
  const sortedReviews = dueReviews.sort(byDueAt(schedulesByCardKey));
  const sortedNew = unseen.sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    learning: learning.sort(byDueAt(schedulesByCardKey)),
    reviews: sortedReviews.slice(0, reviewsLeft),
    newCards: sortedNew.slice(0, newLeft),
    heldBack: {
      reviews: Math.max(0, sortedReviews.length - reviewsLeft),
      newCards: Math.max(0, sortedNew.length - newLeft),
    },
  };
}

/**
 * The next card to show: learning first (their step is minutes, so waiting loses the benefit), then
 * reviews, then new cards. Null when nothing is left for today.
 */
export function pickNextCard(queue: StudyQueue): StudyCardDoc | null {
  return queue.learning[0] ?? queue.reviews[0] ?? queue.newCards[0] ?? null;
}

/**
 * When the next learning card will come due, for "come back in a few minutes". Null when none is
 * waiting. A card that is already due is part of the queue, so only later ones are considered.
 */
export function findNextDueAt({
  cards,
  schedules,
  now,
}: {
  cards: StudyCardDoc[];
  schedules: CardScheduleDoc[];
  now: Date;
}): string | null {
  const publishedKeys = new Set(cards.filter((card) => card.status === "published").map((card) => card.cardKey));
  const later = schedules
    .filter((schedule) => publishedKeys.has(schedule.cardKey) && !isDue({ schedule, now }))
    .map((schedule) => schedule.dueAt)
    .sort();
  return later[0] ?? null;
}

/** Counts today's work from the log. A review of a card first seen today is a new card, not a review. */
export function countToday({
  reviewLogs,
  todayKey,
  timeZone,
}: {
  reviewLogs: { reviewedAt: string; phaseBefore: string }[];
  todayKey: string;
  timeZone: string;
}): TodayCounts {
  const counts: TodayCounts = { newCards: 0, reviews: 0 };
  for (const log of reviewLogs) {
    if (dayKeyOf({ instant: new Date(log.reviewedAt), timeZone }) !== todayKey) continue;
    if (log.phaseBefore === "new") counts.newCards += 1;
    else if (log.phaseBefore === "review") counts.reviews += 1;
  }
  return counts;
}
