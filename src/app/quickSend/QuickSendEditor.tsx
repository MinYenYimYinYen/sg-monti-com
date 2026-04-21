"use client";

import { useEffect, useState } from "react";
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
import { Button } from "@/style/components/button";
import { Check, Copy } from "lucide-react";
import type { QSVariableKey } from "./QuickSendTypes";
import { buildMentionSuggestion } from "./mentionSuggestion";

type Props = {
  /** Called whenever the set of active @variables in the editor changes. */
  onVariablesChange: (vars: Set<QSVariableKey>) => void;
  /** Current resolved values for each variable key — updates mention display text. */
  variables: Partial<Record<QSVariableKey, string>>;
};

/** Scans the editor JSON for mention nodes and returns the set of active variable keys. */
function extractActiveVars(doc: object): Set<QSVariableKey> {
  const vars = new Set<QSVariableKey>();
  const walk = (node: Record<string, unknown>) => {
    if (node.type === "mention" && typeof node.attrs === "object" && node.attrs !== null) {
      const id = (node.attrs as Record<string, unknown>).id;
      if (id === "name" || id === "size") vars.add(id);
    }
    if (Array.isArray(node.content)) {
      (node.content as Record<string, unknown>[]).forEach(walk);
    }
  };
  walk(doc as Record<string, unknown>);
  return vars;
}

export function QuickSendEditor({ onVariablesChange, variables }: Props) {
  const [copied, setCopied] = useState(false);

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
      const doc = ed.getJSON();
      onVariablesChange(extractActiveVars(doc));
    },
  });

  // When resolved variable values change, update mention node labels in the editor.
  useEffect(() => {
    if (!editor) return;
    const { state, view } = editor;
    const { tr } = state;
    let changed = false;

    state.doc.descendants((node, pos) => {
      if (node.type.name === "mention") {
        const id = node.attrs.id as QSVariableKey;
        const resolved = variables[id];
        const newLabel = resolved ?? id;
        if (node.attrs.label !== newLabel) {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, label: newLabel });
          changed = true;
        }
      }
    });

    if (changed) view.dispatch(tr);
  }, [editor, variables]);

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
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-end border-b border-border bg-card px-3 py-2 shrink-0">
        <Button
          size="sm"
          variant={copied ? "accent" : "primary"}
          intensity="soft"
          onClick={handleCopy}
          className="gap-1.5"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-y-auto bg-card">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}
