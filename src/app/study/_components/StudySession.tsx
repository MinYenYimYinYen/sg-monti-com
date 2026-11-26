"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Notice } from "@/app/permission/_components/Notice";
import { StudyCardView } from "@/app/study/_components/StudyCardView";
import { STUDY_CONFIG } from "@/app/study/studyConst";
import { studyCardSelect } from "@/app/study/studyCardSelect";
import { buildSessionView, describeWait } from "@/app/study/studySessionLogic";
import { useNowMs } from "@/app/study/useNow";
import { useStudyDeck } from "@/app/study/useStudy";

const NO_CARDS: never[] = [];

/** Studying one deck. Mount it with a `key` of the deck so switching decks starts clean. */
export function StudySession({ deckKey }: { deckKey: string }) {
  const { submitReview } = useStudyDeck(deckKey);
  const cardsByDeckKey = useSelector(studyCardSelect.publishedCardsByDeckKey);
  const scheduleDocs = useSelector(studyCardSelect.scheduleDocs);
  const recentReviewLogs = useSelector(studyCardSelect.recentReviewLogs);
  const nowMs = useNowMs();
  const [isSaving, setIsSaving] = useState(false);

  const cards = cardsByDeckKey.get(deckKey) ?? NO_CARDS;
  // 0 on the server render and before the clock exists. Nothing is shown until there is a real time.
  if (nowMs === 0) return null;

  const now = new Date(nowMs);
  const schedules = scheduleDocs.filter((schedule) => schedule.deckKey === deckKey);
  const view = buildSessionView({
    cards,
    schedules,
    recentReviewLogs,
    now,
    config: STUDY_CONFIG.dailyLimits,
  });

  async function handleAnswer({ cardKey, outcome }: { cardKey: string; outcome: "knew" | "missed" }) {
    setIsSaving(true);
    try {
      await submitReview({ cardKey, outcome });
    } finally {
      setIsSaving(false);
    }
  }

  if (cards.length === 0) return <Notice>This deck has no cards to study yet.</Notice>;

  if (view.card === null) {
    return (
      <div className="flex flex-col gap-2">
        <Notice>
          You are done for now.
          {view.nextDueAt !== null ? ` The next card comes back ${describeWait({ dueAt: view.nextDueAt, now })}.` : ""}
          {view.queue.heldBack.newCards > 0 || view.queue.heldBack.reviews > 0
            ? " More are waiting, but today's limit is reached."
            : ""}
        </Notice>
      </div>
    );
  }

  const { card } = view;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {view.remaining} left today: {view.queue.learning.length} learning, {view.queue.reviews.length} to review,{" "}
        {view.queue.newCards.length} new.
      </p>
      <StudyCardView
        key={card.cardKey}
        card={card}
        isSaving={isSaving}
        onAnswerAction={(outcome) => void handleAnswer({ cardKey: card.cardKey, outcome })}
      />
    </div>
  );
}
