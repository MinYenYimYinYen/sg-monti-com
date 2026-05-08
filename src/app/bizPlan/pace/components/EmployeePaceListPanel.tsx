"use client";

import { useRef } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { employeePaceSelect, PX_PER_DAY } from "@/app/bizPlan/pace/employee/employeePaceSelect";
import { employeePaceActions } from "@/app/bizPlan/pace/employee/employeePaceSlice";
import { EmployeePaceConfig } from "@/app/bizPlan/pace/components/EmployeePaceConfig";
import { MiniServCodeControls } from "@/app/bizPlan/pace/employee/components/MiniServCodeControls";
import { paceSelect } from "@/app/bizPlan/pace/paceSelect";
import { DatePicker } from "@/components/DatePicker";

// Tick labels are extracted into a sub-component so they can read the servCodePaceMap
// and wrap each label in a MiniServCodeControls trigger.
type DateTickEntry = {
  date: string;
  labels: string[];
  weekdayIndex: number;
};

function TickLabels({
  dateTicks,
  trackHeightPx,
}: {
  dateTicks: DateTickEntry[];
  trackHeightPx: number;
}) {
  const servCodePaceMap = useSelector(paceSelect.servCodePaceMap);

  return (
    <div className="relative flex-1" style={{ height: trackHeightPx }}>
      {dateTicks.map((tick) => (
        <div
          key={tick.date}
          className="absolute left-0 flex flex-col"
          style={{
            top: tick.weekdayIndex * PX_PER_DAY,
            transform: "translateY(-50%)",
          }}
        >
          {tick.labels.map((label) => {
            // Labels are "Start X, Y" or "Finish X, Y" — split prefix from IDs
            const prefix = label.startsWith("Start ")
              ? "Start"
              : label.startsWith("Finish ")
                ? "Finish"
                : null;
            const ids = prefix ? label.slice(prefix.length + 1).split(", ") : [];

            if (prefix && ids.length > 0) {
              return (
                <span
                  key={label}
                  className="text-[10px] text-muted-foreground leading-tight whitespace-nowrap flex items-center gap-0.5"
                >
                  <span>{prefix}</span>
                  {ids.map((id, i) => {
                    const pace = servCodePaceMap.get(id);
                    return (
                      <span key={id} className="flex items-center gap-0.5">
                        {i > 0 && <span className="text-muted-foreground/50">,</span>}
                        {pace ? (
                          <MiniServCodeControls servCode={pace.servCode}>
                            <span className="hover:text-foreground transition-colors">{id}</span>
                          </MiniServCodeControls>
                        ) : (
                          <span>{id}</span>
                        )}
                      </span>
                    );
                  })}
                </span>
              );
            }

            return (
              <span
                key={label}
                className="text-[10px] text-muted-foreground leading-tight whitespace-nowrap"
              >
                {label}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function EmployeePaceListPanel() {
  const dispatch = useAppDispatch();
  const trackRef = useRef<HTMLDivElement>(null);

  const mainDate = useSelector(employeePaceSelect.mainDate);
  const weekdayBounds = useSelector(employeePaceSelect.weekdayBounds);
  const dateTicks = useSelector(employeePaceSelect.dateTicks);

  const trackHeightPx = weekdayBounds?.trackHeightPx ?? PX_PER_DAY;

  function getMainDateIndex(): number {
    if (!weekdayBounds) return 0;
    const match = dateTicks.find((t) => t.date === mainDate);
    if (match) return match.weekdayIndex;
    const minMs = new Date(weekdayBounds.min).getTime();
    const mainMs = new Date(mainDate).getTime();
    if (mainMs <= minMs) return 0;
    if (mainMs >= new Date(weekdayBounds.max).getTime()) return weekdayBounds.weekdayCount - 1;
    let count = 0;
    let cur = minMs;
    while (cur < mainMs) {
      const day = new Date(cur).getUTCDay();
      if (day !== 0 && day !== 6) count++;
      cur += 24 * 60 * 60 * 1000;
    }
    return count;
  }

  const thumbY = getMainDateIndex() * PX_PER_DAY;

  function yToDate(clientY: number): string {
    const track = trackRef.current;
    if (!track || !weekdayBounds) return mainDate;
    const rect = track.getBoundingClientRect();
    const offsetPx = Math.max(0, Math.min(trackHeightPx, clientY - rect.top));
    const targetIndex = Math.min(
      weekdayBounds.weekdayCount - 1,
      Math.max(0, Math.round(offsetPx / PX_PER_DAY)),
    );
    let count = 0;
    let cur = new Date(weekdayBounds.min).getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    while (true) {
      const day = new Date(cur).getUTCDay();
      if (day !== 0 && day !== 6) {
        if (count === targetIndex) break;
        count++;
      }
      cur += oneDay;
    }
    return new Date(cur).toISOString().slice(0, 10);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dispatch(employeePaceActions.setMainDate(yToDate(e.clientY)));
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.buttons !== 1) return;
    dispatch(employeePaceActions.setMainDate(yToDate(e.clientY)));
  }

  return (
    <div className="w-44 shrink-0 flex flex-col gap-3">
      {/* Config popover — lookback + flags + not-set servCodes */}
      <EmployeePaceConfig />

      {/* Date picker */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          View Date
        </p>
        <DatePicker
          value={mainDate}
          onChange={(date) => {
            if (date) dispatch(employeePaceActions.setMainDate(date));
          }}
        />
      </div>

      {/* Scrollable slider area */}
      <div className="overflow-y-auto pt-2" style={{ maxHeight: "calc(100vh - 160px)" }}>
        <div className="flex gap-2" style={{ height: trackHeightPx }}>
          {/* Track + thumb column */}
          <div
            ref={trackRef}
            className="relative cursor-pointer select-none w-4 flex-none"
            style={{ height: trackHeightPx }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
          >
            {/* Track line */}
            <div
              className="absolute bg-primary/20 rounded-full"
              style={{ width: 4, left: 6, top: 0, bottom: 0 }}
            />
            {/* Filled range from top to thumb */}
            <div
              className="absolute bg-primary rounded-full"
              style={{ width: 4, left: 6, top: 0, height: thumbY }}
            />
            {/* Thumb */}
            <div
              className="absolute w-4 h-4 rounded-full border border-primary/50 bg-background shadow"
              style={{ left: 0, top: thumbY, transform: "translateY(-50%)" }}
            />
            {/* Tick notches */}
            {dateTicks.map((tick) => (
              <div
                key={tick.date}
                className="absolute bg-primary/40 rounded-full"
                style={{
                  width: 8,
                  height: 2,
                  left: 4,
                  top: tick.weekdayIndex * PX_PER_DAY,
                  transform: "translateY(-50%)",
                }}
              />
            ))}
          </div>

          {/* Tick labels column */}
          <TickLabels dateTicks={dateTicks} trackHeightPx={trackHeightPx} />
        </div>
      </div>
    </div>
  );
}
