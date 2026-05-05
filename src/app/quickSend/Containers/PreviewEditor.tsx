"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
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
import { qsSelect } from "../quickSendSelect";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { buildMentionSuggestion } from "../mentions/mentionSuggestion";
import { resolveHtml } from "../lib/resolveHtml";

export type PreviewEditorHandle = {
  getHtml: () => string;
};

type Props = {
  previewHtml: string;
  /** Called whenever the editor content changes, with whether it contains unfulfilled mentions. */
  onFulfilledChange?: (hasUnfulfilled: boolean) => void;
};

export const PreviewEditor = forwardRef<PreviewEditorHandle, Props>(
  function PreviewEditor({ previewHtml, onFulfilledChange }, ref) {
    // --- Selector values needed for local re-resolve when user inserts mentions ---
    const progCodes = useSelector(progServSelect.progCodes);
    const effectiveProgramConfigs = useSelector(qsSelect.effectiveProgramConfigs);
    const activeAuxIds = useSelector(qsSelect.activeAuxIds);
    const nameOverride = useSelector(qsSelect.nameOverride);
    const sizeOverride = useSelector(qsSelect.sizeOverride);
    const effectiveTaxRate = useSelector(qsSelect.effectiveTaxRate);
    const season = useSelector(globalSettingsSelect.season);
    const progVars = useSelector(qsSelect.programVariables);
    const progVarMap = useSelector(qsSelect.programVariableMap);
    const customerState = useSelector(qsSelect.customerState);
    const auxValues = useSelector(qsSelect.auxValues);
    const auxPurposes = useSelector(qsSelect.auxPurposes);
    const aggregates = useSelector(qsSelect.aggregates);

    // Refs so onUpdate closure always reads the latest values without stale captures.
    const progCodesRef = useRef(progCodes);
    // eslint-disable-next-line react-hooks/refs
    progCodesRef.current = progCodes;

    const effectiveProgramConfigsRef = useRef(effectiveProgramConfigs);
    // eslint-disable-next-line react-hooks/refs
    effectiveProgramConfigsRef.current = effectiveProgramConfigs;

    const activeAuxIdsRef = useRef(activeAuxIds);
    // eslint-disable-next-line react-hooks/refs
    activeAuxIdsRef.current = activeAuxIds;

    const resolveArgsRef = useRef({
      nameOverride,
      sizeOverride,
      effectiveTaxRate,
      season,
      progVars,
      progVarMap,
      customerState,
      auxValues,
      auxPurposes,
      aggregates,
    });
    resolveArgsRef.current = {
      nameOverride,
      sizeOverride,
      effectiveTaxRate,
      season,
      progVars,
      progVarMap,
      customerState,
      auxValues,
      auxPurposes,
      aggregates,
    };

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
      },
      onUpdate({ editor: ed, transaction }) {
        // Notify parent of fulfilled state on every content change (including user edits).
        onFulfilledChange?.(ed.getHTML().includes("{{"));

        // Skip expensive re-resolve if the document content didn't change.
        if (!transaction.docChanged) return;

        // Only re-resolve when the document contains an unresolved mention node —
        // i.e., a mention whose label still equals its raw id (not yet display-resolved).
        // Regular typing never creates mention nodes, so this never fires on keystrokes.
        let hasUnresolvedMention = false;
        ed.state.doc.descendants((node) => {
          if (node.type.name === "mention" && node.attrs.label === node.attrs.id) {
            hasUnresolvedMention = true;
            return false;
          }
        });
        if (!hasUnresolvedMention) return;

        const html = ed.getHTML();

        const {
          nameOverride: name,
          sizeOverride: size,
          effectiveTaxRate: taxRate,
          season: s,
          progVars,
          progVarMap,
          customerState,
          auxValues,
          auxPurposes,
          aggregates,
        } = resolveArgsRef.current;

        const taxRateStr = taxRate != null ? `${taxRate.toFixed(3)}%` : null;
        const seasonStr = s != null ? String(s) : null;

        // Derive prepayPercent from aggregates — if any regular program has a
        // prepayDiscAmt, a prepay is active. We don't need the exact percent here
        // because resolveHtml uses the progVarMap which already has it baked in.
        const prepayPct = progVars.find((v) => v.prepayPercent !== null)?.prepayPercent ?? null;

        const resolved = resolveHtml(
          html,
          name,
          size,
          taxRateStr,
          seasonStr,
          prepayPct,
          progVarMap,
          customerState.customer,
          auxValues,
          auxPurposes,
          progVars,   // ProgramVariables[]
          aggregates,
          false, // do not drop optional blocks — show error state instead
        );

        // Guard: skip setContent if nothing changed to prevent infinite loops.
        // Some Tiptap versions fire onUpdate even when emitUpdate: false is set.
        if (resolved === html) return;

        // Record cursor offset from the end of the document before replacing content.
        // We use offset-from-end because the resolved text may be a different length
        // than the unresolved mention chip, making offset-from-start unreliable.
        const { from } = ed.state.selection;
        const offsetFromEnd = ed.state.doc.content.size - from;

        ed.commands.setContent(resolved, { emitUpdate: false });

        // Restore cursor to the equivalent position relative to the end of the new doc.
        const newPos = Math.max(1, ed.state.doc.content.size - offsetFromEnd);
        ed.commands.setTextSelection(newPos);
      },
    });

    // Expose getHtml() to parent via ref so the copy button reads live content.
    useImperativeHandle(ref, () => ({
      getHtml: () => editor?.getHTML() ?? "",
    }));

    // When previewHtml changes (variable change or template load), reset the editor.
    // This is intentional — variable changes always produce a fresh resolved render.
    // Use emitUpdate: false so the programmatic reset does not trigger onUpdate,
    // but notify the parent of the new fulfilled state directly.
    useEffect(() => {
      if (!editor || !previewHtml) return;
      editor.commands.setContent(previewHtml, { emitUpdate: false });
      onFulfilledChange?.(previewHtml.includes("{{"));
    }, [editor, previewHtml, onFulfilledChange]);

    return (
      <div className="bg-card">
        <EditorContent editor={editor} />
      </div>
    );
  },
);
