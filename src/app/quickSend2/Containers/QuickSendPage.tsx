"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { qs2Select } from "../quickSendSelect";
import { quickSend2Actions } from "../quickSendSlice";
import { CustomerPanel } from "../controls/CustomerPanel";
import { ProgramPanel } from "../controls/ProgramPanel";
import { TemplateEditor } from "./TemplateEditor";
import { PreviewEditor } from "./PreviewEditor";
import { QuickSendMenubar } from "./QuickSendMenubar";
import { useStoredTemplates } from "../storedTemplates/useStoredTemplates";
import { Plus, X } from "lucide-react";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { usePriceTable } from "@/app/realGreen/priceTable/usePriceTable";
import { usePrepay } from "@/app/realGreen/prepay/usePrepay";
import { useZipCode } from "@/app/realGreen/zipCode/useZipCode";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";

/**
 * Top-level QuickSend2 page layout.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ Menubar                                                                  │
 * ├──────────────┬───────────────────────────────┬───────────────────────────┤
 * │ Left panel   │ Editor (active section)       │ Preview (active section)  │
 * │ - Customer   │                               │                           │
 * │ - Programs   │                               │                           │
 * └──────────────┴───────────────────────────────┴───────────────────────────┘
 *
 * Section tabs sit above the editor column.
 */
export function QuickSendPage() {
  const dispatch = useAppDispatch();
  useStoredTemplates({ autoLoad: true });
  useCustomerContext({ contexts: ["single"] });
  useProgServ({ autoLoad: true });
  usePriceTable({ autoLoad: true });
  usePrepay({ autoLoad: true });
  useZipCode({ autoLoad: true });
  useStoredTemplates({ autoLoad: true });
  useGlobalSettings({ autoLoad: true });

  const sections = useSelector(qs2Select.sections);
  const activeSectionId = useSelector(qs2Select.activeSectionId);
  const allPreviewHtmls = useSelector(qs2Select.allPreviewHtmls);

  const activePreviewHtml =
    allPreviewHtmls.find((p) => p.sectionId === activeSectionId)?.previewHtml ?? "";

  const handleAddSection = () => dispatch(quickSend2Actions.addSection());
  const handleRemoveSection = (sectionId: string) =>
    dispatch(quickSend2Actions.removeSection(sectionId));
  const handleSelectSection = (sectionId: string) =>
    dispatch(quickSend2Actions.setActiveSection(sectionId));

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Menubar */}
      <QuickSendMenubar />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left panel ── */}
        <div className="w-64 shrink-0 flex flex-col overflow-y-auto border-r border-border bg-background">
          <CustomerPanel />
          <ProgramPanel />
        </div>

        {/* ── Editor column ── */}
        <div className="flex flex-col flex-1 overflow-hidden border-r border-border">
          {/* Section tabs */}
          <div className="flex items-center gap-0 border-b border-border bg-muted/20 px-2 pt-1 shrink-0 overflow-x-auto">
            {sections.map((section, idx) => (
              <div key={section.sectionId} className="flex items-center group">
                <button
                  className={`px-3 py-1.5 text-xs rounded-t transition-colors ${
                    section.sectionId === activeSectionId
                      ? "bg-card text-foreground border border-b-0 border-border"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                  }`}
                  onClick={() => handleSelectSection(section.sectionId)}
                >
                  Section {idx + 1}
                </button>
                {sections.length > 1 && (
                  <button
                    className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveSection(section.sectionId)}
                    title="Remove section"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            <button
              className="ml-1 flex items-center gap-0.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleAddSection}
              title="Add section"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {/* Active section editor */}
          <div className="flex-1 overflow-y-auto">
            <TemplateEditor key={activeSectionId} sectionId={activeSectionId} />
          </div>
        </div>

        {/* ── Preview column ── */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="px-3 py-1.5 border-b border-border bg-muted/20 shrink-0">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Preview
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <PreviewEditor previewHtml={activePreviewHtml} />
          </div>
        </div>
      </div>
    </div>
  );
}
