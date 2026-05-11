"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { flagSelect } from "@/app/realGreen/flag/_selectors/flagSelect";
import { custFlagSelect } from "@/app/realGreen/custFlag/_lib/custFlagSelect";
import { custFlagActions, persistFlagIds } from "@/app/realGreen/custFlag/_lib/custFlagSlice";
import { Checkbox } from "@/style/components/checkbox";
import { Label } from "@/style/components/label";
import { ScrollArea } from "@/style/components/scroll-area";

export function FlagFilterSection() {
  const dispatch = useAppDispatch();
  const flagDocs = useSelector(flagSelect.flagDocs);
  const selectedFlagIds = useSelector(custFlagSelect.selectedFlagIds);

  const sortedFlagDocs = [...flagDocs].sort((a, b) => a.desc.localeCompare(b.desc));

  function handleFlagToggle(flagId: number) {
    const next = selectedFlagIds.includes(flagId)
      ? selectedFlagIds.filter((id) => id !== flagId)
      : [...selectedFlagIds, flagId];
    dispatch(custFlagActions.setSelectedFlagIds(next));
    persistFlagIds(next);
  }

  function handleClearFlags() {
    dispatch(custFlagActions.setSelectedFlagIds([]));
    persistFlagIds([]);
  }

  return (
    <div className="p-2 w-52">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Flags
        </span>
        {selectedFlagIds.length > 0 && (
          <button
            onClick={handleClearFlags}
            className="text-xs text-primary hover:underline"
          >
            Clear ({selectedFlagIds.length})
          </button>
        )}
      </div>
      <div className="h-48 rounded-md bg-accent/10">
        <ScrollArea className="h-full p-2">
          <div className="space-y-2 pr-2">
            {sortedFlagDocs.map((flag) => (
              <div key={flag.flagId} className="flex items-center gap-2">
                <Checkbox
                  id={`nav-flag-${flag.flagId}`}
                  checked={selectedFlagIds.includes(flag.flagId)}
                  onCheckedChange={() => handleFlagToggle(flag.flagId)}
                />
                <Label
                  htmlFor={`nav-flag-${flag.flagId}`}
                  className="cursor-pointer font-normal text-sm"
                >
                  {flag.desc}
                </Label>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
