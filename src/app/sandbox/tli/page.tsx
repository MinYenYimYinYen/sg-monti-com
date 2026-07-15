"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useTliDeps } from "@/app/sandbox/tli/useTliDeps";
import { tliSelect } from "@/app/sandbox/tli/tliSelect";
import { ProgramLink } from "@/app/realGreen/customer/components/ProgramLink";
import { TliDone } from "@/app/sandbox/tli/TliDone";
import { TliInstructions } from "@/app/sandbox/tli/TliInstructions";
import { uiSelect } from "@/store/reduxUtil/uiSlice";

export default function TliPage() {
  useTliDeps();
  const mismatches = useSelector(tliSelect.mismatches);
  const loadingCount = useSelector(uiSelect.loadingCount);
  const [visitedIds, setVisitedIds] = useState<Set<number>>(new Set());

  const isDone = loadingCount === 0 && mismatches.length === 0;

  if (isDone) {
    return <TliDone />;
  }

  return (
    <>
      <TliInstructions />
      <div className="p-4 h-full overflow-y-auto">
        <h1 className="text-xl font-bold mb-4">
          TLI Salesperson Mismatches ({mismatches.length})
        </h1>
        <ul className="space-y-1">
          {mismatches.map(({ customer, lip25, tli26 }) => {
            const visited = visitedIds.has(tli26.progId);
            return (
              <li key={customer.custId} className="flex items-center gap-3">
                <ProgramLink
                  programId={tli26.progId}
                  className={visited ? "text-foreground/40 line-through" : "text-primary"}
                  onClick={() =>
                    setVisitedIds((prev) => new Set(prev).add(tli26.progId))
                  }
                >
                  {customer.displayName}
                </ProgramLink>
                <span className="text-foreground/60 text-sm">
                  {lip25.soldBy[0] ?? "—"} → {tli26.soldBy[0] ?? "—"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
