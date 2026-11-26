import { api } from "@/lib/api/api";
import type { DataResponse } from "@/lib/api/types/responses";
import type { OpMap } from "@/lib/api/types/rpcUtils";
import type { StudyContract } from "@/app/study/api/StudyContract";
import type { FigureResult } from "@/app/study/StudyApiTypes";

// A small module-level cache of pictures by key, outside Redux on purpose: they are base64 strings,
// and a card's picture never changes (a new picture has a new key). Repeat views cost nothing, and
// two cards that share a picture fetch it once. Which op to call decides the audience: the admin
// screen reads drafts too, a student reads only what is published.

export type FigureAudience = "admin" | "student";

const MAX_CACHED_FIGURES = 60;
const cachedDataUrls = new Map<string, string>();
const inFlight = new Map<string, Promise<string>>();

function remember({ imageKey, dataUrl }: { imageKey: string; dataUrl: string }) {
  cachedDataUrls.set(imageKey, dataUrl);
  // Oldest first, so the cache stays small however long a session runs.
  while (cachedDataUrls.size > MAX_CACHED_FIGURES) {
    const oldest = cachedDataUrls.keys().next().value;
    if (oldest === undefined) break;
    cachedDataUrls.delete(oldest);
  }
}

export function getCachedFigure(imageKey: string): string | null {
  return cachedDataUrls.get(imageKey) ?? null;
}

async function fetchFigure({ imageKey, audience }: { imageKey: string; audience: FigureAudience }): Promise<string> {
  const body: OpMap<StudyContract> = {
    op: audience === "admin" ? "getDraftFigure" : "getPublishedFigure",
    imageKey,
  };
  const response = await api<DataResponse<FigureResult>>("/study/api", { method: "POST", body });
  if (!response.success) throw new Error(response.message);
  remember({ imageKey, dataUrl: response.payload.dataUrl });
  return response.payload.dataUrl;
}

/** The picture as a data URL, from the cache when it is there. A request already under way is shared. */
export function loadFigure({ imageKey, audience }: { imageKey: string; audience: FigureAudience }): Promise<string> {
  const cached = getCachedFigure(imageKey);
  if (cached !== null) return Promise.resolve(cached);

  const pending = inFlight.get(imageKey);
  if (pending) return pending;

  const request = fetchFigure({ imageKey, audience }).finally(() => inFlight.delete(imageKey));
  inFlight.set(imageKey, request);
  return request;
}
