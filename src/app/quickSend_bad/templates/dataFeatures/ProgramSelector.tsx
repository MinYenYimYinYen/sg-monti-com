"use client";

import React from "react";
import { useSelector } from "react-redux";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelectors";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";

interface ProgramSelectorProps {
  selectedProgCodeId: string | null;
  onSelect: (progCodeId: string | null) => void;
}

/**
 * Sender-side program selector for the `progCode` data feature.
 * Renders a dropdown of available ProgCodes. The selected program's servCodes
 * are used to populate table blocks at send time.
 */
export function ProgramSelector({ selectedProgCodeId, onSelect }: ProgramSelectorProps) {
  useProgServ({autoLoad: true})
  const progCodes = useSelector(progServSelect.progCodes);

  const available = progCodes.filter((p) => p.available && !p.isSpecial);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">
        Program
      </span>
      <Select
        value={selectedProgCodeId ?? ""}
        onValueChange={(value) => onSelect(value || null)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a program..." />
        </SelectTrigger>
        <SelectContent>
          {available.map((progCode) => (
            <SelectItem key={progCode.progCodeId} value={progCode.progCodeId}>
              {progCode.description}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
