"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { quickSendActions } from "../quickSendSlice";
import { quickSendSelect } from "../quickSendSelect";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelectors";

export function ProgChooserControl() {
  const dispatch = useAppDispatch();
  const progCodes = useSelector(progServSelect.progCodes);
  const progChooser = useSelector(quickSendSelect.progChooser);

  const selectedIds = new Set(progChooser.selectedProgCodeIds);

  const handleToggle = (progCodeId: string) => {
    dispatch(quickSendActions.toggleProgChooserProgCode(progCodeId));
  };

  return (
    <div className="flex flex-col gap-2 px-4 py-3 border-b border-border">
      <span className="text-xs font-semibold text-foreground">Program Chooser</span>
      <span className="text-xs text-muted-foreground">
        Select programs to include in the loop
      </span>
      <div className="flex flex-col gap-1">
        {progCodes.map((progCode) => {
          const checked = selectedIds.has(progCode.progCodeId);
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
    </div>
  );
}
