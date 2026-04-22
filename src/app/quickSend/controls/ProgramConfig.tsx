"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { quickSendActions } from "../quickSendSlice";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelectors";
import type { QSProgramConfig } from "../QuickSendTypes";

type Props = {
  config: QSProgramConfig;
};

export function ProgramConfig({ config }: Props) {
  const dispatch = useAppDispatch();
  const progCodeMap = useSelector(progServSelect.progCodeMap);
  const progCode = progCodeMap.get(config.progCodeId);

  if (!progCode) return null;

  const includedIds = new Set(config.includedServCodeIds);

  const handleToggle = (servCodeId: string) => {
    const isIncluded = includedIds.has(servCodeId);
    const updated = isIncluded
      ? config.includedServCodeIds.filter((id) => id !== servCodeId)
      : [...config.includedServCodeIds, servCodeId];
    dispatch(
      quickSendActions.setIncludedServCodeIds({
        alias: config.alias,
        servCodeIds: updated,
      }),
    );
  };

  const nonServiceCallCodes = progCode.servCodes.filter((s) => !s.isServiceCall);

  return (
    <div className="flex flex-col gap-2 px-4 py-3 border-b border-border">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold text-foreground">
          {config.alias}
        </span>
        <span className="text-xs text-muted-foreground">{progCode.description}</span>
      </div>
      <div className="flex flex-col gap-1">
        {nonServiceCallCodes.map((servCode) => {
          const checked = includedIds.has(servCode.servCodeId);
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
    </div>
  );
}
