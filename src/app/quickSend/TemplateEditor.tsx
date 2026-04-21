"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import Mention from "@tiptap/extension-mention";
import { useAppDispatch } from "@/lib/hooks/redux";
import { quickSendActions } from "./quickSendSlice";
import { buildMentionSuggestion } from "./mentionSuggestion";

export function TemplateEditor() {
  const dispatch = useAppDispatch();

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Mention.configure({
        HTMLAttributes: {
          class:
            "inline-block rounded bg-primary/10 px-1 py-0.5 text-primary text-sm font-medium",
        },
        renderLabel({ node }) {
          return `@${node.attrs.label ?? node.attrs.id}`;
        },
        suggestion: buildMentionSuggestion(),
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-full p-4",
      },
    },
    onUpdate({ editor: ed }) {
      dispatch(quickSendActions.setTemplateHtml(ed.getHTML()));
    },
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border bg-muted/30 px-4 py-1.5">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Template — type @ to insert variables
        </span>
      </div>
      <div className="flex-1 overflow-y-auto bg-card">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}
