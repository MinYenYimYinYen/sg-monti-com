"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
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
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { qsSelect } from "../quickSendSelect";
import { EditorToolbar } from "./EditorToolbar";
import { LineHeight } from "./lineHeightExtension";
import { ParagraphSpacing } from "./paragraphSpacingExtension";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/style/components/dialog";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";

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

  // Purpose-capture dialog state — opens when a new @aux mention is inserted.
  const [purposeDialogAuxId, setPurposeDialogAuxId] = useState<string | null>(null);
  const [purposeInput, setPurposeInput] = useState("");

  // Track which aux IDs were present before the last transaction so we can detect new ones.
  const knownAuxIdsRef = useRef<Set<string>>(new Set());

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
          // Preserve data-type, data-id, and data-label so the extension can
          // parse its own nodes back from saved HTML on template load.
          return [
            "span",
            {
              ...options.HTMLAttributes,
              "data-type": "mention",
              "data-id": node.attrs.id,
              "data-label": node.attrs.label ?? node.attrs.id,
            },
            `@${node.attrs.label ?? node.attrs.id}`,
          ];
        },
        // eslint-disable-next-line react-hooks/refs
        suggestion: buildMentionSuggestion({
          // eslint-disable-next-line react-hooks/refs
          getSelectedProgCodes: () => {
            // eslint-disable-next-line react-hooks/refs
            const configIds = new Set(
              // eslint-disable-next-line react-hooks/refs
              effectiveProgramConfigsRef.current.map((c) => c.progCodeId),
            );
            // eslint-disable-next-line react-hooks/refs
            return progCodesRef.current.filter((p) => configIds.has(p.progCodeId));
          },
          // eslint-disable-next-line react-hooks/refs
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
    onUpdate({ editor: ed, transaction }) {
      dispatch(quickSendActions.setTemplateHtml({ sectionId, html: ed.getHTML() }));

      // Detect newly inserted @aux mention nodes and open the purpose dialog.
      if (transaction.docChanged) {
        let newAuxId: string | null = null;
        ed.state.doc.descendants((node) => {
          if (
            node.type.name === "mention" &&
            /^aux(?:_\d+)?$/.test(node.attrs.id as string) &&
            !knownAuxIdsRef.current.has(node.attrs.id as string)
          ) {
            newAuxId = node.attrs.id as string;
            return false;
          }
        });
        if (newAuxId !== null) {
          // eslint-disable-next-line react-hooks/refs
          knownAuxIdsRef.current.add(newAuxId);
          setPurposeInput("");
          setPurposeDialogAuxId(newAuxId);
        }
      }
    },
    onFocus() {
      dispatch(quickSendActions.setActiveSection(sectionId));
    },
  });

  // Sync editor content when Redux state changes externally (e.g. loadTemplate).
  // Guard against the editor's own onUpdate triggering a loop by comparing HTML first.
  // Also rebuild knownAuxIds from the loaded content so we don't re-prompt for existing mentions.
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== templateHtml) {
      editor.commands.setContent(templateHtml, { emitUpdate: false });
      // Rebuild known aux IDs from the freshly loaded content.
      const newKnown = new Set<string>();
      editor.state.doc.descendants((node) => {
        if (node.type.name === "mention" && /^aux(?:_\d+)?$/.test(node.attrs.id as string)) {
          newKnown.add(node.attrs.id as string);
        }
      });
      // eslint-disable-next-line react-hooks/refs
      knownAuxIdsRef.current = newKnown;
    }
  }, [editor, templateHtml]);

  const handlePurposeConfirm = () => {
    if (purposeDialogAuxId) {
      dispatch(quickSendActions.setAuxPurpose({ id: purposeDialogAuxId, purpose: purposeInput.trim() }));
    }
    setPurposeDialogAuxId(null);
  };

  const handlePurposeSkip = () => {
    setPurposeDialogAuxId(null);
  };

  return (
    <>
      <div className="bg-card">
        <EditorToolbar editor={editor} />
        <EditorContent editor={editor} />
      </div>

      {/* Purpose-capture dialog — opens when a new @aux mention is inserted */}
      <Dialog open={purposeDialogAuxId !== null} onOpenChange={(open) => { if (!open) handlePurposeSkip(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>What is this field for?</DialogTitle>
            <DialogDescription>
              Give this aux variable a purpose label so users know what to enter.
              This label appears in the left panel and in the preview error state.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5 py-2">
            <Label className="text-xs text-muted-foreground">Purpose</Label>
            <Input
              autoFocus
              value={purposeInput}
              onChange={(e) => setPurposeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handlePurposeConfirm();
                if (e.key === "Escape") handlePurposeSkip();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" intensity="ghost" onClick={handlePurposeSkip}>
              Skip
            </Button>
            <Button variant="primary" intensity="solid" onClick={handlePurposeConfirm}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
