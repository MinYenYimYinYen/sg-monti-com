"use client";

import { usePaceCrawlerDeps } from "@/app/bizPlan/paceCrawler/usePaceCrawlerDeps";
import { PaceCrawlerNav } from "@/app/bizPlan/paceCrawler/PaceCrawlerNav";

export default function PaceCrawlerLayout({ children }: { children: React.ReactNode }) {
  usePaceCrawlerDeps();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PaceCrawlerNav />
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
