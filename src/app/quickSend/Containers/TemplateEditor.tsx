"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useRef } from "react";
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
import { useAppDispatch } from "@/lib/hooks/redux";
import { quickSendActions } from "../quickSendSlice";
import { buildMentionSuggestion } from "../mentions/mentionSuggestion";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelectors";
import { qsSelect } from "../quickSendSelect";
import { EditorToolbar } from "./EditorToolbar";
import { LineHeight } from "./lineHeightExtension";
import { ParagraphSpacing } from "./paragraphSpacingExtension";

type Props = {
  sectionId: string;
};

export function TemplateEditor({ sectionId }: Props) {
  const dispatch = useAppDispatch();
  const progCodes = useSelector(progServSelect.progCodes);
  const effectiveProgramConfigs = useSelector(qsSelect.effectiveProgramConfigs);
  const sections = useSelector(qsSelect.sections);
  const activeAuxIds = useSelector(qsSelect.activeAuxIds);
  const templateHtml = sections.find((s) => s.sectionId === sectionId)?.templateHtml ?? "";

  // Refs so suggestion callbacks always read the latest values even though
  // useEditor only runs once (the closures would otherwise capture stale state).
  const progCodesRef = useRef(progCodes);
  // eslint-disable-next-line react-hooks/refs
  progCodesRef.current = progCodes;

  const effectiveProgramConfigsRef = useRef(effectiveProgramConfigs);
  // eslint-disable-next-line react-hooks/refs
  effectiveProgramConfigsRef.current = effectiveProgramConfigs;

  const activeAuxIdsRef = useRef(activeAuxIds);
  // eslint-disable-next-line react-hooks/refs
  activeAuxIdsRef.current = activeAuxIds;

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
      LineHeight,
      ParagraphSpacing,
      Highlight.configure({ multicolor: true }),
      Mention.configure({
        HTMLAttributes: {
          class:
            "inline-block rounded bg-primary/10 px-1 py-0.5 text-primary text-sm font-medium",
        },
        renderText({ node }) {
          return `@${node.attrs.label ?? node.attrs.id}`;
        },
        renderHTML({ node, options }) {
          return ["span", options.HTMLAttributes, `@${node.attrs.label ?? node.attrs.id}`];
        },
        suggestion: buildMentionSuggestion({
          getSelectedProgCodes: () => {
            const configIds = new Set(
              effectiveProgramConfigsRef.current.map((c) => c.progCodeId),
            );
            return progCodesRef.current.filter((p) => configIds.has(p.progCodeId));
          },
          getExistingAuxIds: () => new Set(activeAuxIdsRef.current),
        }),
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none p-4 prose-p:my-1 prose-p:leading-snug",
      },
      transformPastedHTML(html) {
        // Strip inline color styles so pasted text always renders black
        return html.replace(/color\s*:[^;"]*/gi, "");
      },
    },
    onUpdate({ editor: ed }) {
      dispatch(quickSendActions.setTemplateHtml({ sectionId, html: ed.getHTML() }));
    },
    onFocus() {
      dispatch(quickSendActions.setActiveSection(sectionId));
    },
  });

  // Sync editor content when Redux state changes externally (e.g. loadTemplate).
  // Guard against the editor's own onUpdate triggering a loop by comparing HTML first.
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== templateHtml) {
      editor.commands.setContent(templateHtml, { emitUpdate: false });
    }
  }, [editor, templateHtml]);

  return (
    <div className="bg-card">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
