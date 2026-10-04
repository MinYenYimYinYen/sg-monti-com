"use client";

import {
  mondayOf,
  toISO,
  buildWeekMondays,
  fmtDate,
  fmtWeek,
} from "@/app/pace/seasonPlan/_components/seasonPlanHelpers";

type WeekRangeSliderProps = {
  sliderMin: string;
  sliderMax: string;
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
};

export function WeekRangeSlider({
  sliderMin,
  sliderMax,
  start,
  end,
  onChange,
}: WeekRangeSliderProps) {
  const startMonday = mondayOf(sliderMin);
  const endMonday = mondayOf(sliderMax);
  const mondays = buildWeekMondays(startMonday, endMonday);
  const totalWeeks = mondays.length - 1;

  function closestIdx(iso: string): number {
    if (!iso || totalWeeks <= 0) return 0;
    const target = toISO(mondayOf(iso));
    const idx = mondays.indexOf(target);
    if (idx >= 0) return idx;
    let best = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < mondays.length; i++) {
      const diff = Math.abs(
        new Date(mondays[i]).getTime() - new Date(target).getTime(),
      );
      if (diff < bestDiff) {
        bestDiff = diff;
        best = i;
      }
    }
    return best;
  }

  const startIdx = closestIdx(start);
  const endIdx = Math.max(startIdx, closestIdx(end));

  if (totalWeeks <= 0) return null;

  const startPct = (startIdx / totalWeeks) * 100;
  const endPct = (endIdx / totalWeeks) * 100;

  function handleTrackPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const clickedIdx = Math.round(pct * totalWeeks);
    const draggingStart =
      Math.abs(clickedIdx - startIdx) <= Math.abs(clickedIdx - endIdx);
    e.currentTarget.setPointerCapture(e.pointerId);

    function onMove(moveEvent: PointerEvent) {
      const movePct = Math.max(
        0,
        Math.min(1, (moveEvent.clientX - rect.left) / rect.width),
      );
      const newIdx = Math.round(movePct * totalWeeks);
      if (draggingStart) {
        onChange(mondays[Math.min(newIdx, endIdx)], mondays[endIdx]);
      } else {
        onChange(mondays[startIdx], mondays[Math.max(newIdx, startIdx)]);
      }
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div className="flex flex-col gap-0.5 w-full select-none">
      <div className="text-center text-[9px] font-mono text-primary font-semibold leading-tight">
        {fmtWeek(mondays[startIdx])} ({fmtDate(mondays[startIdx])}) →{" "}
        {fmtWeek(mondays[endIdx])} ({fmtDate(mondays[endIdx])})
      </div>
      <div
        className="relative h-5 flex items-center cursor-pointer"
        onPointerDown={handleTrackPointerDown}
      >
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-border" />
        <div
          className="absolute h-1.5 rounded-full bg-primary/50"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        />
        <div
          className="absolute w-3.5 h-3.5 rounded-full bg-primary border-2 border-card shadow-sm"
          style={{ left: `calc(${startPct}% - 7px)`, zIndex: 2 }}
        />
        <div
          className="absolute w-3.5 h-3.5 rounded-full bg-primary border-2 border-card shadow-sm"
          style={{ left: `calc(${endPct}% - 7px)`, zIndex: 2 }}
        />
      </div>
      <div className="relative h-7">
        {mondays.map((monday, idx) => {
          if (idx % 4 !== 0 && idx !== totalWeeks) return null;
          const pct = (idx / totalWeeks) * 100;
          return (
            <div
              key={monday}
              className="absolute flex flex-col items-center leading-none"
              style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
            >
              <span className="text-[8px] text-muted-foreground/70 font-mono font-semibold">
                {fmtWeek(monday)}
              </span>
              <span className="text-[7px] text-muted-foreground/50 font-mono">
                {fmtDate(monday)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
