"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { useEffect } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { priceIncreaseSettingsSelect } from "@/app/priceIncrease/settings/settingsSelect";
import { priceIncreaseSettingsActions } from "@/app/priceIncrease/settings/settingsSlice";
import { priceIncreaseConfigSelect } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSelect";
import { priceIncreaseConfigActions } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSlice";
import { seasonIncreasesSelect } from "@/app/priceIncrease/seasonIncreases/seasonIncreasesSelect";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { FlagRounding, PriceIncreaseSettingsDoc } from "@/app/priceIncrease/settings/PriceIncreaseSettingsTypes";
import { InlinePlanEditor } from "@/app/priceIncrease/config/_components/InlinePlanEditor";

const ROUNDING_OPTIONS: { value: FlagRounding; label: string; description: string }[] = [
  { value: "round", label: "Round", description: "Nearest flag — least aggressive on average" },
  { value: "ceil", label: "Ceil", description: "Next higher flag — more aggressive" },
  { value: "floor", label: "Floor", description: "Next lower flag — less aggressive" },
];

/**
 * Inline settings form for the active price increase config.
 * Seeding the Redux draft on mount means priceIncreaseConfigSelect.settings
 * returns the live draft, so results update in real time as values change.
 */
export function ActiveSettingsPanel() {
  const dispatch = useAppDispatch();
  const activeSettings = useSelector(priceIncreaseSettingsSelect.activeSettings);
  const draft = useSelector(priceIncreaseConfigSelect.settingsDraft);
  const isDirty = useSelector(priceIncreaseConfigSelect.settingsIsDirty);
  const seasonDocs = useSelector(seasonIncreasesSelect.docs);
  const progCodes = useSelector(progServSelect.progCodes);
  const inlinePlanIsOpen = useSelector(priceIncreaseConfigSelect.inlinePlanIsOpen);

  // Seed the draft from the active settings on mount (or when active settings changes).
  // Uses seedSettingsDraft (not openSettingsSheet) to avoid opening the sheet UI.
  useEffect(() => {
    if (activeSettings) {
      dispatch(priceIncreaseConfigActions.seedSettingsDraft(activeSettings));
    }
  }, [dispatch, activeSettings]);

  const selectedSeasonDoc = seasonDocs.find(
    (d) => d.seasonIncreasesId === draft?.seasonIncreasesId,
  ) ?? null;

  function update(partial: Partial<PriceIncreaseSettingsDoc>) {
    dispatch(priceIncreaseConfigActions.updateSettingsDraft(partial));
  }

  function handleSave() {
    if (!draft) return;
    dispatch(
      priceIncreaseSettingsActions.upsertPriceIncreaseSettings({
        params: draft,
        config: { loadingMsg: "Saving settings..." },
      }),
    );
    dispatch(priceIncreaseConfigActions.discardSettingsDraft());
  }

  function handleDiscard() {
    dispatch(priceIncreaseConfigActions.discardSettingsDraft());
  }

  function handleNewPlan() {
    dispatch(priceIncreaseConfigActions.openInlinePlanNew());
  }

  function handleEditPlan() {
    if (selectedSeasonDoc) {
      dispatch(priceIncreaseConfigActions.openInlinePlanEdit(selectedSeasonDoc));
    }
  }

  function handlePlanSaved(seasonIncreasesId: string) {
    update({ seasonIncreasesId });
  }

  if (!activeSettings && !draft) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No active settings configured. Go to the Config page to set one up.
      </div>
    );
  }

  if (!draft) return null;

  return (
    <div className="overflow-y-auto h-full p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Active Settings</h2>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="destructive"
            intensity="ghost"
            onClick={handleDiscard}
            disabled={!isDirty}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Discard
          </Button>
          <Button
            size="sm"
            variant="primary"
            intensity="solid"
            onClick={handleSave}
            disabled={!isDirty || !draft.label || !draft.progCodeId || !draft.seasonIncreasesId}
          >
            Save
          </Button>
        </div>
      </div>

      {/* Label */}
      <div className="space-y-1.5">
        <Label htmlFor="ap-label">Label</Label>
        <Input
          id="ap-label"
          value={draft.label}
          onChange={(e) => update({ label: e.target.value })}
          placeholder="e.g. Moderate 2026"
        />
      </div>

      {/* Program */}
      <div className="space-y-1.5">
        <Label htmlFor="ap-prog">Program</Label>
        <select
          id="ap-prog"
          value={draft.progCodeId}
          onChange={(e) => update({ progCodeId: e.target.value })}
          className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">— Select —</option>
          {progCodes.map((p) => (
            <option key={p.progCodeId} value={p.progCodeId}>
              {p.progCodeId}
            </option>
          ))}
        </select>
      </div>

      {/* Increase Plan */}
      <div className="space-y-1.5">
        <Label htmlFor="ap-season-id">Increase Plan</Label>
        <div className="flex gap-2">
          <select
            id="ap-season-id"
            value={draft.seasonIncreasesId}
            onChange={(e) => update({ seasonIncreasesId: e.target.value })}
            className="flex h-9 flex-1 rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">— Select —</option>
            {seasonDocs.map((s) => (
              <option key={s.seasonIncreasesId} value={s.seasonIncreasesId}>
                {s.label}
              </option>
            ))}
          </select>
          {selectedSeasonDoc && !inlinePlanIsOpen && (
            <Button
              size="icon"
              variant="outline"
              intensity="ghost"
              onClick={handleEditPlan}
              title="Edit selected plan"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}
          {!inlinePlanIsOpen && (
            <Button
              size="icon"
              variant="primary"
              intensity="soft"
              onClick={handleNewPlan}
              title="Create new plan"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        <InlinePlanEditor onPlanSaved={handlePlanSaved} />
      </div>

      {/* Caps */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ap-max-now">Max Now (%)</Label>
          <Input
            id="ap-max-now"
            type="number"
            value={draft.maxIncreaseNow}
            onChange={(e) => update({ maxIncreaseNow: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ap-max-ever">Max Ever (%)</Label>
          <Input
            id="ap-max-ever"
            type="number"
            value={draft.maxIncreaseEver}
            onChange={(e) => update({ maxIncreaseEver: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ap-ongoing">Ongoing (%)</Label>
          <Input
            id="ap-ongoing"
            type="number"
            value={draft.ongoingIncrease}
            onChange={(e) => update({ ongoingIncrease: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      {/* Upsell */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ap-upsell-thresh">Upsell Threshold</Label>
          <Input
            id="ap-upsell-thresh"
            type="number"
            value={draft.upsellBonusThreshold}
            onChange={(e) => update({ upsellBonusThreshold: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ap-upsell-pct">Upsell Bonus (%)</Label>
          <Input
            id="ap-upsell-pct"
            type="number"
            value={draft.upsellBonusPercent}
            onChange={(e) => update({ upsellBonusPercent: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ap-min">Min Increase (%)</Label>
          <Input
            id="ap-min"
            type="number"
            value={draft.minPriceIncrease}
            onChange={(e) => update({ minPriceIncrease: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      {/* Attention Threshold */}
      <div className="space-y-1.5">
        <Label htmlFor="ap-attn">Manual Attention Threshold (%)</Label>
        <Input
          id="ap-attn"
          type="number"
          value={draft.manualAttentionThreshold}
          onChange={(e) => update({ manualAttentionThreshold: parseFloat(e.target.value) || 0 })}
        />
      </div>

      {/* Flag Rounding */}
      <div className="space-y-2">
        <Label>Flag Rounding</Label>
        <div className="space-y-1.5">
          {ROUNDING_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-2.5 p-2.5 rounded-md border cursor-pointer transition-colors ${
                draft.flagRounding === opt.value
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-card hover:bg-muted/30"
              }`}
            >
              <input
                type="radio"
                name="ap-flagRounding"
                value={opt.value}
                checked={draft.flagRounding === opt.value}
                onChange={() => update({ flagRounding: opt.value })}
                className="mt-0.5 accent-primary"
              />
              <div>
                <div className="text-sm font-medium text-foreground">{opt.label}</div>
                <div className="text-xs text-muted-foreground">{opt.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

    </div>
  );
}
