export type TopicDraft = {
  topicKey: string;
  name: string;
  description: string;
  /** A new draft has an editable key. Saving one whose key already exists is blocked in the UI. */
  isNew: boolean;
};

/** The document being edited. Its tags are its identity, so they are only editable while `isNew`. */
export type TopicDetailDraft = {
  topicKeys: string[];
  title: string;
  contentHtml: string;
  isNew: boolean;
  /**
   * The head version this draft was opened from, null for a new document. Sent with the save so the
   * server can refuse it when someone else has saved a newer version in the meantime.
   */
  baseVersion: number | null;
};
