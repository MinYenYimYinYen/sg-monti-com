"use client";

import { useSelector } from "react-redux";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";

type ServCodePickerProps = {
  existingGroupServCodeIds: Set<string>;
  selectedIds: Set<string>;
  onToggle: (servCodeId: string) => void;
  onToggleProgCode: (servCodeIds: string[]) => void;
  disabled?: boolean;
};

/**
 * Multi-select servCode picker grouped by progCode.
 * Excludes servCodes already assigned to another group.
 * Reads progCodes and servCodeMap internally via useSelector.
 */
export function ServCodePicker({
  existingGroupServCodeIds,
  selectedIds,
  onToggle,
  onToggleProgCode,
  disabled = false,
}: ServCodePickerProps) {
  const progCodes = useSelector(progServSelect.progCodes);
  const servCodeMap = useSelector(progServSelect.servCodeMap);

  const availableProgCodes = progCodes
    .map((pc) => ({
      progCodeId: pc.progCodeId,
      availableServCodeIds: pc.servCodes
        .map((sc) => sc.servCodeId)
        .filter((id) => !existingGroupServCodeIds.has(id) && !servCodeMap.get(id)?.alwaysAsap),
    }))
    .filter((p) => p.availableServCodeIds.length > 0);

  if (availableProgCodes.length === 0 && selectedIds.size === 0) {
    return (
      <p className="text-[10px] text-muted-foreground">All servCodes already in a group.</p>
    );
  }

  return (
    <div className="max-h-48 overflow-y-auto space-y-2">
      {availableProgCodes.map(({ progCodeId, availableServCodeIds }) => {
        const allSelected = availableServCodeIds.every((id) => selectedIds.has(id));
        return (
          <div key={progCodeId} className="space-y-0.5">
            <label className="flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-accent/10 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                disabled={disabled}
                onChange={() => onToggleProgCode(availableServCodeIds)}
                className="accent-primary shrink-0"
              />
              <span className="font-mono text-[10px] font-semibold text-foreground">
                {progCodeId}
              </span>
            </label>
            <div className="pl-4 space-y-0.5">
              {availableServCodeIds.map((id) => (
                <label
                  key={id}
                  className="flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-accent/10 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(id)}
                    disabled={disabled}
                    onChange={() => onToggle(id)}
                    className="accent-primary shrink-0"
                  />
                  <span className="font-mono text-[10px] text-foreground">{id}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
