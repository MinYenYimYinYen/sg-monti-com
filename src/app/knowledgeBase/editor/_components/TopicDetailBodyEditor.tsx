"use client";

import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { cn } from "@/style/utils";
import { EditorToolbar } from "@/lib/tiptap/EditorToolbar";
import { buildRichTextExtensions } from "@/lib/tiptap/richTextExtensions";
import { useTopicEditor } from "@/app/knowledgeBase/editor/useTopicEditor";

/**
 * The document body. It takes its content once, when it mounts, and writes every change to the
 * draft. The parent keys it on the draft version so opening another document remounts it.
 *
 * TipTap re-serialises the HTML it is given (whitespace, empty paragraphs), so its output is rarely
 * byte-identical to what is stored, and the unsaved-changes check compares strings. When the editor's
 * HTML is back to what it produced on load, the draft gets the stored HTML again, so opening a document
 * or undoing every edit is not reported as a change.
 */
export function TopicDetailBodyEditor({ initialHtml, disabled }: { initialHtml: string; disabled: boolean }) {
  const { editTopicDetail } = useTopicEditor();
  /** What the editor serialises right after loading `initialHtml`. Null until the editor exists. */
  const loadedHtmlRef = useRef<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: buildRichTextExtensions(),
    content: initialHtml,
    editable: !disabled,
    editorProps: {
      attributes: {
        "aria-label": "Document content",
        class: "prose prose-sm max-w-none min-h-[280px] focus:outline-none p-4 prose-p:my-1 prose-p:leading-snug",
      },
      // Color is lost when the desktop app turns this into text for Claude, so pasted color is dropped.
      transformPastedHTML(html) {
        return html.replace(/color\s*:[^;"]*/gi, "");
      },
    },
    onCreate({ editor: createdEditor }) {
      loadedHtmlRef.current = createdEditor.getHTML();
    },
    onUpdate({ editor: updatedEditor }) {
      const html = updatedEditor.getHTML();
      editTopicDetail({ contentHtml: html === loadedHtmlRef.current ? initialHtml : html });
    },
  });

  // `false`: a change to the editable flag is not a content change, and the update it would emit
  // makes the draft look edited the moment the document opens.
  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);

  return (
    <div className={cn("rounded-md border border-input bg-card", disabled && "opacity-60")}>
      {/* Opaque wrapper: the toolbar's own background is translucent, and scrolled text would show through. */}
      <div className="sticky top-0 z-10 rounded-t-md bg-card">
        <EditorToolbar editor={editor} disabled={disabled} />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
