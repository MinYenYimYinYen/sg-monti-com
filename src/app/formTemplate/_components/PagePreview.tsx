"use client";

import Image from "next/image";
import type { StaticImageData } from "next/image";
import { useState } from "react";
import { cn } from "@/style/utils";
import type { FieldDescriptor } from "@/app/formTemplate/formLetterDataTypes";
import { DragHandle, type GuideLine } from "./DragHandle";
import { PDFViewer } from "@react-pdf/renderer";
import { FormLetterDocument } from "@/lib/pdf/FormLetterDocument";
import type { FormLetterTemplateDoc, FormLetterSlotDoc } from "@/app/formTemplate/FormTemplateTypes";
import type { SlotEdges } from "@/app/formTemplate/formTemplateSelect";
import { SlotEditor } from "./SlotEditor";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import { Settings } from "lucide-react";

const INCH_PX = 96; // 96px per inch at standard screen DPI

type PageSize = "LETTER" | "LEGAL";

const PAGE_DIMENSIONS: Record<PageSize, { width: number; height: number }> = {
  LETTER: { width: 8.5, height: 11 },
  LEGAL: { width: 8.5, height: 14 },
};

type SlotPatch = { x?: number; y?: number; width?: number; height?: number };

type PagePreviewProps = {
  template: FormLetterTemplateDoc;
  sampleData: unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contract: Record<string, FieldDescriptor<any>>;
  selectedSlotKey?: string | null;
  onSlotClick?: (key: string) => void;
  /** Called when the user drags a handle to reposition/resize a slot. */
  onSlotUpdate?: (key: string, patch: SlotPatch) => void;
  /** Called when the user saves slot edits from the popover. */
  onSlotSave?: (slot: FormLetterSlotDoc) => void;
  /** Called when the user removes a slot from the popover. */
  onSlotDelete?: (key: string) => void;
  /** Scale factor for fitting the page into the panel. Default: 1. */
  scale?: number;
  /**
   * "handles" — CSS overlay with drag handles and `previewRender` content.
   * "pdf" — live PDFViewer rendering the actual PDF output.
   */
  previewMode?: "handles" | "pdf";
  /** Optional background image of the physical form, rendered faintly behind the slots. */
  backgroundImage?: StaticImageData;
  /** Edge map for all slots — passed to DragHandle for snap alignment. */
  allEdges?: Map<string, SlotEdges>;
};

/**
 * Two-mode page preview for the form template editor.
 *
 * **Handles mode**: CSS overlay with the background form image, slot bounding boxes,
 * drag handles for repositioning, and `previewRender` content from the contract.
 * Each slot has a settings popover for editing position values and removing the slot.
 * During Ctrl+drag, snapped-to slots highlight their borders.
 *
 * **PDF mode**: Live `PDFViewer` rendering the actual PDF output via `FormLetterDocument`.
 * No drag interaction is available in this mode.
 */
