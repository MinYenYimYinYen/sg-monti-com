"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { quickSendActions } from "../quickSendSlice";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelectors";
import { prepaySelect } from "@/app/realGreen/prepay/selectors/prepaySelect";
import type { QSProgramConfig } from "../QuickSendTypes";

type Props = {
  config: QSProgramConfig;
};

export function ProgramConfig({ config }: Props) {
  const dispatch = useAppDispatch();
  const progCodeMap = useSelector(progServSelect.progCodeMap);
  const prepayDocs = useSelector(prepaySelect.prepayDocs);
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

  const handlePrepayChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    dispatch(
      quickSendActions.setPrepayId({
        alias: config.alias,
        prepayId: value === "" ? null : value,
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
      {/* Prepay selector */}
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">Prepay</span>
        <select
          value={config.prepayId ?? ""}
          onChange={handlePrepayChange}
          className="text-xs rounded border border-border bg-card text-foreground px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">None</option>
          {prepayDocs.map((prepay) => (
            <option key={prepay.prepayId} value={prepay.prepayId}>
              {prepay.prepayId} — {prepay.percent}%
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
