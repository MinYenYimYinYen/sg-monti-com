"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { buildRichTextExtensions } from "@/lib/tiptap/richTextExtensions";
import { buildVersionDiffExtension } from "@/app/knowledgeBase/diff/buildVersionDiffExtension";

/**
 * The newer body, read only, with what was added highlighted and what was removed shown struck through
 * where it used to be. It takes its content once, so key it on both versions.
 */
export function DiffViewer({ oldHtml, newHtml }: { oldHtml: string; newHtml: string }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [...buildRichTextExtensions(), buildVersionDiffExtension(oldHtml)],
    content: newHtml,
    editable: false,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none p-3 prose-p:my-1 prose-p:leading-snug",
      },
    },
  });

  return (
    <div className="rounded-md border border-input bg-card">
      <EditorContent editor={editor} />
    </div>
  );
}
