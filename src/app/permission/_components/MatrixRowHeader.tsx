"use client";

import { Info } from "lucide-react";
import { summarizeMembers, type MatrixRow } from "@/permission/logic/capabilityMatrix";
import { Button } from "@/style/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/style/components/popover";

/** The row's label, with an info button that opens its description and members. */
export function MatrixRowHeader({ row }: { row: MatrixRow }) {
  const members = summarizeMembers({ row });

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-foreground">{row.name}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="primary"
            intensity="ghost"
            className="h-6 w-6"
            aria-label={`About ${row.name}`}
          >
            <Info className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 space-y-2 text-sm">
          {row.description && <p className="text-foreground">{row.description}</p>}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Includes</h4>
            <ul className="mt-1 space-y-0.5">
              {members.map((member) => (
                <li key={`${member.featureKey}|${member.resource}`} className="text-muted-foreground">
                  <span className="text-foreground">{member.featureKey}</span> · {member.resource}:{" "}
                  {member.verbs.join(", ")}
                </li>
              ))}
            </ul>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
