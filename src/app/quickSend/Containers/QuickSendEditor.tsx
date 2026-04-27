"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { quickSendSelect } from "../quickSendSelect";
import { quickSendActions } from "../quickSendSlice";
import { TemplateEditor } from "./TemplateEditor";
import { PreviewEditor } from "./PreviewEditor";
import { ScrollArea } from "@/style/components/scroll-area";
import { Button } from "@/style/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/style/components/collapsible";
import { Plus, Trash2, Check, Copy, GripVertical, ChevronDown } from "lucide-react";
import { useState } from "react";

/** Converts HTML to plain text while preserving paragraph/line-break structure.
 *  Tables are rendered as tab-separated rows so columns survive a plain-text paste. */
function htmlToPlainText(html: string): string {
  const withBreaks = html
    .replace(/<\/td>/gi, "\t")
    .replace(/<\/th>/gi, "\t")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n");
  const div = document.createElement("div");
  div.innerHTML = withBreaks;
  return (div.textContent ?? "")
    .replace(/\t\n/g, "\n")    // strip trailing tab before each row-end newline
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type Props = {
  /** True when a saved template is loaded — editor starts collapsed. */
  hasLoadedTemplate: boolean;
};

export function QuickSendEditor({ hasLoadedTemplate }: Props) {
  const dispatch = useAppDispatch();
  const sections = useSelector(quickSendSelect.sections);
  const activeSectionId = useSelector(quickSendSelect.activeSectionId);
  const allPreviewHtmls = useSelector(quickSendSelect.allPreviewHtmls);

  const previewMap = new Map(allPreviewHtmls.map((p) => [p.sectionId, p.previewHtml]));

  // Collapsible open states — editor collapses when a saved template is loaded
  const [editorOpen, setEditorOpen] = useState(!hasLoadedTemplate);
  const [previewOpen, setPreviewOpen] = useState(true);

  // Global "Copy All" state
  const [copiedAll, setCopiedAll] = useState(false);
  // Per-section copy state: sectionId → true if recently copied
  const [copiedSectionId, setCopiedSectionId] = useState<string | null>(null);

  const anyUnfulfilled = allPreviewHtmls.some((p) => p.previewHtml.includes("{{"));

  // Drag-and-drop reorder state
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (idx: number) => {
    setDragFromIndex(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIndex(idx);
  };

  const handleDrop = (toIndex: number) => {
    if (dragFromIndex !== null && dragFromIndex !== toIndex) {
      dispatch(quickSendActions.reorderSections({ fromIndex: dragFromIndex, toIndex }));
    }
    setDragFromIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragFromIndex(null);
    setDragOverIndex(null);
  };

  const handleAddSection = () => {
    dispatch(quickSendActions.addSection());
  };

  const handleRemoveSection = (sectionId: string) => {
    dispatch(quickSendActions.removeSection(sectionId));
  };

  const handleCopyAll = async () => {
    const combinedHtml = allPreviewHtmls
      .map((p) => p.previewHtml)
      .filter(Boolean)
      .join("<br><br>");
    const combinedText = allPreviewHtmls
      .map((p) => htmlToPlainText(p.previewHtml))
      .filter(Boolean)
      .join("\n\n");

    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([combinedHtml], { type: "text/html" }),
        "text/plain": new Blob([combinedText], { type: "text/plain" }),
      }),
    ]);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopySection = async (sectionId: string) => {
    const html = previewMap.get(sectionId) ?? "";
    const text = htmlToPlainText(html);

    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      }),
    ]);
    setCopiedSectionId(sectionId);
    setTimeout(() => setCopiedSectionId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Template pane ── */}
      <Collapsible
        open={editorOpen}
        onOpenChange={setEditorOpen}
        className={editorOpen ? "flex flex-col flex-1 overflow-hidden border-b border-border" : "flex flex-col shrink-0 border-b border-border"}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/30 px-4 py-1.5">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors">
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${editorOpen ? "" : "-rotate-90"}`}
              />
              Template — type @ to insert variables
            </button>
          </CollapsibleTrigger>
          <Button
            size="sm"
            variant="accent"
            intensity="ghost"
            onClick={handleAddSection}
            className="h-6 gap-1 px-2 text-xs"
          >
            <Plus className="h-3 w-3" />
            Add Section
          </Button>
        </div>
        <CollapsibleContent className="flex flex-col flex-1 overflow-hidden data-[state=closed]:hidden">
          <ScrollArea className="flex-1">
            <div className="flex flex-col divide-y divide-border">
              {sections.map((section, idx) => (
                <div
                  key={section.sectionId}
                  draggable={sections.length > 1}
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={handleDragEnd}
                  className={[
                    "relative group",
                    section.sectionId === activeSectionId
                      ? "border-l-2 border-primary"
                      : "border-l-2 border-transparent",
                    dragOverIndex === idx && dragFromIndex !== idx
                      ? "ring-2 ring-primary/40 ring-inset"
                      : "",
                  ].join(" ")}
                >
                  {sections.length > 1 && (
                    <div className="flex items-center justify-between px-3 pt-2 pb-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                          aria-label="Drag to reorder"
                        >
                          <GripVertical className="h-3 w-3" />
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                          Section {idx + 1}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveSection(section.sectionId)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        aria-label="Remove section"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <TemplateEditor sectionId={section.sectionId} />
                </div>
              ))}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>

      {/* ── Preview pane ── */}
      <Collapsible
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        className={previewOpen ? "flex flex-col flex-1 overflow-hidden" : "flex flex-col shrink-0"}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/30 px-4 py-1.5">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors">
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${previewOpen ? "" : "-rotate-90"}`}
              />
              Preview — edit to individualize
            </button>
          </CollapsibleTrigger>
          <Button
            size="sm"
            variant={copiedAll ? "accent" : "primary"}
            intensity="soft"
            onClick={handleCopyAll}
            disabled={anyUnfulfilled}
            className="h-6 gap-1 px-2 text-xs"
          >
            {copiedAll ? (
              <>
                <Check className="h-3 w-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy All
              </>
            )}
          </Button>
        </div>
        <CollapsibleContent className="flex flex-col flex-1 overflow-hidden data-[state=closed]:hidden">
          <ScrollArea className="flex-1">
            <div className="flex flex-col divide-y divide-border">
              {sections.map((section, idx) => {
                const sectionPreviewHtml = previewMap.get(section.sectionId) ?? "";
                const sectionUnfulfilled = sectionPreviewHtml.includes("{{");
                const isCopied = copiedSectionId === section.sectionId;

                return (
                  <div key={section.sectionId}>
                    {sections.length > 1 && (
                      <div className="flex items-center justify-start gap-2 px-3 pt-2 pb-0">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                          Section {idx + 1}
                        </span>
                        <Button
                          size="sm"
                          variant={isCopied ? "accent" : "primary"}
                          intensity="ghost"
                          onClick={() => handleCopySection(section.sectionId)}
                          disabled={sectionUnfulfilled}
                          className="h-5 gap-1 px-1.5 text-[10px]"
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-2.5 w-2.5" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-2.5 w-2.5" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                    <PreviewEditor previewHtml={sectionPreviewHtml} />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
