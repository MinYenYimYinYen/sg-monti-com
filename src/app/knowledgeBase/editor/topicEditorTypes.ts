/**
 * The topic being edited. `signalsText` is one signal per line exactly as typed, because turning it
 * into a list on every keystroke would eat a trailing newline. It is normalized only when saving
 * and when checking for changes.
 */
export type TopicDraft = {
  topicKey: string;
  name: string;
  description: string;
  signalsText: string;
  /** A new draft has an editable key. Saving one whose key already exists is blocked in the UI. */
  isNew: boolean;
};

/** The document being edited. Its tags are its identity, so they are only editable while `isNew`. */
export type TopicDetailDraft = {
  topicKeys: string[];
  title: string;
  contentHtml: string;
  isNew: boolean;
};
