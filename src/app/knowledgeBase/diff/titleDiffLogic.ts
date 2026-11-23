import type { TitleChange } from "@/app/knowledgeBase/diff/versionDiffTypes";

/** Titles are compared trimmed, like the unsaved-changes check, so stray spaces are not a difference. */
export function diffTitles({ oldTitle, newTitle }: { oldTitle: string; newTitle: string }): TitleChange | null {
  const trimmedOld = oldTitle.trim();
  const trimmedNew = newTitle.trim();
  return trimmedOld === trimmedNew ? null : { oldTitle: trimmedOld, newTitle: trimmedNew };
}
