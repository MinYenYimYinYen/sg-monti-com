"use client";

import { useState } from "react";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { Button } from "@/style/components/button";
import type { FormLetterSlotDoc } from "@/app/formTemplate/FormTemplateTypes";

type SlotEditorProps = {
  slot: FormLetterSlotDoc;
  slotLabel: string;
  onSave: (slot: FormLetterSlotDoc) => void;
  onDelete: (key: string) => void;
};

/**
 * Form for editing a slot's position.
 * The contract owns all rendering decisions — this editor only exposes position.
 */
export function SlotEditor({ slot, slotLabel, onSave, onDelete }: SlotEditorProps) {
  const [x, setX] = useState(String(slot.x));
  const [y, setY] = useState(String(slot.y));
  const [width, setWidth] = useState(String(slot.width));
  const [height, setHeight] = useState(String(slot.height));

  function buildSlot(): FormLetterSlotDoc {
    return {
      key: slot.key,
      x: parseFloat(x) || 0,
      y: parseFloat(y) || 0,
      width: parseFloat(width) || 1,
      height: parseFloat(height) || 0.25,
    };
  }

  return (
    <div className="flex flex-col gap-3 p-3 border border-border rounded-md bg-card">
      {/* Read-only key + label info */}
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">Field</span>
        <span className="text-sm font-medium">{slotLabel}</span>
        <span className="text-xs font-mono text-muted-foreground">{slot.key}</span>
      </div>

      {/* Position */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="slot-x">X (inches)</Label>
          <Input
            id="slot-x"
            type="number"
            step="0.125"
            value={x}
            onChange={(e) => setX(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="slot-y">Y (inches)</Label>
          <Input
            id="slot-y"
            type="number"
            step="0.125"
            value={y}
            onChange={(e) => setY(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="slot-width">Width (inches)</Label>
          <Input
            id="slot-width"
            type="number"
            step="0.125"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="slot-height">Height (inches)</Label>
          <Input
            id="slot-height"
            type="number"
            step="0.125"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="primary"
          intensity="solid"
          onClick={() => onSave(buildSlot())}
        >
          Apply
        </Button>
        <Button
          size="sm"
          variant="destructive"
          intensity="ghost"
          onClick={() => onDelete(slot.key)}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}
