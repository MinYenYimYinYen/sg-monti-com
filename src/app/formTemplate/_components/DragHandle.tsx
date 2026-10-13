"use client";

import { useEffect, useRef } from "react";
import { Move } from "lucide-react";

const INCH_PX = 96;
const HANDLE_THICKNESS = 6; // px — thickness of edge handles
const HANDLE_INSET = 3;     // px — how far inside the slot edge the handle sits
const CENTER_SIZE = 16;     // px — size of the center move handle
const MIN_INCHES = 0.1;

type SlotPatch = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

type DragHandleProps = {
  /** Slot position and size in inches */
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  onUpdate: (patch: SlotPatch) => void;
};

type HandleType = "left" | "right" | "top" | "bottom" | "move";

const HANDLE_CURSORS: Record<HandleType, string> = {
  left: "ew-resize",
  right: "ew-resize",
  top: "ns-resize",
  bottom: "ns-resize",
  move: "move",
};

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

/**
 * Renders drag handles on a selected slot in the page preview.
 * - Left/right edge handles resize width (left also adjusts x to keep right edge fixed)
 * - Top/bottom edge handles resize height (top also adjusts y to keep bottom edge fixed)
 * - Center handle moves the slot (changes x and y, keeps size fixed)
 * Each handle changes only one dimension at a time for precise form alignment.
 */
export function DragHandle({ x, y, width, height, scale, onUpdate }: DragHandleProps) {
  const pxPerInch = INCH_PX * scale;

  const pxW = width * pxPerInch;
  const pxH = height * pxPerInch;

  const dragRef = useRef<{
    type: HandleType;
    startMouseX: number;
    startMouseY: number;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  function startDrag(type: HandleType, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    dragRef.current = {
      type,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: x,
      startY: y,
      startW: width,
      startH: height,
    };
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const drag = dragRef.current;
      if (!drag) return;

      const dxPx = e.clientX - drag.startMouseX;
      const dyPx = e.clientY - drag.startMouseY;
      const dxIn = dxPx / pxPerInch;
      const dyIn = dyPx / pxPerInch;

      const patch: SlotPatch = {};

      switch (drag.type) {
        case "move":
          patch.x = round3(Math.max(0, drag.startX + dxIn));
          patch.y = round3(Math.max(0, drag.startY + dyIn));
          break;

        case "left":
          // Move left edge: x changes, right edge stays fixed (width shrinks/grows)
          patch.x = round3(Math.max(0, drag.startX + dxIn));
          patch.width = round3(Math.max(MIN_INCHES, drag.startW - dxIn));
          break;

        case "right":
          // Move right edge: only width changes
          patch.width = round3(Math.max(MIN_INCHES, drag.startW + dxIn));
          break;

        case "top":
          // Move top edge: y changes, bottom edge stays fixed (height shrinks/grows)
          patch.y = round3(Math.max(0, drag.startY + dyIn));
          patch.height = round3(Math.max(MIN_INCHES, drag.startH - dyIn));
          break;

        case "bottom":
          // Move bottom edge: only height changes
          patch.height = round3(Math.max(MIN_INCHES, drag.startH + dyIn));
          break;
      }

      onUpdate(patch);
    }

    function onMouseUp() {
      dragRef.current = null;
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [pxPerInch, onUpdate]);

  return (
    <>
      {/* Left edge handle */}
      <div
        onMouseDown={(e) => startDrag("left", e)}
        className="absolute z-20 bg-primary/60 hover:bg-primary rounded-sm"
        style={{
          left: HANDLE_INSET,
          top: HANDLE_INSET,
          width: HANDLE_THICKNESS,
          height: Math.max(0, pxH - HANDLE_INSET * 2),
          cursor: HANDLE_CURSORS.left,
        }}
      />

      {/* Right edge handle */}
      <div
        onMouseDown={(e) => startDrag("right", e)}
        className="absolute z-20 bg-primary/60 hover:bg-primary rounded-sm"
        style={{
          right: HANDLE_INSET,
          top: HANDLE_INSET,
          width: HANDLE_THICKNESS,
          height: Math.max(0, pxH - HANDLE_INSET * 2),
          cursor: HANDLE_CURSORS.right,
        }}
      />

      {/* Top edge handle */}
      <div
        onMouseDown={(e) => startDrag("top", e)}
        className="absolute z-20 bg-primary/60 hover:bg-primary rounded-sm"
        style={{
          top: HANDLE_INSET,
          left: HANDLE_INSET + HANDLE_THICKNESS,
          right: HANDLE_INSET + HANDLE_THICKNESS,
          height: HANDLE_THICKNESS,
          cursor: HANDLE_CURSORS.top,
        }}
      />

      {/* Bottom edge handle */}
      <div
        onMouseDown={(e) => startDrag("bottom", e)}
        className="absolute z-20 bg-primary/60 hover:bg-primary rounded-sm"
        style={{
          bottom: HANDLE_INSET,
          left: HANDLE_INSET + HANDLE_THICKNESS,
          right: HANDLE_INSET + HANDLE_THICKNESS,
          height: HANDLE_THICKNESS,
          cursor: HANDLE_CURSORS.bottom,
        }}
      />

      {/* Center move handle */}
      <div
        onMouseDown={(e) => startDrag("move", e)}
        className="absolute z-20 flex items-center justify-center text-primary opacity-70 hover:opacity-100"
        style={{
          left: pxW / 2 - CENTER_SIZE / 2,
          top: pxH / 2 - CENTER_SIZE / 2,
          width: CENTER_SIZE,
          height: CENTER_SIZE,
          cursor: HANDLE_CURSORS.move,
        }}
      >
        <Move className="w-3 h-3" />
      </div>
    </>
  );
}
