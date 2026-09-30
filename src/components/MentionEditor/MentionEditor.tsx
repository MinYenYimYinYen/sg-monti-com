"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import { Eye, EyeOff } from "lucide-react";
import { buildFlatMentionSuggestion } from "./mentionSuggestion";
import type { FlatVars, VarParsers } from "./MentionEditorUtils";
import { MentionEditorUtils } from "./MentionEditorUtils";

type MentionEditorMode = "vars" | "resolved";

type Props<T extends FlatVars> = {
  value: string;
  onChange: (html: string) => void;
  vars: T;
  parsers: VarParsers<T>;
  disabled?: boolean;
  placeholder?: string;
  minHeight?: string;
};

/**
 * A generic tiptap-based text editor that supports @ variable mentions.
 *
 * - T must be a flat record of string | number values (enforced by FlatVars).
 * - Available @ variables are derived from the keys of `vars`.
 * - `parsers` maps each key to a display formatter — TypeScript enforces exhaustiveness.
 *
 * Modes (toggled via the eye icon, top-right):
 * - "resolved" (default): mention chips show their live resolved value from `vars`.
 * - "vars": mention chips show the raw variable name (e.g. @season).
 *
 * Both modes are fully editable. The stored `value` always contains the raw tiptap HTML
 * with mention nodes keyed by variable id — the mode only affects the chip label display.
 *
 * Label updates work by walking the ProseMirror document and patching the `label` attr
 * on every mention node whenever `vars` or `mode` changes. This triggers a real
 * ProseMirror transaction so tiptap re-renders the affected chips correctly.
 */
export function MentionEditor<T extends FlatVars>({
  value,
  onChange,
  vars,
  parsers,
  disabled = false,
  placeholder,
  minHeight = "80px",
}: Props<T>) {
  const [mode, setMode] = useState<MentionEditorMode>("resolved");

  // Ref so the suggestion callback always reads the latest vars without stale captures.
  const varsRef = useRef(vars);
  varsRef.current = vars;

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit,
      Mention.configure({
        HTMLAttributes: {
          class:
            "inline-block rounded bg-primary/10 px-1 py-0.5 text-primary text-sm font-medium",
        },
        renderText({ node }) {
          // Plain-text export always uses the raw variable name.
          return `@${node.attrs.id as string}`;
        },
        renderHTML({ node, options }) {
          // `label` attr is kept up-to-date by the useEffect below.
          // renderHTML just reads it — no refs needed here.
          return [
            "span",
            {
              ...options.HTMLAttributes,
              "data-type": "mention",
              "data-id": node.attrs.id,
              "data-label": node.attrs.id,
            },
            (node.attrs.label as string | null) ?? `@${node.attrs.id as string}`,
          ];
        },
        suggestion: buildFlatMentionSuggestion({
          getVars: () => varsRef.current,
        }),
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none px-3 py-2 prose-p:my-0.5 prose-p:leading-snug",
        style: `min-height: ${minHeight}`,
        ...(placeholder ? { "data-placeholder": placeholder } : {}),
      },
    },
    onUpdate({ editor: ed }) {
      onChange(ed.getHTML());
    },
  });

  // Sync editor content when `value` changes externally (e.g. loading a saved config).
  // Guard against the editor's own onUpdate triggering a loop by comparing HTML first.
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  // Keep editable state in sync with the disabled prop.
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  // When vars or mode changes, walk all mention nodes and patch their `label` attr.
  // Batching all changes into a single transaction avoids multiple re-renders.
  // This is the correct way to update chip display in tiptap — renderHTML only fires
  // when a node's attrs change, not on React re-renders.
  useEffect(() => {
    if (!editor) return;

    let tr = editor.state.tr;
    let changed = false;

    editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== "mention") return;

      const id = node.attrs.id as string;
      const newLabel =
        mode === "resolved"
          ? MentionEditorUtils.resolveOne(id, vars, parsers)
          : `@${id}`;

      if (node.attrs.label !== newLabel) {
        tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, label: newLabel });
        changed = true;
      }
    });

    if (changed) {
      // Dispatch without triggering onUpdate so we don't write the label into stored HTML.
      editor.view.dispatch(tr.setMeta("addToHistory", false));
    }
  }, [editor, vars, parsers, mode]);

  return (
    <div
      className={`relative rounded-md border border-input bg-card shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {/* Mode toggle — eye icon top-right */}
      <button
        type="button"
        title={mode === "resolved" ? "Show variable names" : "Show resolved values"}
        className="absolute top-1.5 right-1.5 z-10 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setMode((m) => (m === "resolved" ? "vars" : "resolved"))}
        tabIndex={-1}
      >
        {mode === "resolved" ? (
          <Eye className="h-3.5 w-3.5" />
        ) : (
          <EyeOff className="h-3.5 w-3.5" />
        )}
      </button>

      <EditorContent editor={editor} />
    </div>
  );
}