export function PagePreview({
  template,
  sampleData,
  contract,
  selectedSlotKey,
  onSlotClick,
  onSlotUpdate,
  onSlotSave,
  onSlotDelete,
  scale = 1,
  previewMode = "handles",
  backgroundImage,
  allEdges,
}: PagePreviewProps) {
  const { width, height } = PAGE_DIMENSIONS[template.pageSize];
  const pxWidth = width * INCH_PX * scale;
  const pxHeight = height * INCH_PX * scale;
  const gridSize = INCH_PX * scale;

  // Guide lines emitted by DragHandle during Ctrl+drag snap
  const [guideLines, setGuideLines] = useState<GuideLine[]>([]);

  // ── PDF mode ──────────────────────────────────────────────────────────────
  if (previewMode === "pdf") {
    return (
      <div
        className="relative bg-white shadow-lg border border-border shrink-0"
        style={{ width: pxWidth, height: pxHeight }}
      >
        <PDFViewer style={{ width: "100%", height: "100%", border: "none" }}>
          <FormLetterDocument
            template={template}
            data={sampleData}
            contract={contract}
          />
        </PDFViewer>
      </div>
    );
  }

  // ── Handles mode ──────────────────────────────────────────────────────────
  // Derive the set of slot keys that are currently snapped to (for border highlight)
  const snappedKeys = new Set(guideLines.map((g) => g.sourceKey));

  return (
    <div
      className="relative bg-white shadow-lg border border-border shrink-0"
      style={{
        width: pxWidth,
        height: pxHeight,
        backgroundImage: `radial-gradient(circle, #d1d5db 1px, transparent 1px)`,
        backgroundSize: `${gridSize}px ${gridSize}px`,
      }}
    >
      {/* Background form image — rendered faintly behind the slot boxes */}
      {backgroundImage && (
        <Image
          src={backgroundImage}
          alt="Form background"
          fill
          className="object-contain opacity-25 pointer-events-none select-none"
          priority
        />
      )}

      {/* Snap guide lines — shown during Ctrl+drag */}
      {guideLines.map((guide, i) => (
        <div
          key={i}
          className="absolute z-30 pointer-events-none bg-primary/60"
          style={
            guide.axis === "x"
              ? {
                  left: guide.position * INCH_PX * scale,
                  top: 0,
                  width: 1,
                  height: pxHeight,
                }
              : {
                  top: guide.position * INCH_PX * scale,
                  left: 0,
                  height: 1,
                  width: pxWidth,
                }
          }
        />
      ))}

      {template.slots.map((slot) => {
        const left = slot.x * INCH_PX * scale;
        const top = slot.y * INCH_PX * scale;
        const slotWidth = slot.width * INCH_PX * scale;
        const slotHeight = slot.height * INCH_PX * scale;
        const isSelected = slot.key === selectedSlotKey;
        const isSnapped = snappedKeys.has(slot.key);
        const descriptor = contract[slot.key];
        const slotLabel = descriptor?.label ?? slot.key;

        const borderClass = isSelected
          ? "border border-primary bg-primary/10"
          : isSnapped
            ? "border-2 border-primary bg-primary/15"
            : "border border-dashed border-muted-foreground/40 hover:border-primary/60 hover:bg-primary/5";

        return (
          <div
            key={slot.key}
            onClick={() => onSlotClick?.(slot.key)}
            className={cn("absolute overflow-visible cursor-pointer group", borderClass)}
            style={{ left, top, width: slotWidth, height: slotHeight }}
          >
            {/* Drag handles — only shown on the selected slot */}
            {isSelected && onSlotUpdate && (
              <DragHandle
                x={slot.x}
                y={slot.y}
                width={slot.width}
                height={slot.height}
                scale={scale}
                onUpdate={(patch) => onSlotUpdate(slot.key, patch)}
                onGuides={setGuideLines}
                allEdges={allEdges}
                slotKey={slot.key}
              />
            )}

            {/* Settings popover — shown on hover/selection in top-right corner */}
            {(onSlotSave || onSlotDelete) && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "absolute z-30 top-0 right-0 p-0.5 rounded-bl-sm transition-opacity",
                      "bg-card/80 hover:bg-card text-muted-foreground hover:text-foreground",
                      isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                    )}
                    title="Edit slot"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="right"
                  align="start"
                  className="w-64 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <SlotEditor
                    key={slot.key}
                    slot={slot}
                    slotLabel={slotLabel}
                    onSave={(updated) => {
                      onSlotSave?.(updated);
                    }}
                    onDelete={(key) => {
                      onSlotDelete?.(key);
                    }}
                  />
                </PopoverContent>
              </Popover>
            )}

            {/* Slot label (key) shown in top-left corner */}
            <div
              className="absolute top-0 left-0 pointer-events-none"
              style={{ fontSize: 7 * scale, lineHeight: 1.2, padding: 1 }}
            >
              <span className="font-mono font-semibold text-primary/70 leading-none">
                {slot.key}
              </span>
            </div>

            {/* Content rendered via the contract's previewRender — passes full sampleData */}
            {descriptor && (
              <div className="w-full h-full p-px overflow-hidden">
                {descriptor.previewRender(sampleData, scale)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
