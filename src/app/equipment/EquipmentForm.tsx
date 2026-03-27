"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { CardContent } from "@/style/components/card";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { Button } from "@/style/components/button";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import { Separator } from "@/style/components/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";
import { MultiSelect } from "@/components/multiselect/MultiSelect";
import { MultiSelectTrigger } from "@/components/multiselect/MultiSelectTrigger";
import { MultiSelectValue } from "@/components/multiselect/MultiSelectValue";
import { MultiSelectContent } from "@/components/multiselect/MultiSelectContent";
import { MultiSelectItem } from "@/components/multiselect/MultiSelectItem";
import { MultiSelectEmpty } from "@/components/multiselect/MultiSelectEmpty";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { CardStackBody, useCardStack } from "@/components/CardStack";
import { EquipmentDoc } from "@/app/equipment/EquipmentTypes";
import { useEquipment } from "@/app/equipment/useEquipment";
import { appMethodSelect } from "@/app/appMethod/appMethodSelect";
import { EquipmentDeleteSheet } from "@/app/equipment/EquipmentDeleteSheet";
import { Checkbox } from "@/style/components/checkbox";

interface EquipmentFormProps {
  equipment?: EquipmentDoc;
}

export function EquipmentForm({ equipment }: EquipmentFormProps) {
  const { upsertEquipment } = useEquipment({});
  const { deselectCard } = useCardStack();
  const appMethods = useSelector(appMethodSelect.appMethodDocs);

  const [equipmentId, setEquipmentId] = useState(equipment?.equipmentId ?? "");
  const [description, setDescription] = useState(equipment?.description ?? "");
  const [appMethodIds, setAppMethodIds] = useState<string[]>(
    equipment?.appMethodIds ?? [],
  );
  const [defaultAppMethodId, setDefaultAppMethodId] = useState(
    equipment?.defaultAppMethodId ?? "",
  );
  const [showFlOz, setShowFlOz] = useState(equipment?.showFlOz ?? false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);

  const isEditing = !!equipment;

  // The default must be in the allowed set
  const allowedAppMethods = appMethods.filter((m) =>
    appMethodIds.includes(m.appMethodId),
  );

  const canSave =
    equipmentId.trim().length > 0 &&
    description.trim().length > 0 &&
    appMethodIds.length > 0 &&
    defaultAppMethodId.length > 0 &&
    appMethodIds.includes(defaultAppMethodId);

  // When the allowed set changes, clear the default if it's no longer in the set
  const handleAppMethodIdsChange = (newIds: string[]) => {
    setAppMethodIds(newIds);
    if (!newIds.includes(defaultAppMethodId)) {
      setDefaultAppMethodId(newIds.length === 1 ? newIds[0] : "");
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaveStatus("saving");
    const doc: EquipmentDoc = {
      equipmentId: equipmentId.trim(),
      description: description.trim(),
      defaultAppMethodId,
      appMethodIds,
      mixedProductIds: equipment?.mixedProductIds ?? [],
      showFlOz,
    };
    await upsertEquipment(doc);
    setSaveStatus("success");
  };

  const handleSuccessComplete = () => {
    setSaveStatus("idle");
    deselectCard();
  };

  const handleCancel = () => {
    deselectCard();
  };

  const handleDeleteComplete = () => {
    deselectCard();
  };

  return (
    <CardStackBody>
      <CardContent>
        <div className="space-y-3">
          {/* Equipment ID */}
          <div className="space-y-1">
            <Label>Equipment ID</Label>
            <Input
              placeholder="e.g., MAIN_TANK"
              value={equipmentId}
              onChange={(e) => setEquipmentId(e.target.value)}
              disabled={isEditing}
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label>Description</Label>
            <Input
              placeholder="e.g., Main Tank"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Allowed AppMethods */}
          <div className="space-y-1">
            <Label>Compatible Application Methods</Label>
            <p className="text-xs text-muted-foreground">
              Only AppMethods with compatible units (all liquid or all granular)
            </p>
            <MultiSelect<string>
              value={appMethodIds}
              onValueChange={handleAppMethodIdsChange}
            >
              <MultiSelectTrigger>
                <MultiSelectValue<string>
                  placeholder="Select compatible methods…"
                >
                  {(ids: string[]) =>
                    ids.length === 0
                      ? null
                      : `${ids.length} method${ids.length !== 1 ? "s" : ""} selected`
                  }
                </MultiSelectValue>
              </MultiSelectTrigger>
              <MultiSelectContent>
                <MultiSelectEmpty>No application methods found</MultiSelectEmpty>
                {appMethods.map((method) => (
                  <MultiSelectItem key={method.appMethodId} value={method.appMethodId}>
                    {method.appMethodId} — {method.description}
                  </MultiSelectItem>
                ))}
              </MultiSelectContent>
            </MultiSelect>
          </div>

          {/* Show Fl Oz */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="showFlOz"
              checked={showFlOz}
              onCheckedChange={(checked) => setShowFlOz(checked === true)}
            />
            <Label htmlFor="showFlOz" className="cursor-pointer">
              Show Fl Oz
            </Label>
            <span className="text-xs text-muted-foreground">
              Display water amounts as gallons + remaining fl oz
            </span>
          </div>

          {/* Default AppMethod — filtered to allowed set */}
          <div className="space-y-1">
            <Label>Default Application Method</Label>
            <Select
              value={defaultAppMethodId}
              onValueChange={setDefaultAppMethodId}
              disabled={allowedAppMethods.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    allowedAppMethods.length === 0
                      ? "Select compatible methods first…"
                      : "Select default method…"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {allowedAppMethods.map((method) => (
                  <SelectItem key={method.appMethodId} value={method.appMethodId}>
                    {method.appMethodId} — {method.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 items-center pt-1">
            <SaveButton
              disabled={!canSave}
              status={saveStatus}
              onClick={handleSave}
              onSuccessComplete={handleSuccessComplete}
            >
              Save
            </SaveButton>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </div>

          {/* Delete — edit mode only */}
          {isEditing && (
            <>
              <Separator className="my-2" />
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Danger Zone</Label>
                <Button
                  variant="destructive"
                  intensity="soft"
                  onClick={() => setDeleteSheetOpen(true)}
                  className="w-full"
                >
                  Delete Equipment
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>

      {isEditing && equipment && (
        <EquipmentDeleteSheet
          equipment={equipment}
          open={deleteSheetOpen}
          onOpenChange={setDeleteSheetOpen}
          onDeleteComplete={handleDeleteComplete}
        />
      )}
    </CardStackBody>
  );
}
