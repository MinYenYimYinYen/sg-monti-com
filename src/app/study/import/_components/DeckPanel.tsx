"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/style/components/select";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { can } from "@/permission/can";
import { STUDY_CONFIG } from "@/app/study/studyConst";
import { studySelect } from "@/app/study/studySelect";
import { useStudyImport } from "@/app/study/useStudyImport";

/** Picks the deck an import goes into, or makes a new one. */
export function DeckPanel({
  selectedDeckKey,
  onSelectAction,
}: {
  selectedDeckKey: string | null;
  onSelectAction: (deckKey: string) => void;
}) {
  const { createDeck } = useStudyImport();
  const decks = useSelector(studySelect.decks);
  const allows = useSelector(userCapabilitiesSelect.allows);
  const canWrite = allows(can.studyCardAdmin.write);
  const [title, setTitle] = useState("");
  const [examName, setExamName] = useState("");
  const maxChars = STUDY_CONFIG.limits.deckTitleMaxChars;

  const canCreate = canWrite && title.trim() !== "" && examName.trim() !== "";

  function handleCreate() {
    createDeck({ title: title.trim(), examName: examName.trim() });
    setTitle("");
    setExamName("");
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border bg-card p-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="study-deck">Deck</Label>
        <Select value={selectedDeckKey ?? ""} onValueChange={onSelectAction}>
          <SelectTrigger id="study-deck" className="w-full max-w-md">
            <SelectValue placeholder={decks.length === 0 ? "No decks yet. Make one below." : "Choose a deck"} />
          </SelectTrigger>
          <SelectContent>
            {decks.map((deck) => (
              <SelectItem key={deck.deckKey} value={deck.deckKey}>
                {deck.title} ({deck.examName})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="study-deck-title">New deck title</Label>
          <Input
            id="study-deck-title"
            className="w-64"
            value={title}
            maxLength={maxChars}
            placeholder="Category A core"
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="study-deck-exam">Exam</Label>
          <Input
            id="study-deck-exam"
            className="w-64"
            value={examName}
            maxLength={maxChars}
            placeholder="Pesticide applicator, Category A"
            onChange={(event) => setExamName(event.target.value)}
          />
        </div>
        <Button variant="primary" intensity="soft" disabled={!canCreate} onClick={handleCreate}>
          Create deck
        </Button>
      </div>
    </div>
  );
}
