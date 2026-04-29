"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { qsSelect } from "../quickSendSelect";
import { quickSendActions } from "../quickSendSlice";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { ProgramRow } from "./ProgramRow";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";

/**
 * Left-panel section for managing the program list.
 *
 * Layout:
 * - Collapsible header "Programs"
 * - Global prepay selector
 * - One ProgramRow per configured program (with expand/collapse for servCode overrides)
 * - "Add Program" button that opens a flat list of all available progCodes
 */
export function ProgramPanel() {
  const dispatch = useAppDispatch();
  const programConfigs = useSelector(qsSelect.programConfigs);
  const effectiveProgramConfigs = useSelector(qsSelect.effectiveProgramConfigs);
  const pinnedProgCodeIds = useSelector(qsSelect.pinnedProgCodeIds);
  const progCodes = useSelector(progServSelect.progCodes);
  const progCodeMap = useSelector(progServSelect.progCodeMap);

  const [isOpen, setIsOpen] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const configuredIds = new Set(programConfigs.map((c) => c.progCodeId));
  const availableToAdd = progCodes.filter((p) => !configuredIds.has(p.progCodeId));

  const handleAddProgram = (progCodeId: string) => {
    const progCode = progCodeMap.get(progCodeId);
    if (progCode) {
      dispatch(quickSendActions.addProgramConfig(progCode));
    }
    setIsAdding(false);
  };

  return (
    <div className="border-b border-border">
      {/* Header */}
      <button
        className="flex w-full items-center justify-between px-4 py-1.5 text-left bg-primary/30 hover:bg-primary/40 transition-colors"
        onClick={() => setIsOpen((v) => !v)}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
          Programs
        </span>
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="flex flex-col gap-0">
          {/* Program rows */}
          {effectiveProgramConfigs.map((config) => {
            const progCode = progCodeMap.get(config.progCodeId);
            if (!progCode) return null;
            return (
              <ProgramRow
                key={config.progCodeId}
                config={config}
                progCode={progCode}
                isPinned={pinnedProgCodeIds.has(config.progCodeId)}
              />
            );
          })}

          {/* Add program */}
          {isAdding ? (
            <div className="px-4 py-2 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Select a program:</span>
              <div className="flex flex-col max-h-48 overflow-y-auto border border-border rounded bg-card">
                {availableToAdd.length === 0 ? (
                  <span className="px-3 py-2 text-xs text-muted-foreground">
                    All programs already added
                  </span>
                ) : (
                  availableToAdd.map((p) => (
                    <button
                      key={p.progCodeId}
                      className="flex items-center px-3 py-2 text-left hover:bg-accent/10 transition-colors overflow-hidden"
                      onClick={() => handleAddProgram(p.progCodeId)}
                    >
                      <span className="truncate text-xs text-foreground min-w-0">
                        <span className="font-bold">{p.progCodeId}</span>
                        {" "}
                        <span className="text-[10px] text-muted-foreground">{p.description}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
              <button
                className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
                onClick={() => setIsAdding(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="flex items-center gap-1.5 px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="h-3 w-3" />
              Add Program
            </button>
          )}
        </div>
      )}
    </div>
  );
}
