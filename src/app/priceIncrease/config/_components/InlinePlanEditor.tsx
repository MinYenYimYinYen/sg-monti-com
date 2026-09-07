"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { Plus, Minus, ChevronDown } from "lucide-react";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { priceIncreaseConfigSelect } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSelect";
import { priceIncreaseConfigActions } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSlice";
import { seasonIncreasesActions } from "@/app/priceIncrease/seasonIncreases/seasonIncreasesSlice";

type InlinePlanEditorProps = {
  /** Called after a new plan is saved, with the new seasonIncreasesId to auto-select */
  onPlanSaved: (seasonIncreasesId: string) => void;
};

export function InlinePlanEditor({ onPlanSaved }: InlinePlanEditorProps) {
  const dispatch = useAppDispatch();
  const draft = useSelector(priceIncreaseConfigSelect.inlinePlanDraft);
  const isOpen = useSelector(priceIncreaseConfigSelect.inlinePlanIsOpen);
  const isNew = useSelector(priceIncreaseConfigSelect.inlinePlanIsNew);
  const draftRows = useSelector(priceIncreaseConfigSelect.inlinePlanDraftRows);
  const canSave = useSelector(priceIncreaseConfigSelect.inlinePlanCanSave);
  const isDirty = useSelector(priceIncreaseConfigSelect.inlinePlanIsDirty);

  if (!isOpen || !draft) return null;

  const handleSave = () => {
    const normalizedIncreases = draft.seasonIncreases.map((s, i) => ({
      season: i + 2,
      increasePercent: s.increasePercent,
    }));
    dispatch(
      seasonIncreasesActions.upsertSeasonIncreases({
        params: { ...draft, seasonIncreases: normalizedIncreases },
        config: { loadingMsg: isNew ? "Creating season plan..." : "Saving season plan..." },
      }),
    );
    onPlanSaved(draft.seasonIncreasesId);
    dispatch(priceIncreaseConfigActions.closeInlinePlan());
  };

  const handleCancel = () => {
    dispatch(priceIncreaseConfigActions.closeInlinePlan());
  };

  return (
    <div className="mt-2 rounded-md border border-primary/20 bg-primary/5 p-3 space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
        <ChevronDown className="w-3.5 h-3.5" />
        {isNew ? "New Increase Plan" : `Editing: ${draft.label}`}
        {isDirty && !isNew && (
          <span className="ml-1 text-muted-foreground font-normal">(unsaved changes)</span>
        )}
      </div>

      {/* Label */}
      <div className="space-y-1">
        <Label className="text-xs">Plan Label</Label>
        <Input
          value={draft.label}
          onChange={(e) =>
            dispatch(priceIncreaseConfigActions.updateInlinePlanDraft({ label: e.target.value }))
          }
          placeholder="e.g. Moderate"
          className="h-8 text-sm"
        />
      </div>

      {/* Season rows */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground px-0.5">
          <span>Season</span>
          <span>Increase %</span>
          <span>Cumulative</span>
        </div>

        {draftRows.length === 0 && (
          <p className="text-xs text-muted-foreground px-0.5">No seasons yet. Add a season to start.</p>
        )}

        {draftRows.map((row, index) => (
          <div key={row.season} className="grid grid-cols-3 gap-2 items-center">
            <span className="text-xs text-muted-foreground px-0.5">S{row.season}</span>
            <Input
              type="number"
              min={0}
              step={0.1}
              value={row.increasePercent}
              onChange={(e) =>
                dispatch(
                  priceIncreaseConfigActions.updateInlinePlanRowPercent({
                    index,
                    increasePercent: parseFloat(e.target.value) || 0,
                  }),
                )
              }
              className="h-7 text-xs"
            />
            <span className="text-xs text-foreground font-medium px-0.5">
              {row.cumulativePercent.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>

      {/* Row controls */}
      <div className="flex gap-1.5">
        <Button
          size="sm"
          variant="primary"
          intensity="soft"
          onClick={() => dispatch(priceIncreaseConfigActions.addInlinePlanRow())}
        >
          <Plus className="w-3 h-3" />
          Add Season
        </Button>
        {draftRows.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            intensity="ghost"
            onClick={() => dispatch(priceIncreaseConfigActions.removeLastInlinePlanRow())}
          >
            <Minus className="w-3 h-3" />
            Remove Last
          </Button>
        )}
      </div>

      {/* Save / Cancel */}
      <div className="flex gap-2 justify-end pt-1 border-t border-primary/10">
        <Button size="sm" variant="outline" intensity="ghost" onClick={handleCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant="primary"
          intensity="solid"
          onClick={handleSave}
          disabled={!canSave}
        >
          Save Plan
        </Button>
      </div>
    </div>
  );
}
