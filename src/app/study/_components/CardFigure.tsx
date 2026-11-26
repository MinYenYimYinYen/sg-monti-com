"use client";

import { useEffect, useState } from "react";
import { getCachedFigure, loadFigure, type FigureAudience } from "@/app/study/figureCache";

/**
 * A card's picture. It loads by key and shows what is cached at once. A failed load shows a short
 * line instead of a broken image. The parent puts a `key` on it, so a card with a different picture
 * starts fresh instead of syncing state in an effect.
 */
export function CardFigure({
  imageKey,
  audience,
  className,
}: {
  imageKey: string;
  audience: FigureAudience;
  className?: string;
}) {
  const [loaded, setLoaded] = useState<{ imageKey: string; dataUrl: string } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  useEffect(() => {
    if (getCachedFigure(imageKey) !== null) return;
    let isCurrent = true;
    loadFigure({ imageKey, audience })
      .then((dataUrl) => {
        if (isCurrent) setLoaded({ imageKey, dataUrl });
      })
      .catch(() => {
        if (isCurrent) setFailedKey(imageKey);
      });
    return () => {
      isCurrent = false;
    };
  }, [imageKey, audience]);

  const dataUrl = getCachedFigure(imageKey) ?? (loaded?.imageKey === imageKey ? loaded.dataUrl : null);
  if (failedKey === imageKey) return <p className="text-sm text-destructive">The picture could not be loaded.</p>;
  if (dataUrl === null) return <p className="text-sm text-muted-foreground">Loading picture...</p>;
  // A data URL from our own server, so next/image has nothing to optimize.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dataUrl} alt="" className={className ?? "max-h-72 max-w-full rounded-md border border-border"} />;
}
