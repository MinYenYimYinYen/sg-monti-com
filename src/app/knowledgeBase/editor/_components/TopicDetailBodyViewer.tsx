"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { buildRichTextExtensions } from "@/lib/tiptap/richTextExtensions";

/**
 * A document's body, read only. It renders the HTML it is given with the same extensions as the editor,
 * and touches no draft, so it is safe to show next to unsaved edits. Key it on the version so another
 * version remounts it.
 */
export function TopicDetailBodyViewer({ html }: { html: string }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: buildRichTextExtensions(),
    content: html,
    editable: false,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none p-4 prose-p:my-1 prose-p:leading-snug",
      },
    },
  });

  return (
    <div className="rounded-md border border-input bg-card">
      <EditorContent editor={editor} />
    </div>
  );
}
