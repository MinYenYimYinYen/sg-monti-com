"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { Plus } from "lucide-react";
import { Button } from "@/style/components/button";
import { priceIncreaseSettingsSelect } from "@/app/priceIncrease/settings/settingsSelect";
import { seasonIncreasesSelect } from "@/app/priceIncrease/seasonIncreases/seasonIncreasesSelect";
import { priceIncreaseConfigSelect } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSelect";
import { priceIncreaseConfigActions } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSlice";
import { priceIncreaseSettingsActions } from "@/app/priceIncrease/settings/settingsSlice";
import { PriceIncreaseSettingsDoc } from "@/app/priceIncrease/settings/PriceIncreaseSettingsTypes";
import { SettingsSheet } from "@/app/priceIncrease/config/_components/SettingsSheet";

export function SettingsSection() {
  const dispatch = useAppDispatch();
  const storedSettings = useSelector(priceIncreaseSettingsSelect.storedSettings);
  const seasonDocs = useSelector(seasonIncreasesSelect.docs);
  const deleteConfirmId = useSelector(priceIncreaseConfigSelect.settingsDeleteConfirmId);

  const handleNew = () => {
    const newSettings: PriceIncreaseSettingsDoc = {
      settingsId: crypto.randomUUID(),
      label: "",
      isActive: false,
      seasonIncreasesId: "",
      progCodeId: "",
      maxIncreaseNow: 0,
      maxIncreaseEver: 0,
      ongoingIncrease: 0,
      upsellBonusThreshold: 0,
      upsellBonusPercent: 0,
      minPriceIncrease: 0,
      manualAttentionThreshold: 0,
      flagRounding: "round",
      createdAt: "",
      updatedAt: "",
    };
    dispatch(priceIncreaseConfigActions.openSettingsSheet(newSettings));
  };

  const handleEdit = (doc: PriceIncreaseSettingsDoc) => {
    dispatch(priceIncreaseConfigActions.openSettingsSheet(doc));
  };

  const handleSetActive = (settingsId: string) => {
    dispatch(
      priceIncreaseSettingsActions.setActivePriceIncreaseSettings({
        params: { settingsId },
        config: { loadingMsg: "Activating settings..." },
      }),
    );
  };

  const handleDeleteConfirm = (settingsId: string) => {
    dispatch(priceIncreaseConfigActions.setSettingsDeleteConfirm(settingsId));
  };

  const handleDeleteCancel = () => {
    dispatch(priceIncreaseConfigActions.setSettingsDeleteConfirm(null));
  };

  const handleDeleteExecute = (settingsId: string) => {
    dispatch(
      priceIncreaseSettingsActions.removePriceIncreaseSettings({
        params: { settingsId },
        config: { loadingMsg: "Deleting settings..." },
      }),
    );
    dispatch(priceIncreaseConfigActions.setSettingsDeleteConfirm(null));
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Price Increase Settings</h2>
        <Button size="sm" variant="primary" intensity="soft" onClick={handleNew}>
          <Plus className="w-3.5 h-3.5" />
          New
        </Button>
      </div>

      <div className="space-y-2">
        {storedSettings.length === 0 && (
          <p className="text-xs text-muted-foreground">No settings configured yet.</p>
        )}
        {storedSettings.map((doc) => (
          <div
            key={doc.settingsId}
            className={`rounded-lg border p-3 flex items-start justify-between gap-3 ${
              doc.isActive ? "bg-accent/10 border-accent/30" : "bg-card border-border"
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-foreground truncate">{doc.label}</span>
                {doc.isActive && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-accent/20 text-accent font-medium shrink-0">
                    Active
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground space-x-3">
                <span>Code: {doc.progCodeId || "—"}</span>
                <span>Max now: {doc.maxIncreaseNow}%</span>
                <span>Max ever: {doc.maxIncreaseEver}%</span>
                <span>Rounding: {doc.flagRounding}</span>
                <span>Plan: {seasonDocs.find((s) => s.seasonIncreasesId === doc.seasonIncreasesId)?.label || "—"}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {!doc.isActive && (
                <Button
                  size="sm"
                  variant="accent"
                  intensity="ghost"
                  onClick={() => handleSetActive(doc.settingsId)}
                >
                  Set Active
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                intensity="ghost"
                onClick={() => handleEdit(doc)}
              >
                Edit
              </Button>
              {deleteConfirmId === doc.settingsId ? (
                <>
                  <Button
                    size="sm"
                    variant="destructive"
                    intensity="solid"
                    onClick={() => handleDeleteExecute(doc.settingsId)}
                  >
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    intensity="ghost"
                    onClick={handleDeleteCancel}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="destructive"
                  intensity="ghost"
                  onClick={() => handleDeleteConfirm(doc.settingsId)}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <SettingsSheet />
    </section>
  );
}
