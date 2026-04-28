"use client";

import { useState, useRef } from "react";
import { useSelector } from "react-redux";
import type { DragEvent } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/style/components/dialog";
import { Button } from "@/style/components/button";
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
  useGlobalSettings({ autoLoad: true });

  const sections = useSelector(qs2Select.sections);
  const activeSectionId = useSelector(qs2Select.activeSectionId);
  const allPreviewHtmls = useSelector(qs2Select.allPreviewHtmls);

  const activePreviewHtml =
    allPreviewHtmls.find((p) => p.sectionId === activeSectionId)?.previewHtml ?? "";

  // Drag-to-reorder state
  const draggingIdxRef = useRef<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  // Delete confirm dialog state
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);
  const deletingSection = sections.find((s) => s.sectionId === deletingSectionId) ?? null;

  // Inline tab name editing state
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  const handleAddSection = () => {
    dispatch(quickSend2Actions.addSection());
    // The new section's ID is section-{Date.now()} — we need to enter edit mode for it.
    // We use a small timeout so the Redux state has updated and the new section is rendered.
    const newId = `section-${Date.now()}`;
    setTimeout(() => {
      setEditingName("New Section");
      setEditingSectionId(newId);
    }, 0);
  };

  const handleRemoveSection = (sectionId: string) =>
    dispatch(quickSend2Actions.removeSection(sectionId));

  const handleSelectSection = (sectionId: string) =>
    dispatch(quickSend2Actions.setActiveSection(sectionId));

  const handleStartEditing = (sectionId: string, currentName: string) => {
    setEditingName(currentName);
    setEditingSectionId(sectionId);
    // Focus the input on next tick after it renders
    setTimeout(() => editInputRef.current?.select(), 0);
  };

  const handleCommitName = (sectionId: string) => {
    const trimmed = editingName.trim();
    dispatch(quickSend2Actions.setSectionName({
      sectionId,
      name: trimmed || "New Section",
    }));
    setEditingSectionId(null);
  };

  const handleCancelEditing = () => {
    setEditingSectionId(null);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Menubar */}
      <QuickSendMenubar />

      {/* Delete section confirm dialog */}
      <Dialog open={deletingSectionId !== null} onOpenChange={(open) => { if (!open) setDeletingSectionId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete section?</DialogTitle>
            <DialogDescription>
              {deletingSection
                ? `"${deletingSection.name}" and all its content will be permanently removed.`
                : "This section will be permanently removed."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" intensity="ghost" onClick={() => setDeletingSectionId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              intensity="solid"
              onClick={() => {
                if (deletingSectionId) handleRemoveSection(deletingSectionId);
                setDeletingSectionId(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <div key={section.sectionId} className="flex items-center group select-none">
                {editingSectionId === section.sectionId ? (
                  /* ── Edit mode ── */
                  <input
                    ref={editInputRef}
                    className="px-2 py-1 text-xs rounded-t border border-primary bg-card text-foreground outline-none min-w-0 w-28"
                    value={editingName}
                    autoFocus
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => handleCommitName(section.sectionId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Tab") {
                        e.preventDefault();
                        handleCommitName(section.sectionId);
                      } else if (e.key === "Escape") {
                        handleCancelEditing();
                      }
                    }}
                  />
                ) : (
                  /* ── Display mode ── */
                  <div
                    role="button"
                    tabIndex={0}
                    draggable
                    onDragStart={() => {
                      draggingIdxRef.current = idx;
                      setDraggingIdx(idx);
                    }}
                    onDragOver={(e: DragEvent<HTMLDivElement>) => e.preventDefault()}
                    onDrop={() => {
                      const from = draggingIdxRef.current;
                      if (from !== null && from !== idx) {
                        dispatch(quickSend2Actions.reorderSections({ fromIndex: from, toIndex: idx }));
                      }
                      draggingIdxRef.current = null;
                      setDraggingIdx(null);
                    }}
                    onDragEnd={() => {
                      draggingIdxRef.current = null;
                      setDraggingIdx(null);
                    }}
                    className={`px-3 py-1.5 text-xs rounded-t transition-colors cursor-grab active:cursor-grabbing ${
                      section.sectionId === activeSectionId
                        ? "bg-card text-foreground border border-b-0 border-border"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                    } ${draggingIdx === idx ? "opacity-40" : "opacity-100"}`}
                    onClick={() => handleSelectSection(section.sectionId)}
                    onDoubleClick={() => handleStartEditing(section.sectionId, section.name)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") handleSelectSection(section.sectionId);
                      if (e.key === "F2") handleStartEditing(section.sectionId, section.name);
                    }}
                  >
                    {section.name}
                  </div>
                )}
                {sections.length > 1 && editingSectionId !== section.sectionId && (
                  <button
                    className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => setDeletingSectionId(section.sectionId)}
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
