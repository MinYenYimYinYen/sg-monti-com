"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { EditorToolbar } from "@/lib/tiptap/EditorToolbar";
import { buildRichTextExtensions } from "@/lib/tiptap/richTextExtensions";
import { useTopicEditor } from "@/app/knowledgeBase/editor/useTopicEditor";

/**
 * The document body. It takes its content once, when it mounts, and writes every change to the
 * draft. The parent keys it on the draft version so opening another document remounts it.
 */
export function TopicDetailBodyEditor({ initialHtml, disabled }: { initialHtml: string; disabled: boolean }) {
  const { editTopicDetail } = useTopicEditor();

  const editor = useEditor({
    immediatelyRender: false,
    extensions: buildRichTextExtensions(),
    content: initialHtml,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[280px] focus:outline-none p-4 prose-p:my-1 prose-p:leading-snug",
      },
      // Color is lost when the desktop app turns this into text for Claude, so pasted color is dropped.
      transformPastedHTML(html) {
        return html.replace(/color\s*:[^;"]*/gi, "");
      },
    },
    onUpdate({ editor: updatedEditor }) {
      editTopicDetail({ contentHtml: updatedEditor.getHTML() });
    },
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  return (
    <div className="rounded-md border border-input bg-card">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
