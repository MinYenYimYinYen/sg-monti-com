"use client";

import { Badge } from "@/style/components/badge";
import { Checkbox } from "@/style/components/checkbox";
import { CardFigure } from "@/app/study/_components/CardFigure";
import type { StudyCardDoc } from "@/app/study/StudyTypes";
import { answerToText, summarizeAnswer } from "@/app/study/studyAnswerText";

/** One card in a review list: a checkbox, what it asks and answers, where it came from, and its picture. */
export function CardRow({
  card,
  isSelected,
  isActive,
  onToggleAction,
  actions,
}: {
  card: StudyCardDoc;
  isSelected: boolean;
  /** Highlights the card a paste will go to. */
  isActive?: boolean;
  onToggleAction: (cardKey: string) => void;
  actions?: React.ReactNode;
}) {
  return (
    <li
      className={`flex gap-3 rounded-md border bg-card p-3 ${isActive ? "border-primary ring-1 ring-primary" : "border-border"}`}
    >
      <Checkbox
        className="mt-1"
        checked={isSelected}
        onCheckedChange={() => onToggleAction(card.cardKey)}
        aria-label={`Select ${card.prompt}`}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">{card.prompt}</span>
          {card.kind === "image" && <Badge variant="secondary" intensity="soft">Picture</Badge>}
          {card.sourcePage !== null && <span className="text-xs text-muted-foreground">page {card.sourcePage}</span>}
        </div>
        <p className="whitespace-pre-line text-sm text-foreground" title={answerToText(card.answer)}>
          {card.answer.format === "text" ? card.answer.text : summarizeAnswer(card.answer)}
        </p>
        {card.imageHint !== null && card.imageKey === null && (
          <p className="text-sm text-muted-foreground">Look for: {card.imageHint}</p>
        )}
        {card.note !== null && <p className="text-xs text-muted-foreground">Note: {card.note}</p>}
        {card.sourceQuote !== null && (
          <p className="text-xs italic text-muted-foreground">&ldquo;{card.sourceQuote}&rdquo;</p>
        )}
        {card.imageKey !== null && (
          <CardFigure
            key={card.imageKey}
            imageKey={card.imageKey}
            audience="admin"
            className="mt-1 max-h-40 max-w-xs rounded-md border border-border"
          />
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-col items-end gap-1">{actions}</div>}
    </li>
  );
}
