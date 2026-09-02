"use client";

import { useSelector } from "react-redux";
import { promiseSanitySelect } from "@/app/sanity/promiseSanity/promiseSanitySelect";
import { OrphanedNotesRow } from "@/app/sanity/promiseSanity/_components/OrphanedNotesRow";

export function OrphanedNotesList() {
  const orphanedNotes = useSelector(promiseSanitySelect.orphanedNotes);

  if (orphanedNotes.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No orphaned promise notes found.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {orphanedNotes.map((orphanedNote, index) => (
        <OrphanedNotesRow key={index} orphanedNote={orphanedNote} />
      ))}
    </div>
  );
}
