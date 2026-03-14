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
import { AppMethod, AppMethodDoc } from "./AppMethodTypes";
import { validateAppMethod } from "./crudUtils";
import { useCardStack } from "@/components/CardStack/useCardStack";
import { cn } from "@/style/utils";

interface AppMethodEditProps {
  method: AppMethod;
}

export function AppMethodEdit({ method }: AppMethodEditProps) {
  const { upsertAppMethod, deleteAppMethod } = useAppMethod({});
  const appMethods = useSelector(appMethodSelect.appMethods);
  const volumeUnits = useSelector(appMethodSelect.volumeUnits);
  const { deselectCard } = useCardStack();

  const [formData, setFormData] = useState<AppMethodDoc>({
    appMethodId: method.appMethodId,
    description: method.description,
    speed: method.speed,
    doubleOverlap: method.doubleOverlap,
    width: method.width,
    flowRate: method.flowRate,
    flowRateUnitId: method.flowRateUnitId,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<keyof AppMethodDoc>>(
    new Set()
  );

  const existingIds = useMemo(
    () => appMethods.map((m) => m.appMethodId),
    [appMethods]
  );

  const validation = useMemo(
    () => validateAppMethod(formData, existingIds, true),
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
    setIsEditing(false);
    deselectCard();
  };

  const handleCancel = () => {
    setFormData({
      appMethodId: method.appMethodId,
      description: method.description,
      speed: method.speed,
      doubleOverlap: method.doubleOverlap,
      width: method.width,
      flowRate: method.flowRate,
      flowRateUnitId: method.flowRateUnitId,
    });
    setIsEditing(false);
    deselectCard();
  };

  const handleDelete = async () => {
    await deleteAppMethod(method);
    deselectCard();
  };

  const updateField = <K extends keyof AppMethodDoc>(
    field: K,
    value: AppMethodDoc[K]
  ) => {
    setFormData({ ...formData, [field]: value });
  };

  if (!isEditing) {
    return (
      <>
        <CardHeader>
          <CardTitle>{method.description}</CardTitle>
          <CardDescription>
            {method.speed}s/90ft • {method.width}ft • {method.flowRate}{" "}
            {method.flowRateUnit.desc}/min
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              <p>
                <strong>ID:</strong> {method.appMethodId}
              </p>
              <p>
                <strong>Speed:</strong> {method.speed} sec/90ft
              </p>
              <p>
                <strong>Width:</strong> {method.width} ft
              </p>
              <p>
                <strong>Flow Rate:</strong> {method.flowRate}{" "}
                {method.flowRateUnit.desc}/min
              </p>
              <p>
                <strong>Double Overlap:</strong>{" "}
                {method.doubleOverlap ? "Yes" : "No"}
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setIsEditing(true)}>Edit</Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </>
    );
  }

  return (
    <>
      <CardHeader>
        <CardTitle>Edit {method.description}</CardTitle>
        <CardDescription>Update application method</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>App Method ID</Label>
            <Input value={formData.appMethodId} disabled />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              onBlur={() => handleBlur("description")}
              className={cn(getFieldError("description") && "border-destructive")}
            />
            {getFieldError("description") && (
              <p className="text-sm text-destructive">
                {getFieldError("description")}
              </p>
            )}
          </div>

          <div className="space-y-2">
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

          <div className="space-y-2">
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

          <div className="space-y-2">
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

          <div className="space-y-2">
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
              id={`doubleOverlap-${method.appMethodId}`}
              checked={formData.doubleOverlap}
              onCheckedChange={(checked) =>
                updateField("doubleOverlap", checked as boolean)
              }
            />
            <Label htmlFor={`doubleOverlap-${method.appMethodId}`}>
              Double Overlap
            </Label>
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
