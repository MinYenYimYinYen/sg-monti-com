/**
 * One way to compare the head of a document with an older version. The head is always the newer side.
 * `isPrevious` and `isApproved` are both true when the version before the head is also the approved one,
 * so the reviewer sees one choice instead of two identical ones.
 */
export type VersionComparison = {
  olderVersion: number;
  label: string;
  isPrevious: boolean;
  isApproved: boolean;
};

/** A title that differs between two versions, trimmed the way a save trims it. */
export type TitleChange = {
  oldTitle: string;
  newTitle: string;
};
