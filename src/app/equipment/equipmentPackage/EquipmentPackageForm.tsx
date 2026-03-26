"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { CardContent } from "@/style/components/card";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { Button } from "@/style/components/button";
import { Badge } from "@/style/components/badge";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import { Separator } from "@/style/components/separator";
import { CardStackBody, useCardStack } from "@/components/CardStack";
import { MultiSelect } from "@/components/multiselect/MultiSelect";
import { MultiSelectTrigger } from "@/components/multiselect/MultiSelectTrigger";
import { MultiSelectValue } from "@/components/multiselect/MultiSelectValue";
import { MultiSelectContent } from "@/components/multiselect/MultiSelectContent";
import { MultiSelectItem } from "@/components/multiselect/MultiSelectItem";
import { MultiSelectEmpty } from "@/components/multiselect/MultiSelectEmpty";
import { EquipmentPackageDoc } from "@/app/equipment/equipmentPackage/EquipmentPackageTypes";
import { useEquipmentPackage } from "@/app/equipment/equipmentPackage/useEquipmentPackage";
import { equipmentSelect } from "@/app/equipment/equipmentSelect";
import { EquipmentPackageDeleteSheet } from "@/app/equipment/equipmentPackage/EquipmentPackageDeleteSheet";

interface EquipmentPackageFormProps {
  equipmentPackage?: EquipmentPackageDoc;
}

export function EquipmentPackageForm({ equipmentPackage }: EquipmentPackageFormProps) {
  const { upsertEquipmentPackage } = useEquipmentPackage({});
  const { deselectCard } = useCardStack();
  const equipmentDocs = useSelector(equipmentSelect.equipmentDocs);

  const [packageId, setPackageId] = useState(equipmentPackage?.packageId ?? "");
  const [description, setDescription] = useState(equipmentPackage?.description ?? "");
  const [equipmentIds, setEquipmentIds] = useState<string[]>(
    equipmentPackage?.equipmentIds ?? [],
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);

  const isEditing = !!equipmentPackage;

  const canSave =
    packageId.trim().length > 0 &&
    description.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaveStatus("saving");
    const doc: EquipmentPackageDoc = {
      packageId: packageId.trim(),
      description: description.trim(),
      equipmentIds,
    };
    await upsertEquipmentPackage(doc);
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
          {/* Package ID */}
          <div className="space-y-1">
            <Label>Package ID</Label>
            <Input
              placeholder="e.g., FULL_RIG"
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
              disabled={isEditing}
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label>Description</Label>
            <Input
              placeholder="e.g., Full Rig"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Equipment selection */}
          <div className="space-y-1">
            <Label>Equipment</Label>
            <p className="text-xs text-muted-foreground">
              Select the equipment items included in this package
            </p>
            <MultiSelect<string>
              value={equipmentIds}
              onValueChange={setEquipmentIds}
            >
              <MultiSelectTrigger>
                <MultiSelectValue<string> placeholder="Select equipment…">
                  {(ids: string[]) =>
                    ids.length === 0
                      ? null
                      : `${ids.length} item${ids.length !== 1 ? "s" : ""} selected`
                  }
                </MultiSelectValue>
              </MultiSelectTrigger>
              <MultiSelectContent>
                <MultiSelectEmpty>No equipment found</MultiSelectEmpty>
                {equipmentDocs.map((eq) => (
                  <MultiSelectItem key={eq.equipmentId} value={eq.equipmentId}>
                    <span className="font-mono text-xs mr-2">{eq.equipmentId}</span>
                    {eq.description}
                  </MultiSelectItem>
                ))}
              </MultiSelectContent>
            </MultiSelect>

            {/* Selected equipment summary */}
            {equipmentIds.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {equipmentIds.map((id) => {
                  const eq = equipmentDocs.find((e) => e.equipmentId === id);
                  return (
                    <Badge key={id} variant="outline" className="font-mono text-xs">
                      {id}
                      {eq && (
                        <span className="ml-1 text-muted-foreground font-normal">
                          — {eq.defaultAppMethodId}
                        </span>
                      )}
                    </Badge>
                  );
                })}
              </div>
            )}
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
                  Delete Package
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>

      {isEditing && equipmentPackage && (
        <EquipmentPackageDeleteSheet
          equipmentPackage={equipmentPackage}
          open={deleteSheetOpen}
          onOpenChange={setDeleteSheetOpen}
          onDeleteComplete={handleDeleteComplete}
        />
      )}
    </CardStackBody>
  );
}
