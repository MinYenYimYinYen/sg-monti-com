"use client";

import { usePaceCrawlerDeps } from "@/app/bizPlan/paceCrawler/usePaceCrawlerDeps";
import { PaceCrawlerNav } from "@/app/bizPlan/paceCrawler/PaceCrawlerNav";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { paceCrawlerActions } from "@/app/bizPlan/paceCrawler/paceCrawlerSlice";
import { DatePicker } from "@/components/DatePicker";

export default function PaceCrawlerLayout({ children }: { children: React.ReactNode }) {
  usePaceCrawlerDeps();
  const dispatch = useAppDispatch();
  const mainDate = useSelector(paceCrawlerSelect.mainDate);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">As of</span>
          <DatePicker
            className="w-36"
            size="sm"
            value={mainDate}
            onChange={(date) => {
              if (date) dispatch(paceCrawlerActions.setMainDate(date));
            }}
          />
        </div>
        <div className="flex items-center gap-1">
          <PaceCrawlerNav />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
