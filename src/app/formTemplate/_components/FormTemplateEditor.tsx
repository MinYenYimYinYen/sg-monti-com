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
  type AnyFieldDescriptor,
} from "@/app/formTemplate/formLetterDataTypes";
import { hasOptions } from "@/app/formTemplate/formLetterDataTypes";
import { getSchemaDefaults } from "@/app/formTemplate/slotOptionSchema";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/style/components/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/style/components/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import type { FormLetterSlotDoc } from "@/app/formTemplate/FormTemplateTypes";
import { Braces, Minus, Plus, FileText, Move, Eye, Save } from "lucide-react";
import { useIsClient } from "@/lib/hooks/useIsClient";
import { SamplePdfDownload } from "./SamplePdfDownload";

const INCH_PX = 96;
const ZOOM_STEP = 0.1;
/** Default slot dimensions in inches when a new slot is added. */
const DEFAULT_SLOT_WIDTH = 2;
const DEFAULT_SLOT_HEIGHT = 0.25;

type LeftTab = "config" | "addFields" | "customize";

/** Generates a unique slotId for a new slot instance. */
function makeSlotId(): string {
  return `slot_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

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
    const centerXIn = (scrollLeft + clientWidth / 2) / (INCH_PX * scale);
    const centerYIn = (scrollTop + clientHeight / 2) / (INCH_PX * scale);
    x = Math.max(0, centerXIn - DEFAULT_SLOT_WIDTH / 2);
    y = Math.max(0, centerYIn - DEFAULT_SLOT_HEIGHT / 2);
  }

  return {
    slotId: makeSlotId(),
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
 * Left: tabbed panel (Config / Add Fields / Customize).
 * Right: page preview with isDirty save trigger in the toolbar.
 */
export function FormTemplateEditor() {
  const dispatch = useAppDispatch();
  const draft = useSelector(formTemplateSelect.draft);
  const templates = useSelector(formTemplateSelect.templates);
  const previewScale = useSelector(formTemplateSelect.previewScale);
  const previewMode = useSelector(formTemplateSelect.previewMode);
  const allEdges = useSelector(formTemplateSelect.draftSlotEdges);
  const isDirty = useSelector(formTemplateSelect.isDirty);

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<LeftTab>("config");
  const isClient = useIsClient();

  // Ref to the scrollable preview container
  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  // Ref to the left panel scroll container (for scrolling accordion items into view)
  const leftPanelScrollRef = useRef<HTMLDivElement | null>(null);
  // Map of slotId → accordion item DOM element for scroll-into-view
  const accordionItemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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

  const descriptor = FORM_LETTER_DATA_TYPE_REGISTRY[draft.dataType];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contract: Record<string, AnyFieldDescriptor<any>> = descriptor?.contract ?? {};
  const availableKeys = descriptor ? Object.keys(contract) : [];
  const sampleData = descriptor?.sampleData ?? {};
  const backgroundImage = descriptor?.backgroundImage;
  const activeDraft = draft;

  function handleAddKey(key: string) {
    const slot = makeSlotForKey(key, previewScrollRef.current, previewScale);
    dispatch(formTemplateActions.addDraftSlot(slot));
    setSelectedSlotId(slot.slotId);
    setActiveTab("customize");
    // Scroll to the new item after React renders it
    setTimeout(() => {
      const el = accordionItemRefs.current.get(slot.slotId);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  }

  function handleSaveSlot(updated: FormLetterSlotDoc) {
    dispatch(
      formTemplateActions.updateDraftSlot({
        slotId: updated.slotId,
        slot: updated,
      }),
    );
    setSelectedSlotId(updated.slotId);
  }

  function handleSlotUpdate(slotId: string, patch: { x?: number; y?: number; width?: number; height?: number }) {
    const slot = activeDraft.slots.find((s) => s.slotId === slotId);
    if (!slot) return;
    dispatch(
      formTemplateActions.updateDraftSlot({
        slotId,
        slot: { ...slot, ...patch },
      }),
    );
  }

  function handleDeleteSlot(slotId: string) {
    dispatch(formTemplateActions.removeDraftSlot(slotId));
    setSelectedSlotId(null);
  }

  function handleSlotClickFromPreview(slotId: string) {
    const newSelected = selectedSlotId === slotId ? null : slotId;
    setSelectedSlotId(newSelected);
    if (newSelected) {
      // Switch to Customize tab and scroll the accordion item into view
      setActiveTab("customize");
      setTimeout(() => {
        const el = accordionItemRefs.current.get(newSelected);
        el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 50);
    }
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
      <div className="w-80 shrink-0 flex flex-col border-r border-border bg-card overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as LeftTab)}
          className="flex flex-col h-full overflow-hidden"
        >
          <TabsList className="shrink-0 w-full rounded-none border-b border-border justify-start px-2 pt-2 pb-0 h-auto bg-transparent gap-0">
            <TabsTrigger value="config" className="text-xs rounded-b-none">Config</TabsTrigger>
            <TabsTrigger value="addFields" className="text-xs rounded-b-none">Add Fields</TabsTrigger>
            <TabsTrigger value="customize" className="text-xs rounded-b-none">
              Customize
              {activeDraft.slots.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-primary/15 text-primary rounded-full px-1.5 py-0.5 leading-none">
                  {activeDraft.slots.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Config tab ── */}
          <TabsContent value="config" className="flex-1 overflow-y-auto p-3 mt-0 flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="tpl-name">Template Name</Label>
                <Input
                  id="tpl-name"
                  value={draft.templateName}
                  onChange={(e) =>
                    dispatch(formTemplateActions.updateDraft({ templateName: e.target.value }))
                  }
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label>Data Type</Label>
                <Select
                  value={draft.dataType}
                  onValueChange={(v) =>
                    dispatch(formTemplateActions.updateDraft({ dataType: v as FormLetterDataType }))
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
                    dispatch(formTemplateActions.updateDraft({ pageSize: v as "LETTER" | "LEGAL" }))
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

            <div className="flex flex-col gap-2">
              <Button variant="primary" intensity="solid" onClick={handleSaveTemplate}>
                Save Template
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" intensity="ghost">
                    Delete Template
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete "{draft.templateName}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the template. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteTemplate}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                variant="outline"
                intensity="ghost"
                onClick={() => dispatch(formTemplateActions.clearDraft())}
              >
                Close
              </Button>
            </div>
          </TabsContent>

          {/* ── Add Fields tab ── */}
          <TabsContent value="addFields" className="flex-1 overflow-y-auto p-3 mt-0 flex flex-col gap-1">
            {availableKeys.length === 0 && (
              <p className="text-sm text-muted-foreground">No fields available for this data type.</p>
            )}
            {availableKeys.map((key) => {
              const fieldDescriptor = contract[key];
              return (
                <div key={key} className="flex items-center gap-1">
                  <button
                    onClick={() => handleAddKey(key)}
                    className="flex-1 text-left text-sm px-2 py-1.5 rounded-md transition-colors hover:bg-accent/20 text-foreground"
                  >
                    <span className="font-medium">{fieldDescriptor?.label ?? key}</span>
                    <span className="ml-2 text-xs text-muted-foreground opacity-70">+ add</span>
                  </button>

                  {/* Preview popover */}
                  {fieldDescriptor && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title={`Preview ${fieldDescriptor.label ?? key}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="right" align="start" className="w-72 p-3">
                        <div className="text-xs font-semibold text-muted-foreground mb-2">
                          {fieldDescriptor.label ?? key}
                        </div>
                        <div className="bg-white border border-border rounded p-2 min-h-6 text-sm overflow-hidden">
                          {hasOptions(fieldDescriptor)
                            ? fieldDescriptor.previewRender(
                                sampleData,
                                1,
                                getSchemaDefaults(fieldDescriptor.optionSchema),
                              )
                            : fieldDescriptor.previewRender(sampleData, 1)}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              );
            })}
          </TabsContent>

          {/* ── Customize tab ── */}
          <TabsContent
            value="customize"
            className="flex-1 overflow-y-auto p-3 mt-0 flex flex-col gap-2"
            ref={leftPanelScrollRef}
          >
            {activeDraft.slots.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No slots positioned yet. Go to "Add Fields" to place elements.
              </p>
            )}

            <Accordion
              type="single"
              collapsible
              value={selectedSlotId ?? ""}
              onValueChange={(value) => setSelectedSlotId(value || null)}
              className="flex flex-col gap-0"
            >
              {activeDraft.slots.map((slot) => (
                <AccordionItem
                  key={slot.slotId}
                  value={slot.slotId}
                  className="border-b-0"
                  ref={(el) => {
                    if (el) {
                      accordionItemRefs.current.set(slot.slotId, el);
                    } else {
                      accordionItemRefs.current.delete(slot.slotId);
                    }
                  }}
                >
                  <AccordionTrigger className="text-sm px-2 py-1.5 rounded-md hover:bg-muted hover:no-underline [&[data-state=open]]:bg-primary/10 [&[data-state=open]]:text-foreground [&[data-state=open]]:font-medium">
                    <span className="font-medium truncate">
                      {contract[slot.key]?.label ?? slot.key}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-1 pt-0">
                    <SlotEditor
                      key={slot.slotId}
                      slot={slot}
                      slotLabel={contract[slot.key]?.label ?? slot.key}
                      descriptor={contract[slot.key]}
                      onSave={handleSaveSlot}
                      onDelete={handleDeleteSlot}
                    />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>
        </Tabs>
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

          {/* Unsaved changes indicator */}
          {isDirty && (
            <Button
              size="sm"
              variant="primary"
              intensity="soft"
              onClick={handleSaveTemplate}
              title="Save unsaved changes"
            >
              <Save className="h-3 w-3 mr-1" />
              Save changes
            </Button>
          )}

          {/* Print Sample PDF download */}
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
          className={previewMode === "pdf"
            ? "flex-1 overflow-hidden"
            : "flex-1 overflow-auto bg-muted/30 flex items-start justify-center p-6"}
        >
          {isClient && (
            <PagePreview
              template={activeDraft}
              sampleData={sampleData}
              contract={contract}
              selectedSlotId={selectedSlotId}
              onSlotClick={handleSlotClickFromPreview}
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
