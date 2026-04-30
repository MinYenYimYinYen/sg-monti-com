"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { usePaceDeps } from "@/app/bizPlan/pace/usePaceDeps";
import { paceActions } from "@/app/bizPlan/pace/paceSlice";
import { PaceTable } from "@/app/bizPlan/pace/PaceTable";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Input } from "@/style/components/input";
import { AppState } from "@/store";

const selectSelectedDateRange = (state: AppState) =>
  state.pace.selectedDateRange;
const selectMinProductiveServices = (state: AppState) =>
  state.pace.minProductiveServices;

export function Pace() {
  usePaceDeps();
  const dispatch = useAppDispatch();

  const selectedDateRange = useSelector(selectSelectedDateRange);
  const minProductiveServices = useSelector(selectMinProductiveServices);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Capacity Lookback Window
          </label>
          <DateRangePicker
            value={selectedDateRange}
            onChange={(range) =>
              dispatch(paceActions.setSelectedDateRange(range))
            }
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Min Services / Day
          </label>
          <Input
            type="number"
            min={1}
            max={20}
            value={minProductiveServices}
            onChange={(e) =>
              dispatch(
                paceActions.setMinProductiveServices(
                  Math.max(1, Number(e.target.value)),
                ),
              )
            }
            className="w-20"
          />
        </div>
      </div>

      <PaceTable />
    </div>
  );
}
