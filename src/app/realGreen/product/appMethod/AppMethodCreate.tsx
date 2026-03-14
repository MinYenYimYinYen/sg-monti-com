"use client";

import React, { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/style/components/card";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { Checkbox } from "@/style/components/checkbox";
import { Button } from "@/style/components/button";
import {
  MultiSelect,
  MultiSelectTrigger,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectValue,
} from "@/components/MultiSelect";
import { appMethodSelect } from "./appMethodSelect";
import { useAppMethod } from "./useAppMethod";
import { AppMethodDoc, baseAppMethodDoc } from "./AppMethodTypes";
import { validateAppMethod, ValidationIssue } from "./crudUtils";
import { useCardStack } from "@/components/CardStack/useCardStack";
import { cn } from "@/style/utils";

export function AppMethodCreate() {
  const { upsertAppMethod } = useAppMethod({});
  const appMethods = useSelector(appMethodSelect.appMethods);
  const volumeUnits = useSelector(appMethodSelect.volumeUnits);
  const { deselectCard } = useCardStack();

  const [formData, setFormData] = useState<AppMethodDoc>({
    ...baseAppMethodDoc,
    appMethodId: "",
    description: "",
  });

  const [touchedFields, setTouchedFields] = useState<Set<keyof AppMethodDoc>>(
    new Set()
  );

  const existingIds = useMemo(
    () => appMethods.map((m) => m.appMethodId),
    [appMethods]
  );

  const validation = useMemo(
    () => validateAppMethod(formData, existingIds, false),
    [formData, existingIds]
  );

  const getFieldError = (field: keyof AppMethodDoc): string | undefined => {
    if (!touchedFields.has(field)) return undefined;
    return validation.issues.find((issue) => issue.field === field)?.message;
  };

  const handleBlur = (field: keyof AppMethodDoc) => {
    setTouchedFields((prev) => new Set(prev).add(field));
  };

  const handleSave = async () => {
    if (!validation.isValid) return;
    await upsertAppMethod(formData);
    setFormData({
      ...baseAppMethodDoc,
      appMethodId: "",
      description: "",
    });
    deselectCard();
    setTouchedFields(new Set());
  };

  const handleCancel = () => {
    setFormData({
      ...baseAppMethodDoc,
      appMethodId: "",
      description: "",
    });
    deselectCard();
  };

  const updateField = <K extends keyof AppMethodDoc>(
    field: K,
    value: AppMethodDoc[K]
  ) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <>
      <CardHeader>
        <CardTitle>Create New Method</CardTitle>
        <CardDescription>
          Add a new application method
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label>App Method ID</Label>
            <Input
              value={formData.appMethodId}
              onChange={(e) => updateField("appMethodId", e.target.value)}
              onBlur={() => handleBlur("appMethodId")}
              placeholder="e.g., STANDARD"
              className={cn(getFieldError("appMethodId") && "border-destructive")}
            />
            {getFieldError("appMethodId") && (
              <p className="text-sm text-destructive">
                {getFieldError("appMethodId")}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Description</Label>
            <Input
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              onBlur={() => handleBlur("description")}
              placeholder="Method description"
              className={cn(getFieldError("description") && "border-destructive")}
            />
            {getFieldError("description") && (
              <p className="text-sm text-destructive">
                {getFieldError("description")}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Speed (sec/90ft)</Label>
            <Input
              type="number"
              value={formData.speed}
              onChange={(e) => updateField("speed", parseFloat(e.target.value))}
              onBlur={() => handleBlur("speed")}
              className={cn(getFieldError("speed") && "border-destructive")}
            />
            {getFieldError("speed") && (
              <p className="text-sm text-destructive">
                {getFieldError("speed")}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Width (ft)</Label>
            <Input
              type="number"
              value={formData.width}
              onChange={(e) => updateField("width", parseFloat(e.target.value))}
              onBlur={() => handleBlur("width")}
              className={cn(getFieldError("width") && "border-destructive")}
            />
            {getFieldError("width") && (
              <p className="text-sm text-destructive">
                {getFieldError("width")}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Flow Rate</Label>
            <Input
              type="number"
              value={formData.flowRate}
              onChange={(e) =>
                updateField("flowRate", parseFloat(e.target.value))
              }
              onBlur={() => handleBlur("flowRate")}
              className={cn(getFieldError("flowRate") && "border-destructive")}
            />
            {getFieldError("flowRate") && (
              <p className="text-sm text-destructive">
                {getFieldError("flowRate")}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Flow Rate Unit</Label>
            <MultiSelect
              mode="single"
              value={formData.flowRateUnitId !== -1 ? [formData.flowRateUnitId.toString()] : []}
              onValueChange={(values) =>
                updateField("flowRateUnitId", values[0] ? parseInt(values[0]) : -1)
              }
            >
              <MultiSelectTrigger
                className={cn(
                  getFieldError("flowRateUnitId") && "border-destructive"
                )}
                onBlur={() => handleBlur("flowRateUnitId")}
              >
                <MultiSelectValue placeholder="Select unit">
                  {(values) => {
                    const selectedUnit = volumeUnits.find(
                      (u) => u.unitId.toString() === values[0]
                    );
                    return (
                      <span className="flex-1 text-left truncate">
                        {selectedUnit?.desc}
                      </span>
                    );
                  }}
                </MultiSelectValue>
              </MultiSelectTrigger>
              <MultiSelectContent className="max-h-60">
                {volumeUnits.map((unit) => (
                  <MultiSelectItem key={unit.unitId} value={unit.unitId.toString()}>
                    {unit.desc}
                  </MultiSelectItem>
                ))}
              </MultiSelectContent>
            </MultiSelect>
            {getFieldError("flowRateUnitId") && (
              <p className="text-sm text-destructive">
                {getFieldError("flowRateUnitId")}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="doubleOverlap-create"
              checked={formData.doubleOverlap}
              onCheckedChange={(checked) =>
                updateField("doubleOverlap", checked as boolean)
              }
            />
            <Label htmlFor="doubleOverlap-create">Double Overlap</Label>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!validation.isValid}>
              Save
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </>
  );
}
