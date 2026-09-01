"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { programSanitySelect, ProgCodeSummary } from "@/app/sanity/programSanity/programSanitySelect";
import { sanityActions } from "@/app/sanity/sanitySlice";
import { cn } from "@/style/utils";

function ProgCodeBadge({
  summary,
  isSelected,
  onSelect,
}: {
  summary: ProgCodeSummary;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
}) {
  return (
    <button
      onClick={() => onSelect(isSelected ? null : summary.progCodeId)}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        isSelected
          ? "border-primary bg-primary/20 text-primary"
          : "border-border bg-card text-foreground hover:bg-accent/10",
      )}
    >
      {summary.label}
    </button>
  );
}

export function ProgCodePicker() {
  const dispatch = useAppDispatch();
  const summaries = useSelector(programSanitySelect.progCodeSummaries);
  const selectedId = useSelector(programSanitySelect.selectedProgCodeId);

  const handleSelect = (id: string | null) => {
    dispatch(sanityActions.setSelectedProgCodeId(id));
  };

  if (summaries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        No programs loaded yet.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {summaries.map((summary) => (
        <ProgCodeBadge
          key={summary.progCodeId}
          summary={summary}
          isSelected={selectedId === summary.progCodeId}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}
