"use client";

import React, { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/style/components/sheet";
import { Button } from "@/style/components/button";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import { conversionSchema } from "./conversionEditorZod";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/style/components/field";
import { Input } from "@/style/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";
import {
  UnitConversion,
  UnitContext,
  UNIT_CONTEXTS,
} from "@/app/realGreen/product/_lib/types/ProductUnitConfigTypes";
import { Metric, Unit } from "@/app/realGreen/product/_lib/types/UnitTypes";
import {
  ProductCommon,
  ProductCommonDoc,
} from "@/app/realGreen/product/_lib/types/ProductTypes";

interface ConversionEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversion: UnitConversion | null;
  product: ProductCommonDoc | null;
  baseMetric: Metric;
  onSave: (conversion: UnitConversion) => Promise<void>;
  mode: "add" | "edit";
}

export function ConversionEditor({
  open,
  onOpenChange,
  product,
  conversion,
  baseMetric,
  onSave,
  mode,
}: ConversionEditorProps) {
  const [context, setContext] = useState<UnitContext>("load");
  const [unitLabel, setUnitLabel] = useState("");
  const [conversionFactor, setConversionFactor] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validation = conversionSchema.safeParse({
    context,
    unitLabel,
    conversionFactor,
  });

  const isValid = validation.success;

  React.useEffect(() => {
    if (open && conversion) {
      setContext(conversion.context);
      setUnitLabel(conversion.unitLabel);
      setConversionFactor(conversion.conversionFactor.toString());
      setErrors({});
    } else if (open) {
      // Reset for add mode
      setContext("load");
      setUnitLabel("");
      setConversionFactor("");
      setErrors({});
    }
  }, [open, conversion]);

  const handleSave = async () => {
    const result = conversionSchema.safeParse({
      context,
      unitLabel,
      conversionFactor,
    });

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (typeof field === "string") {
          newErrors[field] = issue.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    setStatus("saving");
    try {
      const newConversion: UnitConversion = {
        context,
        unitLabel: result.data.unitLabel,
        conversionFactor: result.data.conversionFactor,
        baseMetric,
      };

      await onSave(newConversion);
      setStatus("success");
    } catch (error) {
      console.error("Failed to save conversion", error);
      setStatus("idle");
    }
  };

  if (!product) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="space-y-4 sm:max-w-[540px]">
        <SheetHeader>
          <SheetTitle>
            {mode === "add" ? "Add Conversion" : "Edit Conversion"}
          </SheetTitle>
          <SheetDescription>
            Configure how this product is measured in different contexts (loading,
            purchasing). Application context uses base units.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <FieldGroup>
            <Field orientation="grid">
              <FieldLabel>Context Unit</FieldLabel>
              <FieldContent>
                <Select
                  value={context}
                  onValueChange={(value) => setContext(value as UnitContext)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(UNIT_CONTEXTS).map(([key, label]) => (
                      <SelectItem
                        key={key}
                        value={key}
                        disabled={key === "app"}
                      >
                        {label}
                        {key === "app" && " (base unit)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Application context is automatically set to base units
                </p>
              </FieldContent>
            </Field>

            <Field orientation="grid">
              <FieldLabel>Unit Label</FieldLabel>
              <FieldContent>
                <Input
                  placeholder='e.g. "Bags" or "Pallets"'
                  value={unitLabel}
                  onChange={(e) => setUnitLabel(e.target.value)}
                  disabled={context === "app"}
                />
                {errors.unitLabel && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.unitLabel}
                  </p>
                )}
              </FieldContent>
            </Field>

            <Field orientation="grid">
              <FieldLabel>Conversion Factor</FieldLabel>
              <FieldContent>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g., 50 for 50lb bag"
                  value={conversionFactor}
                  onChange={(e) => setConversionFactor(e.target.value)}
                />
                {errors.conversionFactor && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.conversionFactor}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  How many base units in this conversion unit
                </p>
              </FieldContent>
            </Field>

            <Field orientation="grid">
              <FieldLabel>Base Metric</FieldLabel>
              <FieldContent>
                <Input value={`${baseMetric} (${product.unit.desc})`} disabled className="capitalize" />
                <p className="text-xs text-muted-foreground mt-1">
                  From product&#39;s unit definition
                </p>
              </FieldContent>
            </Field>

          </FieldGroup>
        </form>

        <SheetFooter>
          <Button
            variant="destructive"
            intensity="soft"
            onClick={() => onOpenChange(false)}
            disabled={status === "saving" || status === "success"}
          >
            Cancel
          </Button>
          <SaveButton
            variant="primary"
            onClick={handleSave}
            disabled={status === "saving" || !isValid}
            status={status}
            onSuccessComplete={() => {
              onOpenChange(false);
              setStatus("idle");
            }}
          >
            Save
          </SaveButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
