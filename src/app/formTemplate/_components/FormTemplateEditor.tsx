"use client";

import { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { formTemplateActions } from "@/app/formTemplate/formTemplateSlice";
import { formTemplateSelect } from "@/app/formTemplate/formTemplateSelect";
import {
  FORM_LETTER_DATA_TYPE_OPTIONS,
  FORM_LETTER_DATA_TYPE_REGISTRY,
  type FormLetterDataType,
  type FieldDescriptor,
} from "@/app/formTemplate/formLetterDataTypes";
import { PagePreview } from "./PagePreview";
import { SlotEditor } from "./SlotEditor";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/style/components/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";
import type { FormLetterSlotDoc } from "@/app/formTemplate/FormTemplateTypes";
import { Braces, Minus, Plus, FileText, Move } from "lucide-react";
import { useIsClient } from "@/lib/hooks/useIsClient";
import { SamplePdfDownload } from "./SamplePdfDownload";

const INCH_PX = 96;
const ZOOM_STEP = 0.1;
/** Default slot dimensions in inches when a new slot is added. */
const DEFAULT_SLOT_WIDTH = 2;
const DEFAULT_SLOT_HEIGHT = 0.25;

/** Creates a positioned slot for a given key, centered on the visible scroll area. */
function makeSlotForKey(
  key: string,
  scrollContainer: HTMLDivElement | null,
  scale: number,
): FormLetterSlotDoc {
  let x = 1;
  let y = 1;

  if (scrollContainer) {
    const { scrollLeft, scrollTop, clientWidth, clientHeight } = scrollContainer;
    // Convert the visible center from px to inches, then offset by half the slot size
    const centerXIn = (scrollLeft + clientWidth / 2) / (INCH_PX * scale);
    const centerYIn = (scrollTop + clientHeight / 2) / (INCH_PX * scale);
    x = Math.max(0, centerXIn - DEFAULT_SLOT_WIDTH / 2);
    y = Math.max(0, centerYIn - DEFAULT_SLOT_HEIGHT / 2);
  }

  return {
    key,
    x: Math.round(x * 1000) / 1000,
    y: Math.round(y * 1000) / 1000,
    width: DEFAULT_SLOT_WIDTH,
    height: DEFAULT_SLOT_HEIGHT,
  };
}

/** Creates a blank new template. */
function makeNewTemplate() {
  return {
    templateId: `tpl_${Date.now()}`,
    templateName: "New Template",
    dataType: "PrepayLetter" as FormLetterDataType,
    pageSize: "LEGAL" as const,
    slots: [] as FormLetterSlotDoc[],
  };
}

/**
 * Two-panel template editor.
 * Left: available fields + positioned slot accordion + template metadata.
 * Right: page preview — handles mode (CSS overlay with drag handles) or PDF mode (live PDFViewer).
 */
export function FormTemplateEditor() {
  const dispatch = useAppDispatch();
  const draft = useSelector(formTemplateSelect.draft);
  const templates = useSelector(formTemplateSelect.templates);
  const previewScale = useSelector(formTemplateSelect.previewScale);
  const previewMode = useSelector(formTemplateSelect.previewMode);
  const allEdges = useSelector(formTemplateSelect.draftSlotEdges);
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const isClient = useIsClient();

  // Ref to the scrollable preview container — used to compute center-on-add position
  const previewScrollRef = useRef<HTMLDivElement | null>(null);

  // If no draft, show template selector / new template button
  if (!draft) {
    return (
      <div className="flex flex-col gap-4 p-6 h-full overflow-y-auto">
        <h2 className="text-lg font-semibold">Form Template Editor</h2>

        {templates.length > 0 && (
          <div className="flex flex-col gap-2">
            <Label>Load existing template</Label>
            <Select
              onValueChange={(templateId) => {
                const found = templates.find((t) => t.templateId === templateId);
                if (found) dispatch(formTemplateActions.setDraft(found));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.templateId} value={t.templateId}>
                    {t.templateName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button
          variant="primary"
          intensity="solid"
          onClick={() => dispatch(formTemplateActions.setDraft(makeNewTemplate()))}
        >
          New Template
        </Button>
      </div>
    );
  }

  // Derive available slot keys, sample data, contract, and background image from the registry
  const descriptor = FORM_LETTER_DATA_TYPE_REGISTRY[draft.dataType];
  // Cast to the widened type so string-keyed access works throughout the editor.
  // The registry stores the concrete typed contract; we widen it here for editor use only.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contract: Record<string, FieldDescriptor<any>> = descriptor?.contract ?? {};
  const availableKeys = descriptor ? Object.keys(contract) : [];
  const sampleData = descriptor?.sampleData ?? {};
  const backgroundImage = descriptor?.backgroundImage;
  const positionedKeys = new Set(draft.slots.map((s) => s.key));
  const unpositionedKeys = availableKeys.filter((k) => !positionedKeys.has(k));

  // Capture draft in a non-null local variable — we've already returned early if draft is null above
  const activeDraft = draft;

  function handleAddKey(key: string) {
    const slot = makeSlotForKey(key, previewScrollRef.current, previewScale);
    dispatch(formTemplateActions.addDraftSlot(slot));
    setSelectedSlotKey(key);
  }

  function handleSaveSlot(updated: FormLetterSlotDoc) {
    dispatch(
      formTemplateActions.updateDraftSlot({
        key: updated.key,
        slot: updated,
      }),
    );
    setSelectedSlotKey(updated.key);
  }

  function handleSlotUpdate(key: string, patch: { x?: number; y?: number; width?: number; height?: number }) {
    const slot = activeDraft.slots.find((s) => s.key === key);
    if (!slot) return;
    dispatch(
      formTemplateActions.updateDraftSlot({
        key,
        slot: { ...slot, ...patch },
      }),
    );
  }

  function handleDeleteSlot(key: string) {
    dispatch(formTemplateActions.removeDraftSlot(key));
    setSelectedSlotKey(null);
  }

  function handleSaveTemplate() {
    dispatch(
      formTemplateActions.upsert({
        params: { template: activeDraft },
        config: { loadingMsg: "Saving template..." },
      }),
    );
  }

  function handleDeleteTemplate() {
    dispatch(
      formTemplateActions.deleteOne({
        params: { templateId: activeDraft.templateId },
        config: { loadingMsg: "Deleting template..." },
      }),
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left panel ── */}
      <div className="w-80 shrink-0 flex flex-col gap-3 p-3 border-r border-border overflow-y-auto bg-card">
        {/* Template metadata */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="tpl-name">Template Name</Label>
            <Input
              id="tpl-name"
              value={draft.templateName}
              onChange={(e) =>
                dispatch(
                  formTemplateActions.updateDraft({ templateName: e.target.value }),
                )
              }
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label>Data Type</Label>
            <Select
              value={draft.dataType}
              onValueChange={(v) =>
                dispatch(
                  formTemplateActions.updateDraft({
                    dataType: v as FormLetterDataType,
                  }),
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORM_LETTER_DATA_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label>Page Size</Label>
            <Select
              value={draft.pageSize}
              onValueChange={(v) =>
                dispatch(
                  formTemplateActions.updateDraft({
                    pageSize: v as "LETTER" | "LEGAL",
                  }),
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LETTER">{"Letter (8.5\" × 11\")"}</SelectItem>
                <SelectItem value="LEGAL">{"Legal (8.5\" × 14\")"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <hr className="border-border" />

        {/* Available fields (not yet positioned) */}
        {unpositionedKeys.length > 0 && (
          <>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Available Fields
            </div>
            <div className="flex flex-col gap-1">
              {unpositionedKeys.map((key) => (
                <button
                  key={key}
                  onClick={() => handleAddKey(key)}
                  className="text-left text-sm px-2 py-1.5 rounded-md transition-colors hover:bg-accent/20 text-muted-foreground hover:text-foreground"
                >
                  <span className="font-medium">{contract[key]?.label ?? key}</span>
                  <span className="ml-2 text-xs font-mono opacity-50">{key}</span>
                  <span className="ml-2 text-xs opacity-50">+ add</span>
                </button>
              ))}
            </div>
            <hr className="border-border" />
          </>
        )}

        {/* Positioned slots — accordion */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Positioned ({draft.slots.length})
          </span>
        </div>

        <Accordion
          type="single"
          collapsible
          value={selectedSlotKey ?? ""}
          onValueChange={(value) => setSelectedSlotKey(value || null)}
          className="flex flex-col gap-0"
        >
          {draft.slots.map((slot) => (
            <AccordionItem key={slot.key} value={slot.key} className="border-b-0">
              <AccordionTrigger className="text-sm px-2 py-1.5 rounded-md hover:bg-muted hover:no-underline [&[data-state=open]]:bg-primary/10 [&[data-state=open]]:text-foreground [&[data-state=open]]:font-medium">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="font-medium truncate">{contract[slot.key]?.label ?? slot.key}</span>
                  <span className="text-xs font-mono opacity-60 shrink-0">{slot.key}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-1 pt-0">
                <SlotEditor
                  key={slot.key}
                  slot={slot}
                  slotLabel={contract[slot.key]?.label ?? slot.key}
                  onSave={handleSaveSlot}
                  onDelete={handleDeleteSlot}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <hr className="border-border" />

        {/* Template actions */}
        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            intensity="solid"
            onClick={handleSaveTemplate}
          >
            Save Template
          </Button>
          <Button
            variant="destructive"
            intensity="ghost"
            onClick={handleDeleteTemplate}
          >
            Delete Template
          </Button>
          <Button
            variant="outline"
            intensity="ghost"
            onClick={() => dispatch(formTemplateActions.clearDraft())}
          >
            Close
          </Button>
        </div>
      </div>

      {/* ── Right panel — page preview ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Preview toolbar */}
        <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border bg-card">
          {/* Zoom controls */}
          <Button
            size="icon"
            variant="outline"
            intensity="ghost"
            onClick={() =>
              dispatch(
                formTemplateActions.setPreviewScale(
                  Math.round((previewScale - ZOOM_STEP) * 10) / 10,
                ),
              )
            }
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="text-xs text-muted-foreground w-10 text-center">
            {Math.round(previewScale * 100)}%
          </span>
          <Button
            size="icon"
            variant="outline"
            intensity="ghost"
            onClick={() =>
              dispatch(
                formTemplateActions.setPreviewScale(
                  Math.round((previewScale + ZOOM_STEP) * 10) / 10,
                ),
              )
            }
          >
            <Plus className="h-3 w-3" />
          </Button>

          <div className="w-px h-4 bg-border mx-1" />

          {/* Preview mode toggle */}
          <Button
            size="sm"
            variant={previewMode === "handles" ? "primary" : "outline"}
            intensity={previewMode === "handles" ? "soft" : "ghost"}
            onClick={() => dispatch(formTemplateActions.setPreviewMode("handles"))}
            title="Handles mode — drag to position slots"
          >
            <Move className="h-3 w-3 mr-1" />
            Handles
          </Button>
          <Button
            size="sm"
            variant={previewMode === "pdf" ? "primary" : "outline"}
            intensity={previewMode === "pdf" ? "soft" : "ghost"}
            onClick={() => dispatch(formTemplateActions.setPreviewMode("pdf"))}
            title="PDF mode — live PDF preview"
          >
            <FileText className="h-3 w-3 mr-1" />
            PDF
          </Button>

          <div className="flex-1" />

          {/* Print Sample PDF download — guarded by isClient since @react-pdf/renderer is browser-only */}
          {isClient && (
            <SamplePdfDownload
              draft={activeDraft}
              sampleData={sampleData}
              contract={contract}
            />
          )}

          {/* JSON Sheet trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button size="sm" variant="outline" intensity="ghost" title="View JSON">
                <Braces className="h-3 w-3 mr-1" />
                JSON
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[480px] sm:max-w-[480px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Template JSON</SheetTitle>
              </SheetHeader>
              <pre className="mt-4 text-xs font-mono bg-muted rounded-md p-3 overflow-auto whitespace-pre-wrap break-all">
                {JSON.stringify(draft, null, 2)}
              </pre>
            </SheetContent>
          </Sheet>
        </div>

        {/* Scrollable preview area */}
        <div
          ref={previewScrollRef}
          className="flex-1 overflow-auto bg-muted/30 flex items-start justify-center p-6"
        >
          {isClient && (
            <PagePreview
              template={activeDraft}
              sampleData={sampleData}
              contract={contract}
              selectedSlotKey={selectedSlotKey}
              onSlotClick={(key) =>
                setSelectedSlotKey(selectedSlotKey === key ? null : key)
              }
              onSlotUpdate={handleSlotUpdate}
              onSlotSave={handleSaveSlot}
              onSlotDelete={handleDeleteSlot}
              scale={previewScale}
              previewMode={previewMode}
              backgroundImage={backgroundImage}
              allEdges={allEdges}
            />
          )}
        </div>
      </div>
    </div>
  );
}
