import { useEffect, useEffectEvent, useState } from "react";
import { handleError } from "@/lib/errors/errorHandler";
import { AppError } from "@/lib/errors/AppError";
import { bytesToBase64 } from "@/app/study/pdfChunker";
import { encodePictureFile } from "@/app/study/imageEncoder";
import { STUDY_CONFIG } from "@/app/study/studyConst";
import { checkImageSource, findClipboardImage } from "@/app/study/studyImageSqueeze";
import { pickNextWaitingCard, resolveActiveCardKey, shouldCapturePaste } from "@/app/study/studyPasteLogic";
import { useStudyCards } from "@/app/study/useStudyCards";

/**
 * Shrinks a picture and attaches it to a card. No listener and no target: a row that only replaces
 * its own picture uses this. Resolves true once the picture is saved.
 */
export function usePictureAttach() {
  const { attachFigure } = useStudyCards();
  const [isWorking, setIsWorking] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  async function attachFile({ file, cardKey }: { file: File; cardKey: string }): Promise<boolean> {
    setLastError(null);
    const sourceProblem = checkImageSource({ type: file.type, size: file.size, config: STUDY_CONFIG.images });
    if (sourceProblem !== null) {
      setLastError(sourceProblem);
      return false;
    }
    setIsWorking(true);
    try {
      const squeezed = await encodePictureFile(file);
      if (!squeezed.ok) {
        setLastError(squeezed.message);
        return false;
      }
      const { image } = squeezed;
      const result = await attachFigure({
        cardKey,
        dataBase64: bytesToBase64(image.bytes),
        widthPx: image.widthPx,
        heightPx: image.heightPx,
      });
      // The thunk reports its own failure (a toast), so only a success counts.
      return result.meta.requestStatus === "fulfilled";
    } catch (e) {
      handleError(
        e instanceof AppError ? e : new AppError({ message: "The picture could not be attached.", type: "UNKNOWN_ERROR" }),
      );
      return false;
    } finally {
      setIsWorking(false);
    }
  }

  return { attachFile, isWorking, lastError };
}

/**
 * Attaches a pasted, dropped or chosen picture to the active card, then moves to the next card that
 * is waiting for one. The paste listener is on the document, so snip, Ctrl+V, snip, Ctrl+V works
 * without clicking anywhere. It stands down while the admin is typing in a field. Use it once, in the
 * panel that owns the waiting list.
 */
export function usePicturePaste({ waitingCardKeys }: { waitingCardKeys: string[] }) {
  const { attachFile, isWorking, lastError } = usePictureAttach();
  const [chosenCardKey, setChosenCardKey] = useState<string | null>(null);

  // Derived, not synced in an effect: a card that stopped waiting falls back to the first one that does.
  const activeCardKey = resolveActiveCardKey({ activeCardKey: chosenCardKey, waitingCardKeys });

  async function attachAndAdvance({ file, cardKey }: { file: File; cardKey: string }) {
    const saved = await attachFile({ file, cardKey });
    if (saved) setChosenCardKey(pickNextWaitingCard({ waitingCardKeys, finishedCardKey: cardKey }));
  }

  // An effect event always sees the latest card and list without re-subscribing the listener on every change.
  const onPaste = useEffectEvent((event: ClipboardEvent) => {
    if (activeCardKey === null || isWorking || !event.clipboardData) return;
    const file = findClipboardImage(Array.from(event.clipboardData.items));
    const target = event.target instanceof HTMLElement ? event.target : null;
    const capture = shouldCapturePaste({
      targetTag: target?.tagName ?? null,
      isContentEditable: target?.isContentEditable ?? false,
      hasPictureOnClipboard: file !== null,
    });
    if (!capture || file === null) return;
    event.preventDefault();
    void attachAndAdvance({ file, cardKey: activeCardKey });
  });

  useEffect(() => {
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  return {
    activeCardKey,
    isWorking,
    lastError,
    chooseCard: setChosenCardKey,
    attachChosenFile: (file: File) => {
      if (activeCardKey !== null) void attachAndAdvance({ file, cardKey: activeCardKey });
    },
  };
}
