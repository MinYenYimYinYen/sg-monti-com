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
import { buildMentionSuggestion, safelyRemoveSuffix } from "../mentions/mentionSuggestion";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelectors";
import { prepaySelect } from "@/app/realGreen/prepay/selectors/prepaySelect";
import { quickSendSelect } from "../quickSendSelect";

type Props = {
  sectionId: string;
};

export function TemplateEditor({ sectionId }: Props) {
  const dispatch = useAppDispatch();
  const progCodes = useSelector(progServSelect.progCodes);
  const prepayCodes = useSelector(prepaySelect.prepayDocs);
  const programConfigs = useSelector(quickSendSelect.programConfigs);
  const sections = useSelector(quickSendSelect.sections);
  const templateHtml = sections.find((s) => s.sectionId === sectionId)?.templateHtml ?? "";

  // Refs so the suggestion callbacks always read the latest values even though
  // useEditor only runs once (the closures would otherwise capture stale state).
  const progCodesRef = useRef(progCodes);
  // eslint-disable-next-line react-hooks/refs
  progCodesRef.current = progCodes;

  const prepayCodesRef = useRef(prepayCodes);
  // eslint-disable-next-line react-hooks/refs
  prepayCodesRef.current = prepayCodes;

  const programConfigsRef = useRef(programConfigs);
  // eslint-disable-next-line react-hooks/refs
  programConfigsRef.current = programConfigs;

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
        suggestion: buildMentionSuggestion({
          getProgCodes: () => progCodesRef.current,
          getPrepayCodes: () => prepayCodesRef.current,
          getExistingAliases: () =>
            new Set(programConfigsRef.current.map((c) => c.alias)),
          onProgramMentionInserted: (alias: string) => {
            const alreadyExists = programConfigsRef.current.some(
              (c) => c.alias === alias,
            );
            if (!alreadyExists) {
              const baseProgCodeId = safelyRemoveSuffix(alias, progCodesRef.current);
              const progCode = progCodesRef.current.find(
                (p) => p.progCodeId === baseProgCodeId,
              );
              if (progCode) {
                dispatch(quickSendActions.addProgramConfig({ alias, progCode }));
              }
            }
          },
        }),
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none p-4 prose-p:my-1 prose-p:leading-snug",
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
      editor.commands.setContent(templateHtml, false);
    }
  }, [editor, templateHtml]);

  return (
    <div className="bg-card">
      <EditorContent editor={editor} />
    </div>
  );
}
