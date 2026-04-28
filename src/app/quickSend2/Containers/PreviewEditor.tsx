"use client";

import { useEffect, useRef } from "react";
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
import { LineHeight } from "./lineHeightExtension";
import { ParagraphSpacing } from "./paragraphSpacingExtension";
import { useSelector } from "react-redux";
import { qs2Select } from "../quickSendSelect";

type Props = {
  previewHtml: string;
};

export function PreviewEditor({ previewHtml }: Props) {
  const resolvedVariables = useSelector(qs2Select.resolvedVariables);

  const lastPreviewRef = useRef<string>("");

  const editor = useEditor({
    immediatelyRender: false,
    editable: true,
    extensions: [
      StarterKit,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      Color,
      LineHeight,
      ParagraphSpacing,
      Highlight.configure({ multicolor: true }),
      Mention.configure({
        HTMLAttributes: {},
        renderText({ node }) {
          return node.attrs.label ?? node.attrs.id;
        },
        renderHTML({ node, options }) {
          return ["span", options.HTMLAttributes, node.attrs.label ?? node.attrs.id];
        },
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none p-4 prose-p:my-1 prose-p:leading-snug",
      },
    },
  });

  // When previewHtml changes (template structure changed), replace content entirely.
  useEffect(() => {
    if (!editor || !previewHtml) return;
    if (previewHtml === lastPreviewRef.current) return;
    lastPreviewRef.current = previewHtml;
    editor.commands.setContent(previewHtml);
  }, [editor, previewHtml]);

  // When only variable values change, update mention node labels in place
  // so the user's surrounding text edits are preserved.
  useEffect(() => {
    if (!editor) return;
    const { state, view } = editor;
    const { tr } = state;
    let changed = false;

    state.doc.descendants((node, pos) => {
      if (node.type.name === "mention") {
        const id = node.attrs.id as string;
        const resolved = resolvedVariables[id];
        if (!resolved) return;
        if (node.attrs.label !== resolved) {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, label: resolved });
          changed = true;
        }
      }
    });

    if (changed) view.dispatch(tr);
  }, [editor, resolvedVariables]);

  return (
    <div className="bg-card">
      <EditorContent editor={editor} />
    </div>
  );
}
