"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { usePathname } from "next/navigation";
import { scenarioCrudSelect } from "@/app/bizPlan/assignmentPlan/scenarioCrudSelect";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { useAssignmentPlan } from "@/app/bizPlan/assignmentPlan/useAssignmentPlan";
import { Save, Trash2, ChevronDown } from "lucide-react";

const ASSIGNMENTS_PATH = "/bizPlan/paceCrawler/assignments";

export function AssignmentScenarioSelector() {
  const { upsertScenario, removeScenario, activateScenario } = useAssignmentPlan({ autoLoad: true });

  const activeScenario = useSelector(scenarioCrudSelect.activeScenario);
  const inactiveScenarios = useSelector(scenarioCrudSelect.inactiveScenarios);
  const isDirty = useSelector(scenarioCrudSelect.isDirty);
  const assignmentPlans = useSelector(assignmentPlanSelect.assignmentPlans);

  const pathname = usePathname();
  const isAssignmentsPage = pathname === ASSIGNMENTS_PATH;

  const [showDropdown, setShowDropdown] = useState(false);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string | null>(null);
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [saveAsName, setSaveAsName] = useState("");

  const now = () => new Date().toISOString();

  function handleSave() {
    if (!activeScenario || !isDirty) return;
    upsertScenario({
      ...activeScenario,
      updatedAt: now(),
      plans: assignmentPlans,
    });
  }

  function handleSaveAs() {
    const name = saveAsName.trim();
    if (!name) return;
    const timestamp = now();
    upsertScenario({
      name,
      createdAt: timestamp,
      updatedAt: timestamp,
      isActive: false,
      plans: assignmentPlans,
    });
    setSaveAsName("");
    setShowSaveAs(false);
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* Scenario dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown((v) => !v)}
          className="flex items-center gap-1 h-6 px-2 rounded border border-border text-[10px] text-foreground hover:bg-accent/10 transition-colors bg-card"
        >
          <span className="max-w-[120px] truncate">
            {activeScenario ? activeScenario.name : "No scenario"}
          </span>
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
        </button>

        {showDropdown && (
          <div className="absolute top-full left-0 mt-1 z-50 w-56 rounded border border-border bg-card shadow-md py-1">
            {/* Active scenario (non-clickable, just shows current) */}
            {activeScenario && (
              <div className="px-2 py-1 border-b border-border/50 mb-0.5">
                <span className="text-[10px] font-semibold text-primary truncate block">
                  ✓ {activeScenario.name}
                </span>
              </div>
            )}
            {inactiveScenarios.length === 0 && !activeScenario && (
              <p className="px-3 py-1.5 text-[10px] text-muted-foreground">No scenarios saved</p>
            )}
            {inactiveScenarios.length === 0 && activeScenario && (
              <p className="px-3 py-1.5 text-[10px] text-muted-foreground">No other scenarios</p>
            )}
            {inactiveScenarios.map((scenario) => (
              <div
                key={scenario.name}
                className="flex items-center gap-1.5 px-2 py-1 hover:bg-accent/10 group"
              >
                <button
                  onClick={() => {
                    activateScenario(scenario.name);
                    setShowDropdown(false);
                    setConfirmDeleteName(null);
                  }}
                  className="flex-1 text-left text-[10px] text-foreground truncate"
                >
                  {scenario.name}
                </button>
                <span className="text-[9px] text-muted-foreground shrink-0">
                  {new Date(scenario.updatedAt).toLocaleDateString()}
                </span>
                {confirmDeleteName === scenario.name ? (
                  <>
                    <button
                      onClick={() => {
                        removeScenario(scenario.name);
                        setConfirmDeleteName(null);
                      }}
                      className="text-[9px] text-destructive font-semibold hover:underline shrink-0"
                    >
                      Del
                    </button>
                    <button
                      onClick={() => setConfirmDeleteName(null)}
                      className="text-[9px] text-muted-foreground hover:underline shrink-0"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteName(scenario.name)}
                    className="p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                    title="Delete scenario"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assignments-page-only controls */}
      {isAssignmentsPage && (
        <>
          {isDirty && (
            <span className="text-[9px] text-secondary font-semibold uppercase tracking-wide">
              unsaved
            </span>
          )}

          {activeScenario && isDirty && (
            <button
              onClick={handleSave}
              className="flex items-center gap-1 h-6 px-2 rounded text-[10px] font-semibold bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
              title="Save changes to active scenario"
            >
              <Save className="w-3 h-3" />
              Save
            </button>
          )}

          {showSaveAs ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={saveAsName}
                onChange={(e) => setSaveAsName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveAs();
                  if (e.key === "Escape") { setShowSaveAs(false); setSaveAsName(""); }
                }}
                placeholder="Scenario name…"
                autoFocus
                className="h-6 text-[10px] px-2 rounded border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-32"
              />
              <button
                onClick={handleSaveAs}
                disabled={!saveAsName.trim()}
                className="h-6 px-2 rounded text-[10px] font-semibold bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => { setShowSaveAs(false); setSaveAsName(""); }}
                className="h-6 px-1.5 rounded text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSaveAs(true)}
              className="flex items-center gap-1 h-6 px-2 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
              title="Save as new scenario"
            >
              <Save className="w-3 h-3" />
              Save As
            </button>
          )}
        </>
      )}
    </div>
  );
}
