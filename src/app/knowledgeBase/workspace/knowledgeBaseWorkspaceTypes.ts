/** The three views of the editor column. Selecting a topic or a document opens its tab. */
export type EditorTab = "topic" | "document" | "approval";

/** What the document column lists: only the documents tagged with the open topic, or all of them. */
export type DetailListScope = "openTopic" | "all";
