// Pure rules for the paste target. Kept free of the DOM so they can be tested.

/** Whether a paste should be taken as a picture for a card, or left alone because the user is typing. */
export function shouldCapturePaste({
  targetTag,
  isContentEditable,
  hasPictureOnClipboard,
}: {
  targetTag: string | null;
  isContentEditable: boolean;
  hasPictureOnClipboard: boolean;
}): boolean {
  if (!hasPictureOnClipboard) return false;
  if (isContentEditable) return false;
  const tag = targetTag?.toLowerCase() ?? "";
  return tag !== "input" && tag !== "textarea" && tag !== "select";
}

/**
 * The card to move to after one gets its picture: the next waiting card in reading order, wrapping
 * to the first if none is after it. Null when nothing else is waiting.
 */
export function pickNextWaitingCard({
  waitingCardKeys,
  finishedCardKey,
}: {
  waitingCardKeys: string[];
  finishedCardKey: string;
}): string | null {
  const others = waitingCardKeys.filter((cardKey) => cardKey !== finishedCardKey);
  if (others.length === 0) return null;
  const position = waitingCardKeys.indexOf(finishedCardKey);
  if (position === -1) return others[0];
  // `others` keeps order, so the first one at or after the finished card's old slot is the next one.
  const after = waitingCardKeys.slice(position + 1).find((cardKey) => cardKey !== finishedCardKey);
  return after ?? others[0];
}

/** Keeps the active card valid when the waiting list changes (a card gets a picture, is deleted, or is unaccepted). */
export function resolveActiveCardKey({
  activeCardKey,
  waitingCardKeys,
}: {
  activeCardKey: string | null;
  waitingCardKeys: string[];
}): string | null {
  if (activeCardKey !== null && waitingCardKeys.includes(activeCardKey)) return activeCardKey;
  return waitingCardKeys[0] ?? null;
}
