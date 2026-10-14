"use client";

import Image from "next/image";
import type { StaticImageData } from "next/image";
import { cn } from "@/style/utils";
import type { FieldDescriptor } from "@/app/formTemplate/formLetterDataTypes";
import { DragHandle } from "./DragHandle";
import { PDFViewer } from "@react-pdf/renderer";
import { FormLetterDocument } from "@/lib/pdf/FormLetterDocument";
import type { FormLetterTemplateDoc } from "@/app/formTemplate/FormTemplateTypes";

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
  /** Scale factor for fitting the page into the panel. Default: 1. */
  scale?: number;
  /**
   * "handles" — CSS overlay with drag handles and `previewRender` content.
   * "pdf" — live PDFViewer rendering the actual PDF output.
   */
  previewMode?: "handles" | "pdf";
  /** Optional background image of the physical form, rendered faintly behind the slots. */
  backgroundImage?: StaticImageData;
};

/**
 * Two-mode page preview for the form template editor.
 *
 * **Handles mode**: CSS overlay with the background form image, slot bounding boxes,
 * drag handles for repositioning, and `previewRender` content from the contract.
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
  scale = 1,
  previewMode = "handles",
  backgroundImage,
}: PagePreviewProps) {
  const { width, height } = PAGE_DIMENSIONS[template.pageSize];
  const pxWidth = width * INCH_PX * scale;
  const pxHeight = height * INCH_PX * scale;
  const gridSize = INCH_PX * scale;

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

      {template.slots.map((slot) => {
        const left = slot.x * INCH_PX * scale;
        const top = slot.y * INCH_PX * scale;
        const slotWidth = slot.width * INCH_PX * scale;
        const slotHeight = slot.height * INCH_PX * scale;
        const isSelected = slot.key === selectedSlotKey;
        const descriptor = contract[slot.key];

        const borderClass = isSelected
          ? "border border-primary bg-primary/10"
          : "border border-dashed border-muted-foreground/40 hover:border-primary/60 hover:bg-primary/5";

        return (
          <div
            key={slot.key}
            onClick={() => onSlotClick?.(slot.key)}
            className={cn("absolute overflow-visible cursor-pointer", borderClass)}
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
              />
            )}

            {/* Slot label (key + position) shown in top-left corner */}
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
