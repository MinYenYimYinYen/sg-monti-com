"use client";

import { useEffect, useRef } from "react";
import { Move } from "lucide-react";
import type { SlotEdges } from "@/app/formTemplate/formTemplateSelect";

const INCH_PX = 96;
const HANDLE_THICKNESS = 6; // px — thickness of edge handles
const HANDLE_INSET = 3;     // px — how far inside the slot edge the handle sits
const CENTER_SIZE = 16;     // px — size of the center move handle
const MIN_INCHES = 0.1;
const SNAP_THRESHOLD = 0.1; // inches — snap distance when Ctrl is held

type SlotPatch = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

export type GuideLine = {
  axis: "x" | "y";
  position: number;
  /** The key of the foreign slot whose edge triggered this snap. */
  sourceKey: string;
};

type DragHandleProps = {
  /** Slot position and size in inches */
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  onUpdate: (patch: SlotPatch) => void;
  /** Called during Ctrl+drag with active snap guide lines (in inches). */
  onGuides?: (guides: GuideLine[]) => void;
  /** Edge map for all other slots — used for snap alignment when Ctrl is held. */
  allEdges?: Map<string, SlotEdges>;
  /** Key of this slot — excluded from snap candidates. */
  slotKey?: string;
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
 * Finds the closest foreign edge value within the snap threshold.
 * Returns the snapped value, guide position, and source slot key, or null if nothing is close enough.
 */
function snapToEdges(
  value: number,
  foreignEntries: { value: number; key: string }[],
): { snapped: number; guide: number; sourceKey: string } | null {
  let best: { snapped: number; guide: number; sourceKey: string } | null = null;
  let bestDist = SNAP_THRESHOLD;
  for (const { value: fv, key } of foreignEntries) {
    const dist = Math.abs(value - fv);
    if (dist < bestDist) {
      bestDist = dist;
      best = { snapped: fv, guide: fv, sourceKey: key };
    }
  }
  return best;
}

/**
 * Renders drag handles on a selected slot in the page preview.
 * - Left/right edge handles resize width (left also adjusts x to keep right edge fixed)
 * - Top/bottom edge handles resize height (top also adjusts y to keep bottom edge fixed)
 * - Center handle moves the slot (changes x and y, keeps size fixed)
 *
 * When Ctrl is held during drag, edges snap to aligned edges of other slots and
 * guide lines are emitted via `onGuides`.
 */
export function DragHandle({
  x,
  y,
  width,
  height,
  scale,
  onUpdate,
  onGuides,
  allEdges,
  slotKey,
}: DragHandleProps) {
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

  // Track Ctrl key state in a ref to avoid re-renders
  const ctrlRef = useRef(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Control") ctrlRef.current = true;
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === "Control") {
        ctrlRef.current = false;
        onGuides?.([]);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [onGuides]);

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

      let newX = drag.startX;
      let newY = drag.startY;
      let newW = drag.startW;
      let newH = drag.startH;

      switch (drag.type) {
        case "move":
          newX = Math.max(0, drag.startX + dxIn);
          newY = Math.max(0, drag.startY + dyIn);
          break;
        case "left":
          newX = Math.max(0, drag.startX + dxIn);
          newW = Math.max(MIN_INCHES, drag.startW - dxIn);
          break;
        case "right":
          newW = Math.max(MIN_INCHES, drag.startW + dxIn);
          break;
        case "top":
          newY = Math.max(0, drag.startY + dyIn);
          newH = Math.max(MIN_INCHES, drag.startH - dyIn);
          break;
        case "bottom":
          newH = Math.max(MIN_INCHES, drag.startH + dyIn);
          break;
      }

      // ── Snap alignment when Ctrl is held ──────────────────────────────────
      const guides: GuideLine[] = [];

      if (ctrlRef.current && allEdges) {
        // Collect all foreign edge values with their source slot key
        const xEdges: { value: number; key: string }[] = [];
        const yEdges: { value: number; key: string }[] = [];
        for (const [key, edges] of allEdges) {
          if (key === slotKey) continue;
          xEdges.push(
            { value: edges.left, key },
            { value: edges.right, key },
            { value: edges.centerX, key },
          );
          yEdges.push(
            { value: edges.top, key },
            { value: edges.bottom, key },
            { value: edges.centerY, key },
          );
        }

        // Compute the dragged slot's current edges
        const dragLeft = newX;
        const dragRight = newX + newW;
        const dragCenterX = newX + newW / 2;
        const dragTop = newY;
        const dragBottom = newY + newH;
        const dragCenterY = newY + newH / 2;

        // Try snapping each edge of the dragged slot to foreign edges
        // X-axis snapping (affects x and/or width depending on handle)
        if (drag.type === "move" || drag.type === "left") {
          const snapLeft = snapToEdges(dragLeft, xEdges);
          if (snapLeft) {
            const delta = snapLeft.snapped - dragLeft;
            newX = snapLeft.snapped;
            if (drag.type === "left") newW = Math.max(MIN_INCHES, newW - delta);
            guides.push({ axis: "x", position: snapLeft.guide, sourceKey: snapLeft.sourceKey });
          } else {
            const snapCX = snapToEdges(dragCenterX, xEdges);
            if (snapCX && drag.type === "move") {
              newX = snapCX.snapped - newW / 2;
              guides.push({ axis: "x", position: snapCX.guide, sourceKey: snapCX.sourceKey });
            }
          }
        }
        if (drag.type === "move" || drag.type === "right") {
          const snapRight = snapToEdges(dragRight, xEdges);
          if (snapRight) {
            if (drag.type === "right") {
              newW = Math.max(MIN_INCHES, snapRight.snapped - newX);
            } else if (drag.type === "move") {
              newX = snapRight.snapped - newW;
            }
            guides.push({ axis: "x", position: snapRight.guide, sourceKey: snapRight.sourceKey });
          }
        }

        // Y-axis snapping
        if (drag.type === "move" || drag.type === "top") {
          const snapTop = snapToEdges(dragTop, yEdges);
          if (snapTop) {
            const delta = snapTop.snapped - dragTop;
            newY = snapTop.snapped;
            if (drag.type === "top") newH = Math.max(MIN_INCHES, newH - delta);
            guides.push({ axis: "y", position: snapTop.guide, sourceKey: snapTop.sourceKey });
          } else {
            const snapCY = snapToEdges(dragCenterY, yEdges);
            if (snapCY && drag.type === "move") {
              newY = snapCY.snapped - newH / 2;
              guides.push({ axis: "y", position: snapCY.guide, sourceKey: snapCY.sourceKey });
            }
          }
        }
        if (drag.type === "move" || drag.type === "bottom") {
          const snapBottom = snapToEdges(dragBottom, yEdges);
          if (snapBottom) {
            if (drag.type === "bottom") {
              newH = Math.max(MIN_INCHES, snapBottom.snapped - newY);
            } else if (drag.type === "move") {
              newY = snapBottom.snapped - newH;
            }
            guides.push({ axis: "y", position: snapBottom.guide, sourceKey: snapBottom.sourceKey });
          }
        }
      }

      onGuides?.(guides);

      const patch: SlotPatch = {};
      if (drag.type === "move" || drag.type === "left") {
        patch.x = round3(newX);
        patch.y = round3(newY);
      }
      if (drag.type === "move") {
        patch.x = round3(newX);
        patch.y = round3(newY);
      } else if (drag.type === "left") {
        patch.x = round3(newX);
        patch.width = round3(newW);
      } else if (drag.type === "right") {
        patch.width = round3(newW);
      } else if (drag.type === "top") {
        patch.y = round3(newY);
        patch.height = round3(newH);
      } else if (drag.type === "bottom") {
        patch.height = round3(newH);
      }

      onUpdate(patch);
    }

    function onMouseUp() {
      dragRef.current = null;
      onGuides?.([]);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [pxPerInch, onUpdate, onGuides, allEdges, slotKey]);

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
