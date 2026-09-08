"use client";

import { useSelector } from "react-redux";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { priceIncreaseConfigSelect } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSelect";
import { priceIncreaseConfigActions } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSlice";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";

const LOCAL_STORAGE_KEY = "priceIncrease.targetSeason";
const EXPIRY_MONTHS = 6;

type TargetSeasonStorage = {
  season: number;
  expiresAt: string;
};

function writeToLocalStorage(season: number) {
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + EXPIRY_MONTHS);
  const value: TargetSeasonStorage = { season, expiresAt: expiresAt.toISOString() };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(value));
}

function clearLocalStorage() {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
}

export function TargetSeasonControl() {
  const dispatch = useAppDispatch();
  const targetSeason = useSelector(priceIncreaseConfigSelect.targetSeason);
  const override = useSelector(priceIncreaseConfigSelect.targetSeasonOverride);
  const globalSeason = useSelector(globalSettingsSelect.season);

  const isOverridden = override !== null && override !== globalSeason;

  function handleIncrement() {
    const newSeason = targetSeason + 1;
    dispatch(priceIncreaseConfigActions.setTargetSeasonOverride(newSeason));
    writeToLocalStorage(newSeason);
  }

  function handleDecrement() {
    const newSeason = targetSeason - 1;
    if (newSeason === globalSeason) {
      dispatch(priceIncreaseConfigActions.clearTargetSeasonOverride());
      clearLocalStorage();
    } else {
      dispatch(priceIncreaseConfigActions.setTargetSeasonOverride(newSeason));
      writeToLocalStorage(newSeason);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors hover:bg-accent/10 ${
            isOverridden ? "text-secondary" : "text-foreground/70"
          }`}
        >
          <span className="text-2xl font-bold tabular-nums leading-none">{targetSeason}</span>
          <span className="text-xs text-foreground/40 self-end mb-0.5">▾</span>
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-40 p-3">
        <p className="text-xs text-foreground/40 mb-2">Planning season</p>
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={handleDecrement}
            className="flex items-center justify-center w-8 h-8 rounded border border-border hover:bg-accent/10 text-foreground/60 hover:text-foreground transition-colors"
            aria-label="Decrease season"
          >
            <ChevronDown className="h-4 w-4" />
          </button>

          <span className="text-xl font-bold tabular-nums text-foreground">{targetSeason}</span>

          <button
            onClick={handleIncrement}
            className="flex items-center justify-center w-8 h-8 rounded border border-border hover:bg-accent/10 text-foreground/60 hover:text-foreground transition-colors"
            aria-label="Increase season"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>

        {isOverridden && (
          <p className="text-xs text-foreground/40 mt-2 text-center">
            Default: {globalSeason}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
