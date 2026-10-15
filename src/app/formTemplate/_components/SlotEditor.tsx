"use client";

import { useState } from "react";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { Button } from "@/style/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";
import type { FormLetterSlotDoc } from "@/app/formTemplate/FormTemplateTypes";
import { hasOptions, type AnyFieldDescriptor } from "@/app/formTemplate/formLetterDataTypes";
import { getSchemaDefaults, type OptionValue } from "@/app/formTemplate/slotOptionSchema";

type SlotEditorProps = {
  slot: FormLetterSlotDoc;
  slotLabel: string;
  /** The descriptor for this slot — used to render option controls when present. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  descriptor?: AnyFieldDescriptor<any>;
  onSave: (slot: FormLetterSlotDoc) => void;
  onDelete: (key: string) => void;
};

/**
 * Form for editing a slot's position and configurable options.
 * The contract owns all rendering decisions — this editor only exposes position
 * and any options declared in the descriptor's `optionSchema`.
 */
export function SlotEditor({ slot, slotLabel, descriptor, onSave, onDelete }: SlotEditorProps) {
  const [x, setX] = useState(String(slot.x));
  const [y, setY] = useState(String(slot.y));
  const [width, setWidth] = useState(String(slot.width));
  const [height, setHeight] = useState(String(slot.height));

  // Initialise options from stored values merged with schema defaults
  const optionSchema = descriptor && hasOptions(descriptor) ? descriptor.optionSchema : null;
  const schemaDefaults = optionSchema ? getSchemaDefaults(optionSchema) : {};
  const [options, setOptions] = useState<Record<string, OptionValue>>({
    ...schemaDefaults,
    ...(slot.options ?? {}),
  });

  function setOption(key: string, value: OptionValue) {
    setOptions((prev) => ({ ...prev, [key]: value }));
  }

  function buildSlot(): FormLetterSlotDoc {
    const base: FormLetterSlotDoc = {
      key: slot.key,
      x: parseFloat(x) || 0,
      y: parseFloat(y) || 0,
      width: parseFloat(width) || 1,
      height: parseFloat(height) || 0.25,
    };
    if (optionSchema) {
      base.options = options;
    }
    return base;
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

      {/* Options — rendered from optionSchema when present */}
      {optionSchema && Object.keys(optionSchema).length > 0 && (
        <>
          <hr className="border-border" />
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Options
          </div>
          <div className="flex flex-col gap-2">
            {Object.entries(optionSchema).map(([key, fieldSchema]) => {
              const currentValue = options[key] ?? schemaDefaults[key as keyof typeof schemaDefaults];

              if (fieldSchema.type === "number") {
                return (
                  <div key={key} className="flex flex-col gap-1">
                    <Label htmlFor={`opt-${key}`}>{fieldSchema.label}</Label>
                    <Input
                      id={`opt-${key}`}
                      type="number"
                      step={fieldSchema.step ?? 1}
                      min={fieldSchema.min}
                      max={fieldSchema.max}
                      value={String(currentValue)}
                      onChange={(e) => setOption(key, parseFloat(e.target.value) || fieldSchema.default)}
                    />
                  </div>
                );
              }

              if (fieldSchema.type === "select") {
                return (
                  <div key={key} className="flex flex-col gap-1">
                    <Label htmlFor={`opt-${key}`}>{fieldSchema.label}</Label>
                    <Select
                      value={String(currentValue)}
                      onValueChange={(v) => {
                        // Preserve the original type (number vs string) from the default
                        const typed = typeof fieldSchema.default === "number" ? parseFloat(v) : v;
                        setOption(key, typed as OptionValue);
                      }}
                    >
                      <SelectTrigger id={`opt-${key}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldSchema.choices.map((choice) => (
                          <SelectItem key={String(choice.value)} value={String(choice.value)}>
                            {choice.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              }

              if (fieldSchema.type === "boolean") {
                return (
                  <div key={key} className="flex items-center gap-2">
                    <input
                      id={`opt-${key}`}
                      type="checkbox"
                      checked={Boolean(currentValue)}
                      onChange={(e) => setOption(key, e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <Label htmlFor={`opt-${key}`}>{fieldSchema.label}</Label>
                  </div>
                );
              }

              return null;
            })}
          </div>
        </>
      )}

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
