"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { priceIncreaseConfigSelect } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSelect";
import { priceIncreaseConfigActions } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSlice";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import {
  describeSeasonPair,
  normalizeSeasonPair,
} from "@/app/priceIncrease/_lib/priceIncreaseFuncs";
import { SeasonStepperRow } from "@/app/priceIncrease/_components/SeasonStepperRow";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/style/components/dialog";
import { Button } from "@/style/components/button";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";

export const PRICE_INCREASE_SEASON_KEY = "priceIncrease.targetSeason";
export const PRICE_INCREASE_SEASON_SOURCE_KEY = "priceIncrease.seasonSource";
export const SEASON_EXPIRY_MONTHS = 6;

type SeasonPair = { seasonSource: number; targetSeason: number };

/**
 * Header control for the season pair. Edits happen on a local draft; nothing
 * reaches Redux (or reloads customer data) until Apply. Valid pairs are only
 * target === source or target === source + 1.
 */
export function SeasonControl() {
  const dispatch = useAppDispatch();
  const seasonSource = useSelector(priceIncreaseConfigSelect.seasonSource);
  const targetSeason = useSelector(priceIncreaseConfigSelect.targetSeason);
  const globalSeason = useSelector(globalSettingsSelect.season);
  const { setValue: persistTarget, clear: clearTarget } = useLocalStorage<number>(
    PRICE_INCREASE_SEASON_KEY,
    { expiryMonths: SEASON_EXPIRY_MONTHS },
  );
  const { setValue: persistSource, clear: clearSource } = useLocalStorage<number>(
    PRICE_INCREASE_SEASON_SOURCE_KEY,
    { expiryMonths: SEASON_EXPIRY_MONTHS },
  );

  // null = dialog closed. Opening seeds the draft from Redux; closing discards it.
  const [draft, setDraft] = useState<SeasonPair | null>(null);

  const isOverridden = seasonSource !== globalSeason || targetSeason !== globalSeason;
  const sourceChanged = draft !== null && draft.seasonSource !== seasonSource;
  const isDirty = draft !== null && (sourceChanged || draft.targetSeason !== targetSeason);

  function closeDialog() {
    setDraft(null);
  }

  function handleApply() {
    if (!draft) return;
    const pair = normalizeSeasonPair(draft);
    const sourceOverride = pair.seasonSource === globalSeason ? null : pair.seasonSource;
    const targetOverride = pair.targetSeason === globalSeason ? null : pair.targetSeason;

    dispatch(priceIncreaseConfigActions.setSeasonOverrides({
      seasonSourceOverride: sourceOverride,
      targetSeasonOverride: targetOverride,
    }));

    if (sourceOverride === null) clearSource();
    else persistSource(sourceOverride);
    if (targetOverride === null) clearTarget();
    else persistTarget(targetOverride);

    closeDialog();
  }

  const triggerLabel =
    seasonSource === targetSeason ? `${targetSeason}` : `${seasonSource} → ${targetSeason}`;

  return (
    <>
      <button
        onClick={() => setDraft({ seasonSource, targetSeason })}
        className={`flex items-center gap-1 px-2 py-1 rounded transition-colors hover:bg-accent/10 ${
          isOverridden ? "text-secondary" : "text-foreground/70"
        }`}
      >
        <span className="text-2xl font-bold tabular-nums leading-none">{triggerLabel}</span>
        <span className="text-xs text-foreground/40 self-end mb-0.5">▾</span>
      </button>

      <Dialog open={draft !== null} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Planning Seasons</DialogTitle>
            <DialogDescription>
              Choose the season to project from and the season to project to.
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="flex flex-col gap-4">
              <SeasonStepperRow
                label="Projecting from"
                hint="Season whose programs are loaded"
                value={draft.seasonSource}
                canDecrease
                canIncrease
                onDecreaseAction={() => setDraft(normalizeSeasonPair({ ...draft, seasonSource: draft.seasonSource - 1 }))}
                onIncreaseAction={() => setDraft(normalizeSeasonPair({ ...draft, seasonSource: draft.seasonSource + 1 }))}
              />
              <SeasonStepperRow
                label="Projecting to"
                hint="Season being priced"
                value={draft.targetSeason}
                canDecrease={draft.targetSeason === draft.seasonSource + 1}
                canIncrease={draft.targetSeason === draft.seasonSource}
                onDecreaseAction={() => setDraft({ ...draft, targetSeason: draft.seasonSource })}
                onIncreaseAction={() => setDraft({ ...draft, targetSeason: draft.seasonSource + 1 })}
              />

              <p className="rounded bg-accent/10 p-3 text-sm text-foreground">
                {describeSeasonPair(draft)}
              </p>

              {(draft.seasonSource !== globalSeason || draft.targetSeason !== globalSeason) && (
                <p className="text-xs text-foreground/40">Default season: {globalSeason}</p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="primary" intensity="ghost" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={!isDirty}>
              {sourceChanged ? "Apply & Reload" : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
