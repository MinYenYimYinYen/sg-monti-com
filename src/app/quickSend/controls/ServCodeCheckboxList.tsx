"use client";

import type { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";

type Props = {
  servCodes: ServCode[];
  selected: string[];
  onChange: (servCodeIds: string[]) => void;
};

export function ServCodeCheckboxList({ servCodes, selected, onChange }: Props) {
  const selectedSet = new Set(selected);

  const handleToggle = (servCodeId: string) => {
    const updated = selectedSet.has(servCodeId)
      ? selected.filter((id) => id !== servCodeId)
      : [...selected, servCodeId];
    onChange(updated);
  };

  return (
    <div className="flex flex-col gap-1">
      {servCodes.map((servCode) => {
        const checked = selectedSet.has(servCode.servCodeId);
        return (
          <label
            key={servCode.servCodeId}
            className="flex items-center gap-2 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => handleToggle(servCode.servCodeId)}
              className="h-3.5 w-3.5 rounded border-border accent-primary"
            />
            <span className="text-xs text-foreground">{servCode.servCodeId}</span>
            {servCode.longName && (
              <span className="text-xs text-muted-foreground truncate">
                {servCode.longName}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}
