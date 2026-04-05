"use client";

import React, { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/style/components/button";
import { Check, Copy, RotateCcw } from "lucide-react";
import { cn } from "@/style/utils";

interface OutputGroupProps {
  /** Resolved HTML from the template engine. Treated as the "original" for edit detection. */
  html: string;
  label?: string;
}

/**
 * Renders a single resolved output group as an editable Tiptap editor.
 * - Tracks whether the user has modified the content from the resolved original.
 * - Shows an "EDITED" badge and a Reset button when modified.
 * - Copy button copies the current editor content (including any edits).
 * - Resets to the resolved original when `html` prop changes (e.g. choice switch).
 */
export function OutputGroup({ html, label }: OutputGroupProps) {
  const [copied, setCopied] = useState(false);
  // null = not edited; string = user's current edited HTML
  const [editedHtml, setEditedHtml] = useState<string | null>(null);

  const isEdited = editedHtml !== null;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: html,
    editorProps: {
      attributes: {
        class:
          "focus:outline-none text-sm text-foreground min-h-[4rem] px-4 py-3",
      },
    },
    onUpdate: ({ editor: e }) => {
      const current = e.getHTML();
      // Only mark as edited if content actually differs from the resolved original
      setEditedHtml(current !== html ? current : null);
    },
  });

  // When the resolved HTML changes (choice switch, customer change), reset the editor
  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(html);
    setEditedHtml(null);
  }, [html, editor]);

  const handleReset = () => {
    editor?.commands.setContent(html);
    setEditedHtml(null);
  };

  const handleCopy = async () => {
    const htmlContent = editor ? editor.getHTML() : (editedHtml ?? html);
    const textContent = editor ? editor.getText() : (editedHtml ?? html).replace(/<[^>]+>/g, "");
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([htmlContent], { type: "text/html" }),
        "text/plain": new Blob([textContent], { type: "text/plain" }),
      }),
    ]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-1">
      {/* Header row */}
      <div className="flex items-center gap-2 min-h-[1.75rem]">
        {label && (
          <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">
            {label}
          </span>
        )}

        {isEdited && (
          <>
            <span className="text-[10px] font-semibold bg-secondary/20 text-secondary px-1.5 py-0.5 rounded">
              EDITED
            </span>
            <Button
              size="sm"
              variant="outline"
              intensity="ghost"
              onClick={handleReset}
              className="gap-1 h-6 px-2 text-xs"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          </>
        )}

        <Button
          size="sm"
          variant={copied ? "accent" : "primary"}
          intensity="soft"
          onClick={handleCopy}
          className={cn("ml-auto gap-1.5", !label && !isEdited && "self-end")}
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

      {/* Editable Tiptap output */}
      <div
        className={cn(
          "rounded-md border bg-card shadow-sm focus-within:ring-1 focus-within:ring-ring",
          isEdited ? "border-secondary/50" : "border-border",
        )}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
