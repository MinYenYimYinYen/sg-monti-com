"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { Pencil, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/style/components/sheet";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { priceIncreaseConfigSelect } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSelect";
import { priceIncreaseConfigActions } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSlice";
import { priceIncreaseSettingsActions } from "@/app/priceIncrease/settings/settingsSlice";
import { seasonIncreasesSelect } from "@/app/priceIncrease/seasonIncreases/seasonIncreasesSelect";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { FlagRounding } from "@/app/priceIncrease/settings/PriceIncreaseSettingsTypes";
import { InlinePlanEditor } from "@/app/priceIncrease/config/_components/InlinePlanEditor";

export function SettingsSheet() {
  const dispatch = useAppDispatch();
  const draft = useSelector(priceIncreaseConfigSelect.settingsDraft);
  const isOpen = useSelector(priceIncreaseConfigSelect.settingsSheetOpen);
  const isNew = draft?.createdAt === "";
  const progCodes = useSelector(progServSelect.progCodes);
  const seasonDocs = useSelector(seasonIncreasesSelect.docs);
  const inlinePlanIsOpen = useSelector(priceIncreaseConfigSelect.inlinePlanIsOpen);

  // The currently selected season doc (for the Edit button)
  const selectedSeasonDoc = seasonDocs.find((d) => d.seasonIncreasesId === draft?.seasonIncreasesId) ?? null;

  const handleClose = () => {
    dispatch(priceIncreaseConfigActions.closeSettingsSheet());
  };

  const handleSave = () => {
    if (!draft) return;
    dispatch(
      priceIncreaseSettingsActions.upsertPriceIncreaseSettings({
        params: draft,
        config: { loadingMsg: isNew ? "Creating settings..." : "Saving settings..." },
      }),
    );
    dispatch(priceIncreaseConfigActions.closeSettingsSheet());
  };

  const update = (partial: Parameters<typeof priceIncreaseConfigActions.updateSettingsDraft>[0]) => {
    dispatch(priceIncreaseConfigActions.updateSettingsDraft(partial));
  };

  const handleNewPlan = () => {
    dispatch(priceIncreaseConfigActions.openInlinePlanNew());
  };

  const handleEditPlan = () => {
    if (selectedSeasonDoc) {
      dispatch(priceIncreaseConfigActions.openInlinePlanEdit(selectedSeasonDoc));
    }
  };

  const handlePlanSaved = (seasonIncreasesId: string) => {
    // Auto-select the newly saved plan in the settings draft
    update({ seasonIncreasesId });
  };

  if (!draft) return null;

  const roundingOptions: { value: FlagRounding; label: string; description: string }[] = [
    { value: "round", label: "Round", description: "Nearest flag — least aggressive on average" },
    { value: "ceil", label: "Ceil", description: "Next higher flag — more aggressive" },
    { value: "floor", label: "Floor", description: "Next lower flag — less aggressive" },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <SheetContent side="right" className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{isNew ? "New Settings" : `Edit: ${draft.label}`}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Label */}
          <div className="space-y-1.5">
            <Label htmlFor="s-label">Label</Label>
            <Input
              id="s-label"
              value={draft.label}
              onChange={(e) => update({ label: e.target.value })}
              placeholder="e.g. Moderate 2026"
            />
          </div>

          {/* Program */}
          <div className="space-y-1.5">
            <Label htmlFor="s-prog">Program</Label>
            <select
              id="s-prog"
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
            <Label htmlFor="s-season-id">Increase Plan</Label>
            <div className="flex gap-2">
              <select
                id="s-season-id"
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

            {/* Inline plan editor */}
            <InlinePlanEditor onPlanSaved={handlePlanSaved} />
          </div>

          {/* Caps */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="s-max-now">Max Now (%)</Label>
              <Input
                id="s-max-now"
                type="number"
                value={draft.maxIncreaseNow}
                onChange={(e) => update({ maxIncreaseNow: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-max-ever">Max Ever (%)</Label>
              <Input
                id="s-max-ever"
                type="number"
                value={draft.maxIncreaseEver}
                onChange={(e) => update({ maxIncreaseEver: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-ongoing">Ongoing (%)</Label>
              <Input
                id="s-ongoing"
                type="number"
                value={draft.ongoingIncrease}
                onChange={(e) => update({ ongoingIncrease: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Upsell */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="s-upsell-thresh">Upsell Threshold</Label>
              <Input
                id="s-upsell-thresh"
                type="number"
                value={draft.upsellBonusThreshold}
                onChange={(e) => update({ upsellBonusThreshold: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-upsell-pct">Upsell Bonus (%)</Label>
              <Input
                id="s-upsell-pct"
                type="number"
                value={draft.upsellBonusPercent}
                onChange={(e) => update({ upsellBonusPercent: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-min">Min Increase (%)</Label>
              <Input
                id="s-min"
                type="number"
                value={draft.minPriceIncrease}
                onChange={(e) => update({ minPriceIncrease: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Attention Threshold */}
          <div className="space-y-1.5">
            <Label htmlFor="s-attn">Manual Attention Threshold (%)</Label>
            <Input
              id="s-attn"
              type="number"
              value={draft.manualAttentionThreshold}
              onChange={(e) => update({ manualAttentionThreshold: parseFloat(e.target.value) || 0 })}
            />
          </div>

          {/* Flag Rounding */}
          <div className="space-y-2">
            <Label>Flag Rounding</Label>
            <div className="space-y-1.5">
              {roundingOptions.map((opt) => (
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
                    name="flagRounding"
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

        <SheetFooter className="mt-6 flex gap-2 justify-end">
          <Button variant="outline" intensity="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            intensity="solid"
            onClick={handleSave}
            disabled={!draft.label || !draft.progCodeId || !draft.seasonIncreasesId}
          >
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
