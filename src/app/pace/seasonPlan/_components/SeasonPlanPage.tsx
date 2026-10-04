"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { seasonPlanPageSelect } from "@/app/pace/seasonPlanPageSelect";
import { usePaceSeasonPlan } from "@/app/pace/seasonPlan/useSeasonPlan";
import { SeasonPlan } from "@/app/pace/seasonPlan/SeasonPlanTypes";
import { Plus, Trash2, Check, Copy } from "lucide-react";
import { SeasonPlanForm } from "@/app/pace/seasonPlan/_components/SeasonPlanForm";
import {
  FormState,
  emptyForm,
  planToForm,
  fmtDate,
  nowISO,
} from "@/app/pace/seasonPlan/_components/seasonPlanHelpers";

export function SeasonPlanPage() {
  const seasonPlans = useSelector(seasonPlanPageSelect.seasonPlans);
  const { upsertSeasonPlan, deleteSeasonPlan, activateSeasonPlan } = usePaceSeasonPlan({
    autoLoad: true,
  });

  const [mode, setMode] = useState<"list" | "create" | "edit" | "copy">("list");
  const [editingPlan, setEditingPlan] = useState<SeasonPlan | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string | null>(null);

  function handleSave(form: FormState) {
    const timestamp = nowISO();
    const plan: SeasonPlan = {
      name: form.name,
      year: form.year,
      cascadeThreshold: form.cascadeThreshold,
      snowMelt: form.snowMelt || null,
      snowDeadline: form.snowDeadline || null,
      groupSchedules: form.groupSchedules,
      isActive: editingPlan?.isActive ?? false,
      createdAt: editingPlan?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    upsertSeasonPlan(plan);
    setMode("list");
    setEditingPlan(null);
  }

  if (mode === "create" || mode === "edit" || mode === "copy") {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="shrink-0 px-4 py-3 border-b border-border bg-card flex items-center gap-2">
          <button
            onClick={() => {
              setMode("list");
              setEditingPlan(null);
            }}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Season Plans
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="text-xs font-semibold text-foreground">
            {mode === "edit"
              ? `Edit: ${editingPlan?.name}`
              : mode === "copy"
                ? `Copy: ${editingPlan?.name}`
                : "New Season Plan"}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <SeasonPlanForm
            initialForm={
              mode === "copy"
                ? { ...planToForm(editingPlan!), name: "" }
                : editingPlan
                  ? planToForm(editingPlan)
                  : emptyForm()
            }
            isEditing={mode === "edit"}
            onSave={handleSave}
            onCancel={() => {
              setMode("list");
              setEditingPlan(null);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-4 py-3 border-b border-border bg-card flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Season Plans</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Committed planned dates per assignment group. One plan is active at a time.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingPlan(null);
            setMode("create");
          }}
          className="flex items-center gap-1.5 h-8 px-3 rounded text-xs font-semibold bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Plan
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {seasonPlans.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
            <p className="text-sm text-muted-foreground">No season plans yet.</p>
            <button
              onClick={() => setMode("create")}
              className="flex items-center gap-1.5 h-8 px-4 rounded text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Plan
            </button>
          </div>
        )}

        <div className="space-y-3">
          {seasonPlans.map((plan) => (
            <div
              key={plan.name}
              className={`border rounded-lg overflow-hidden ${plan.isActive ? "border-primary/40 bg-primary/3" : "border-border bg-card"}`}
            >
              <div
                className={`px-4 py-3 flex items-start justify-between gap-3 ${plan.isActive ? "bg-primary/8" : "bg-accent/5"}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {plan.name}
                    </span>
                    {plan.isActive && (
                      <span className="flex items-center gap-1 text-[9px] text-primary bg-primary/15 rounded px-1.5 py-0.5 font-semibold shrink-0">
                        <Check className="w-2.5 h-2.5" />
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span>Year: {plan.year}</span>
                    <span>Cascade: {Math.round(plan.cascadeThreshold * 100)}%</span>
                    {plan.snowMelt && <span>🌱 Melt: {fmtDate(plan.snowMelt)}</span>}
                    {plan.snowDeadline && <span>❄ Snow: {fmtDate(plan.snowDeadline)}</span>}
                    <span>{plan.groupSchedules.length} groups scheduled</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!plan.isActive && (
                    <button
                      onClick={() => activateSeasonPlan(plan.name)}
                      className="h-7 px-2.5 rounded text-[10px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                    >
                      Activate
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditingPlan(plan);
                      setMode("copy");
                    }}
                    className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
                    title="Copy plan"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingPlan(plan);
                      setMode("edit");
                    }}
                    className="h-7 px-2.5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
                  >
                    Edit
                  </button>
                  {confirmDeleteName === plan.name ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          deleteSeasonPlan(plan.name);
                          setConfirmDeleteName(null);
                        }}
                        className="h-7 px-2 rounded text-[10px] text-destructive font-semibold hover:bg-destructive/10 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteName(null)}
                        className="h-7 px-1.5 rounded text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteName(plan.name)}
                      className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Delete plan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {plan.groupSchedules.length > 0 && (
                <div className="px-4 py-2 border-t border-border/50">
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                    {plan.groupSchedules.slice(0, 8).map((schedule) => (
                      <span
                        key={schedule.groupId}
                        className="text-[10px] font-mono text-muted-foreground"
                      >
                        {schedule.groupId}: {fmtDate(schedule.plannedStart)}–
                        {fmtDate(schedule.plannedEnd)}
                      </span>
                    ))}
                    {plan.groupSchedules.length > 8 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{plan.groupSchedules.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
