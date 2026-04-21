"use client";

import { useEffect, useRef, useState } from "react";
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
import { useSelector } from "react-redux";
import { quickSendSelect } from "./quickSendSelect";
import { Button } from "@/style/components/button";
import { Check, Copy } from "lucide-react";
import type { QSVariableKey } from "./QuickSendTypes";

export function PreviewEditor() {
  const previewHtml = useSelector(quickSendSelect.previewHtml);
  const resolvedVariables = useSelector(quickSendSelect.resolvedVariables);
  const unfulfilledVars = useSelector(quickSendSelect.unfulfilledVars);
  const isReady = unfulfilledVars.size === 0;
  const [copied, setCopied] = useState(false);

  // Track the last templateHtml that was used to set content, so we know
  // when to do a full setContent vs. a targeted mention-label update.
  const lastTemplateRef = useRef<string>("");

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
      Highlight.configure({ multicolor: true }),
      // Mention extension with no suggestion — preview renders resolved values as plain text.
      // Unfulfilled variables are replaced with styled <mark> tags by selectPreviewHtml
      // (the Highlight extension preserves inline styles on <mark> through setContent).
      Mention.configure({
        HTMLAttributes: {},
        renderLabel({ node }) {
          return node.attrs.label ?? node.attrs.id;
        },
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-full p-4",
      },
    },
  });

  // When previewHtml changes (template structure changed), replace content entirely.
  useEffect(() => {
    if (!editor || !previewHtml) return;
    if (previewHtml === lastTemplateRef.current) return;
    lastTemplateRef.current = previewHtml;
    editor.commands.setContent(previewHtml);
  }, [editor, previewHtml]);

  // When only variable values change, update mention node labels in place
  // so the user's surrounding text edits are preserved.
  // Only update nodes that have a resolved value — unfulfilled nodes are handled
  // by the selectPreviewHtml selector via setContent (which sets {{varName}} + data-unfulfilled).
  useEffect(() => {
    if (!editor) return;
    const { state, view } = editor;
    const { tr } = state;
    let changed = false;

    state.doc.descendants((node, pos) => {
      if (node.type.name === "mention") {
        const id = node.attrs.id as QSVariableKey;
        const resolved = resolvedVariables[id];
        if (!resolved) return; // skip — selector handles unfulfilled via setContent
        if (node.attrs.label !== resolved) {
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            label: resolved,
          });
          changed = true;
        }
      }
    });

    if (changed) view.dispatch(tr);
  }, [editor, resolvedVariables]);

  const handleCopy = async () => {
    if (!editor) return;
    const html = editor.getHTML();
    const text = editor.getText();
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      }),
    ]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/30 px-4 py-1.5">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Preview — edit to individualize
        </span>
        <Button
          size="sm"
          variant={copied ? "accent" : "primary"}
          intensity="soft"
          onClick={handleCopy}
          disabled={!isReady}
          className="h-6 gap-1 px-2 text-xs"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto bg-card">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}
