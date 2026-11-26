"use client";

import { useState } from "react";
import { Button } from "@/style/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/style/components/dialog";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { AnswerField } from "@/app/study/review/_components/AnswerField";
import type { CardAnswerFormat, StudyCardDoc } from "@/app/study/StudyTypes";
import { STUDY_CONFIG } from "@/app/study/studyConst";
import { answerToText, textToAnswer } from "@/app/study/studyAnswerText";
import { useStudyCards } from "@/app/study/useStudyCards";

/**
 * Edits one card. The parent gives it a `key` of the card, so opening another card starts fresh and
 * no effect has to copy props into state. The answer is edited as plain text, turned into the stored
 * shape on save, and the server checks it again.
 */
export function EditCardDialog({ card, onCloseAction }: { card: StudyCardDoc; onCloseAction: () => void }) {
  const { editCard } = useStudyCards();
  const { limits } = STUDY_CONFIG;
  const [prompt, setPrompt] = useState(card.prompt);
  const [format, setFormat] = useState<CardAnswerFormat>(card.answer.format);
  const [answerText, setAnswerText] = useState(answerToText(card.answer));
  const [note, setNote] = useState(card.note ?? "");
  const [tagsText, setTagsText] = useState(card.tags.join(", "));
  const [imageHint, setImageHint] = useState(card.imageHint ?? "");
  const [problem, setProblem] = useState<string | null>(null);

  const isImageCard = card.kind === "image";

  function handleSave() {
    const parsed = textToAnswer({ text: answerText, format });
    if (!parsed.ok) {
      setProblem(parsed.message);
      return;
    }
    if (prompt.trim() === "") {
      setProblem("The front of the card cannot be empty.");
      return;
    }
    if (isImageCard && imageHint.trim() === "") {
      setProblem("Say what to look for, so the picture can be found.");
      return;
    }
    const tags = tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== "");
    editCard({
      cardKey: card.cardKey,
      edit: {
        prompt: prompt.trim(),
        answer: parsed.answer,
        note: note.trim() === "" ? null : note.trim(),
        tags,
        imageHint: isImageCard ? imageHint.trim() : null,
      },
    });
    onCloseAction();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCloseAction()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit card</DialogTitle>
          <DialogDescription>
            {card.sourcePage !== null ? `From page ${card.sourcePage}. ` : ""}
            A published card must be taken back to a draft before it can be edited.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="card-prompt">Front</Label>
            <Input
              id="card-prompt"
              value={prompt}
              maxLength={limits.promptMaxChars}
              onChange={(event) => setPrompt(event.target.value)}
            />
          </div>

          <AnswerField
            format={format}
            text={answerText}
            onFormatChangeAction={setFormat}
            onTextChangeAction={setAnswerText}
          />

          {isImageCard && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="card-hint">What to look for</Label>
              <Input
                id="card-hint"
                value={imageHint}
                maxLength={limits.imageHintMaxChars}
                onChange={(event) => setImageHint(event.target.value)}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="card-note">Note (optional)</Label>
            <Input
              id="card-note"
              value={note}
              maxLength={limits.noteMaxChars}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="card-tags">Tags (optional, separated by commas)</Label>
            <Input id="card-tags" value={tagsText} onChange={(event) => setTagsText(event.target.value)} />
          </div>

          {card.sourceQuote !== null && (
            <p className="rounded-md border border-border bg-accent/10 p-2 text-xs text-muted-foreground">
              Source, page {card.sourcePage}: {card.sourceQuote}
            </p>
          )}
          {problem !== null && <p className="text-sm text-destructive">{problem}</p>}
        </div>

        <DialogFooter>
          <Button variant="primary" intensity="ghost" onClick={onCloseAction}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
