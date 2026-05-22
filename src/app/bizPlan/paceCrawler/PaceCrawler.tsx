"use client";

import { usePaceCrawlerDeps } from "@/app/bizPlan/paceCrawler/usePaceCrawlerDeps";
import { EmployeeCardPanel } from "@/app/bizPlan/paceCrawler/devComponents/EmployeeCardPanel";

export function PaceCrawler() {
  usePaceCrawlerDeps();

  return <EmployeeCardPanel />;
}
