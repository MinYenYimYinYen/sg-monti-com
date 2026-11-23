import { createDocument, getSchema } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Change } from "@tiptap/pm/changeset";
import { buildRichTextExtensions } from "@/lib/tiptap/richTextExtensions";
import { diffDocuments } from "@/app/knowledgeBase/diff/documentDiffLogic";

export type HtmlDiff = {
  oldDoc: ProseMirrorNode;
  newDoc: ProseMirrorNode;
  changes: readonly Change[];
};

/**
 * Parses both bodies with the editor's own schema, the same way TipTap parses a body when it opens one,
 * so whitespace and empty-paragraph noise that the editor would drop is not reported as a change.
 * This is the only part of the diff that needs a DOM (the HTML parser), so call it in the browser.
 */
export function diffHtml({ oldHtml, newHtml }: { oldHtml: string; newHtml: string }): HtmlDiff {
  const schema = getSchema(buildRichTextExtensions());
  const oldDoc = createDocument(oldHtml, schema);
  const newDoc = createDocument(newHtml, schema);
  return { oldDoc, newDoc, changes: diffDocuments({ oldDoc, newDoc }) };
}
