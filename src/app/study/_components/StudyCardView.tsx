"use client";

import { useState } from "react";
import { Button } from "@/style/components/button";
import { AnswerView } from "@/app/study/_components/AnswerView";
import { CardFigure } from "@/app/study/_components/CardFigure";
import type { StudyCardDoc } from "@/app/study/StudyTypes";

/**
 * One card: the front, then "Show answer", then the two buttons. The parent gives it a `key` of the
 * card, so each new card starts with its answer hidden and no effect has to reset anything.
 * `isSaving` keeps the buttons off until the answer is saved, so a double click cannot count twice.
 */
export function StudyCardView({
  card,
  isSaving,
  onAnswerAction,
}: {
  card: StudyCardDoc;
  isSaving: boolean;
  onAnswerAction: (outcome: "knew" | "missed") => void;
}) {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-3">
        <p className="text-xl font-semibold text-foreground">{card.prompt}</p>
        {/* A picture card shows its picture on the front: recognizing it is the question. */}
        {card.kind === "image" && card.imageKey !== null && (
          <CardFigure key={card.imageKey} imageKey={card.imageKey} audience="student" />
        )}
      </div>

      {isRevealed ? (
        <div className="flex flex-col gap-4 border-t border-border pt-4">
          <AnswerView answer={card.answer} />
          {card.note !== null && <p className="text-sm text-muted-foreground">{card.note}</p>}
          <div className="flex flex-wrap gap-3">
            <Button variant="destructive" intensity="soft" size="lg" disabled={isSaving} onClick={() => onAnswerAction("missed")}>
              I didn&apos;t
            </Button>
            <Button variant="primary" size="lg" disabled={isSaving} onClick={() => onAnswerAction("knew")}>
              I knew it
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button variant="primary" intensity="soft" size="lg" onClick={() => setIsRevealed(true)}>
            Show answer
          </Button>
        </div>
      )}
    </div>
  );
}
