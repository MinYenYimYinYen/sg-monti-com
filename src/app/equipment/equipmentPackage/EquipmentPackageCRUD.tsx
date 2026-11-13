"use client";

import React from "react";
import { useSelector } from "react-redux";
import {
  CardStack,
  CardStackList,
  CardStackCard,
  CardStackHeader,
  useCardStack,
} from "@/components/CardStack";
import { CardHeader, CardTitle, CardDescription } from "@/style/components/card";
import { equipmentPackageSelect } from "@/app/equipment/equipmentPackage/equipmentPackageSelect";
import { useEquipmentPackage } from "@/app/equipment/equipmentPackage/useEquipmentPackage";
import { useEquipment } from "@/app/equipment/useEquipment";
import { EquipmentPackageForm } from "@/app/equipment/equipmentPackage/EquipmentPackageForm";
import { EquipmentPackageDoc } from "@/app/equipment/equipmentPackage/EquipmentPackageTypes";
import { equipmentCapabilities } from "@/app/equipment/equipmentCapabilities";
import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";

const { can } = equipmentCapabilities;

export function EquipmentPackageCRUD() {
  return (
    <GatedPanel requirement={can.equipmentPackages.read}>
      <EquipmentPackageEditor />
    </GatedPanel>
  );
}

// Mounts only once the read gate is open, so its load never fires for a user who may not read.
function EquipmentPackageEditor() {
  const allows = useSelector(userCapabilitiesSelect.allows);
  useEquipmentPackage({ autoLoad: true });
  // Needed for the equipment multiselect in the form. Packages and equipment are separate
  // capabilities, so a user holding only the first never fires the equipment request.
  useEquipment({ autoLoad: true, canLoad: allows(can.equipmentDefinitions.read) });
  const packages = useSelector(equipmentPackageSelect.equipmentPackages);

  return (
    <div className="h-full w-full pt-2">
      <CardStack>
        <CardStackList>
          {/* Create card */}
          <CardStackCard id="create" variant="create" className="w-[50%]">
            <CardStackHeader>
              <CardHeader>
                <CardTitle>Add Package</CardTitle>
                <CardDescription>Define a new equipment package</CardDescription>
              </CardHeader>
            </CardStackHeader>
            <ConditionalPackageForm cardId="create" />
          </CardStackCard>

          {/* One card per package */}
          {packages.map((doc) => (
            <CardStackCard key={doc.packageId} id={doc.packageId} className="w-[50%]">
              <CardStackHeader>
                <CardHeader>
                  <CardTitle>{doc.packageId}</CardTitle>
                  <CardDescription>
                    {doc.description}
                    {doc.equipmentIds.length > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({doc.equipmentIds.length} item{doc.equipmentIds.length !== 1 ? "s" : ""})
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
              </CardStackHeader>
              <ConditionalPackageForm cardId={doc.packageId} equipmentPackage={doc} />
            </CardStackCard>
          ))}
        </CardStackList>
      </CardStack>
    </div>
  );
}

function ConditionalPackageForm({
  cardId,
  equipmentPackage,
}: {
  cardId: string;
  equipmentPackage?: EquipmentPackageDoc;
}) {
  const { selectedId } = useCardStack();

  if (selectedId !== cardId) {
    return null;
  }

  return <EquipmentPackageForm equipmentPackage={equipmentPackage} />;
}
