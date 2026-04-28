"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { progChooserSelect } from "./progChooserSelect";
import { ProgChooserProgRow } from "./ProgChooserProgRow";

export function ConfigurePrograms() {
  const [open, setOpen] = useState(true);
  const selectedProgCodeIds = useSelector(progChooserSelect.selectedProgCodeIds);

  if (selectedProgCodeIds.length === 0) return null;

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent/10"
      >
        <span>Configure Selected</span>
        <span className="text-muted-foreground">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="flex flex-col">
          {selectedProgCodeIds.map((progCodeId) => (
            <ProgChooserProgRow key={progCodeId} progCodeId={progCodeId} />
          ))}
        </div>
      )}
    </div>
  );
}
