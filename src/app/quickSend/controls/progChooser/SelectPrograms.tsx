"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelectors";
import { progChooserSelect } from "./progChooserSelect";
import { useProgChooser } from "./useProgChooser";

export function SelectPrograms() {
  const [open, setOpen] = useState(true);
  const progCodes = useSelector(progServSelect.progCodes);
  const selectedProgCodeIds = useSelector(progChooserSelect.selectedProgCodeIds);
  const { toggleProgCode } = useProgChooser();

  const selectedSet = new Set(selectedProgCodeIds);

  const handleToggle = (progCodeId: string) => {
    const progCode = progCodes.find((p) => p.progCodeId === progCodeId);
    const defaultServCodeIds = progCode
      ? progCode.servCodes.filter((s) => !s.isServiceCall).map((s) => s.servCodeId)
      : [];
    toggleProgCode({ progCodeId, defaultServCodeIds });
  };

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent/10"
      >
        <span>Select Programs</span>
        <span className="text-muted-foreground">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-1 px-4 pb-3">
          {progCodes.map((progCode) => {
            const checked = selectedSet.has(progCode.progCodeId);
            return (
              <label
                key={progCode.progCodeId}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleToggle(progCode.progCodeId)}
                  className="h-3.5 w-3.5 rounded border-border accent-primary"
                />
                <span className="text-xs font-medium text-foreground">
                  {progCode.progCodeId}
                </span>
                {progCode.description && (
                  <span className="text-xs text-muted-foreground truncate">
                    {progCode.description}
                  </span>
                )}
              </label>
            );
          })}
          {progCodes.length === 0 && (
            <span className="text-xs text-muted-foreground">No programs available</span>
          )}
        </div>
      )}
    </div>
  );
}
