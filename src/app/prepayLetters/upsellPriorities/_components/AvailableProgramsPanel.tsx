"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Plus } from "lucide-react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { Input } from "@/style/components/input";
import { upsellPrioritiesSelect } from "../upsellPrioritiesSelect";
import { upsellPrioritiesActions } from "../upsellPrioritiesSlice";

/** Programs not yet in the waterfall; clicking one appends it at the lowest priority. */
export function AvailableProgramsPanel() {
  const dispatch = useAppDispatch();
  const progCodes = useSelector(progServSelect.progCodes);
  const draft = useSelector(upsellPrioritiesSelect.draft);
  const [search, setSearch] = useState("");

  const listedIds = new Set(draft?.priorities.map((p) => p.progCodeId));
  const needle = search.toLowerCase();
  const availableProgCodes = progCodes.filter(
    (progCode) =>
      !listedIds.has(progCode.progCodeId) &&
      (progCode.progCodeId.toLowerCase().includes(needle) ||
        progCode.description.toLowerCase().includes(needle)),
  );

  return (
    <div className="flex flex-col h-full min-h-0 border-r border-border">
      <div className="px-3 py-2 border-b border-border">
        <h3 className="text-xs font-bold uppercase tracking-wide text-foreground mb-2">
          Programs
        </h3>
        <Input
          placeholder="Search programs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 text-xs"
        />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {availableProgCodes.map((progCode) => (
          <button
            key={progCode.progCodeId}
            type="button"
            disabled={!draft}
            onClick={() =>
              dispatch(upsellPrioritiesActions.addPriority({ progCodeId: progCode.progCodeId }))
            }
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left border-b border-border/50 hover:bg-accent/10 disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <Plus className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="font-mono text-xs font-semibold text-primary">
              {progCode.progCodeId}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {progCode.description}
            </span>
          </button>
        ))}
        {availableProgCodes.length === 0 && (
          <p className="text-[10px] text-muted-foreground italic text-center py-4">
            No programs found.
          </p>
        )}
      </div>
    </div>
  );
}
