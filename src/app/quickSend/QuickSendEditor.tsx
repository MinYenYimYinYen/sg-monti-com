"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { quickSendSelect } from "./quickSendSelect";
import { quickSendActions } from "./quickSendSlice";
import { TemplateEditor } from "./TemplateEditor";
import { PreviewEditor } from "./PreviewEditor";
import { ScrollArea } from "@/style/components/scroll-area";
import { Button } from "@/style/components/button";
import { Plus, Trash2, Check, Copy } from "lucide-react";
import { useState } from "react";

export function QuickSendEditor() {
  const dispatch = useAppDispatch();
  const sections = useSelector(quickSendSelect.sections);
  const activeSectionId = useSelector(quickSendSelect.activeSectionId);
  const allPreviewHtmls = useSelector(quickSendSelect.allPreviewHtmls);

  const previewMap = new Map(allPreviewHtmls.map((p) => [p.sectionId, p.previewHtml]));

  // Global "Copy All" state
  const [copiedAll, setCopiedAll] = useState(false);
  // Per-section copy state: sectionId → true if recently copied
  const [copiedSectionId, setCopiedSectionId] = useState<string | null>(null);

  const anyUnfulfilled = allPreviewHtmls.some((p) => p.previewHtml.includes("{{"));

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
      .map((p) => {
        const div = document.createElement("div");
        div.innerHTML = p.previewHtml;
        return div.textContent ?? "";
      })
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
    const div = document.createElement("div");
    div.innerHTML = html;
    const text = div.textContent ?? "";

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
      {/* Template pane — top 50% */}
      <div className="flex-1 flex flex-col overflow-hidden border-b border-border">
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/30 px-4 py-1.5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Template — type @ to insert variables
          </span>
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
        <ScrollArea className="flex-1">
          <div className="flex flex-col divide-y divide-border">
            {sections.map((section, idx) => (
              <div
                key={section.sectionId}
                className={`relative group ${
                  section.sectionId === activeSectionId
                    ? "border-l-2 border-primary"
                    : "border-l-2 border-transparent"
                }`}
              >
                {sections.length > 1 && (
                  <div className="flex items-center justify-between px-3 pt-2 pb-0">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      Section {idx + 1}
                    </span>
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
      </div>

      {/* Preview pane — bottom 50% */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/30 px-4 py-1.5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Preview — edit to individualize
          </span>
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
      </div>
    </div>
  );
}
