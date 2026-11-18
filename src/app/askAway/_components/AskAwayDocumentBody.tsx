"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { buildRichTextExtensions } from "@/lib/tiptap/richTextExtensions";

/**
 * A document body, read only. Rendered through TipTap with the same extensions the author wrote it
 * in, so the HTML is never injected as raw markup. It takes its content once, when it mounts; the
 * parent keys it on the document's version so an edited document remounts.
 */
export function AskAwayDocumentBody({ contentHtml }: { contentHtml: string }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: buildRichTextExtensions(),
    content: contentHtml,
    editable: false,
    editorProps: {
      attributes: { class: "prose prose-sm max-w-none focus:outline-none prose-p:my-1 prose-p:leading-snug" },
    },
  });

  return <EditorContent editor={editor} />;
}
