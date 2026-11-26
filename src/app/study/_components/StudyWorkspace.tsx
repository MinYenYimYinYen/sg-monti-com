"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Notice } from "@/app/permission/_components/Notice";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/style/components/select";
import { StudySession } from "@/app/study/_components/StudySession";
import { studyCardSelect } from "@/app/study/studyCardSelect";
import { useStudyDeckList } from "@/app/study/useStudy";

/** The student's screen: choose a deck, then study it one card at a time. */
export function StudyWorkspace() {
  useStudyDeckList();
  const deckSummaries = useSelector(studyCardSelect.deckSummaries);
  const [deckKey, setDeckKey] = useState<string | null>(null);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">Study</h1>
          <Select value={deckKey ?? ""} onValueChange={setDeckKey}>
            <SelectTrigger className="w-80">
              <SelectValue placeholder={deckSummaries.length === 0 ? "No decks yet" : "Choose a deck"} />
            </SelectTrigger>
            <SelectContent>
              {deckSummaries.map(({ deck, publishedCardCount }) => (
                <SelectItem key={deck.deckKey} value={deck.deckKey}>
                  {deck.title} ({publishedCardCount} cards)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {deckKey === null ? (
          <Notice>Choose a deck to start.</Notice>
        ) : (
          <StudySession key={deckKey} deckKey={deckKey} />
        )}
      </div>
    </div>
  );
}
