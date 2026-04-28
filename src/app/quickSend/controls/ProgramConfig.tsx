"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { quickSendActions } from "../quickSendSlice";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelectors";
import { ServCodeCheckboxList } from "./ServCodeCheckboxList";
import { PrepaySelector } from "./PrepaySelector";
import type { QSProgramConfig } from "../QuickSendTypes";

type Props = {
  config: QSProgramConfig;
};

export function ProgramConfig({ config }: Props) {
  const dispatch = useAppDispatch();
  const progCodeMap = useSelector(progServSelect.progCodeMap);
  const progCode = progCodeMap.get(config.progCodeId);

  if (!progCode) return null;

  const nonServiceCallCodes = progCode.servCodes.filter((s) => !s.isServiceCall);

  const handleServCodesChange = (servCodeIds: string[]) => {
    dispatch(quickSendActions.setIncludedServCodeIds({ alias: config.alias, servCodeIds }));
  };

  const handlePrepayChange = (prepayId: string | null) => {
    dispatch(quickSendActions.setPrepayId({ alias: config.alias, prepayId }));
  };

  return (
    <div className="flex flex-col gap-2 px-4 py-3 border-b border-border">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold text-foreground">
          {config.alias}
        </span>
        <span className="text-xs text-muted-foreground">{progCode.description}</span>
      </div>
      <ServCodeCheckboxList
        servCodes={nonServiceCallCodes}
        selected={config.includedServCodeIds}
        onChange={handleServCodesChange}
      />
      <PrepaySelector value={config.prepayId} onChange={handlePrepayChange} />
    </div>
  );
}
