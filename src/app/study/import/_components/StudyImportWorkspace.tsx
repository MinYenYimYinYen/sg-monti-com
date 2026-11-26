"use client";

import { useState } from "react";
import { useStudyDecks, useStudyImport } from "@/app/study/useStudyImport";
import { DeckPanel } from "@/app/study/import/_components/DeckPanel";
import { ImportList } from "@/app/study/import/_components/ImportList";
import { RunPanel } from "@/app/study/import/_components/RunPanel";

/** Import a study PDF: choose a deck and a file, start the run, and see how every section went. */
export function StudyImportWorkspace() {
  useStudyDecks();
  const { loadImports } = useStudyImport();
  const [deckKey, setDeckKey] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  // Loaded when the admin picks a deck, not in an effect: nothing here needs to react to a render.
  function handleSelectDeck(selectedDeckKey: string) {
    setDeckKey(selectedDeckKey);
    loadImports(selectedDeckKey);
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 p-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Import study material</h1>
          <p className="text-sm text-muted-foreground">
            Cards made here are drafts. Nothing reaches a student until it is reviewed and published.
          </p>
        </div>
        <DeckPanel selectedDeckKey={deckKey} onSelectAction={handleSelectDeck} />
        <RunPanel deckKey={deckKey} file={file} onFileChangeAction={setFile} />
        {deckKey !== null && <ImportList deckKey={deckKey} file={file} />}
      </div>
    </div>
  );
}
