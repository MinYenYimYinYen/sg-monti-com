"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Plus } from "lucide-react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { Popover, PopoverContent, PopoverTrigger } from "@/style/components/popover";
import { Input } from "@/style/components/input";
import { upsellPrioritiesActions } from "../upsellPrioritiesSlice";

type PrecludedByPopoverProps = {
  progCodeId: string;
  precludedBy: string[];
};

/** Multi-select of the programs that rule this upsell out. */
export function PrecludedByPopover({ progCodeId, precludedBy }: PrecludedByPopoverProps) {
  const dispatch = useAppDispatch();
  const progCodes = useSelector(progServSelect.progCodes);
  const [search, setSearch] = useState("");

  const needle = search.toLowerCase();
  const candidates = progCodes.filter(
    (progCode) =>
      progCode.progCodeId !== progCodeId &&
      (progCode.progCodeId.toLowerCase().includes(needle) ||
        progCode.description.toLowerCase().includes(needle)),
  );

  function toggle(precludingId: string) {
    const next = precludedBy.includes(precludingId)
      ? precludedBy.filter((id) => id !== precludingId)
      : [...precludedBy, precludingId];
    dispatch(upsellPrioritiesActions.setPrecludedBy({ progCodeId, precludedBy: next }));
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
          title="Add precluding program"
        >
          <Plus className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <Input
          placeholder="Search programs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 text-xs mb-2"
        />
        <div className="max-h-56 overflow-y-auto space-y-0.5">
          {candidates.map((progCode) => (
            <label
              key={progCode.progCodeId}
              className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-accent/10 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={precludedBy.includes(progCode.progCodeId)}
                onChange={() => toggle(progCode.progCodeId)}
                className="accent-primary"
              />
              <span className="font-mono text-xs font-semibold text-primary">
                {progCode.progCodeId}
              </span>
              <span className="text-[10px] text-muted-foreground truncate">
                {progCode.description}
              </span>
            </label>
          ))}
          {candidates.length === 0 && (
            <p className="text-[10px] text-muted-foreground italic px-1 py-2">No programs found.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
