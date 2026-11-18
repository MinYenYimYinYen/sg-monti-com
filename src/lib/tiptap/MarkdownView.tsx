"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { Markdown } from "@tiptap/markdown";
import { buildRichTextExtensions } from "@/lib/tiptap/richTextExtensions";

/**
 * Markdown, read only. Rendered through TipTap with the shared rich text extensions, so the text is
 * parsed into the editor's schema and never injected as raw markup. It takes its content once, when
 * it mounts, so the parent keys it on whatever identifies the message.
 */
export function MarkdownView({ markdown }: { markdown: string }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [...buildRichTextExtensions(), Markdown],
    content: markdown,
    contentType: "markdown",
    editable: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none prose-p:my-1 prose-p:leading-snug prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-li:leading-snug prose-blockquote:my-1 prose-hr:my-2",
      },
    },
  });

  return <EditorContent editor={editor} />;
}
