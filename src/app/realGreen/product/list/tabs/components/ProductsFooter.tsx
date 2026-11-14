import { FooterPortal } from "@/components/FooterPortal";
import { Badge } from "@/style/components/badge";
import { Modal } from "@/components/Modal";
import { AppMethodCRUD } from "@/app/appMethod/AppMethodCRUD";
import { EquipmentCRUD } from "@/app/equipment/EquipmentCRUD";
import { EquipmentPackageCRUD } from "@/app/equipment/equipmentPackage/EquipmentPackageCRUD";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { can } from "@/permission/can";

export function ProductsFooter() {
  const [isAppMethodCRUDOpen, setIsAppMethodCRUDOpen] = useState(false);
  const [isEquipmentCRUDOpen, setIsEquipmentCRUDOpen] = useState(false);
  const [isPackageCRUDOpen, setIsPackageCRUDOpen] = useState(false);
  const allows = useSelector(userCapabilitiesSelect.allows);
  const canOpenAppMethods = allows(can.appMethods.read);
  const canOpenEquipment = allows(can.equipmentDefinitions.read);
  const canOpenPackages = allows(can.equipmentPackages.read);

  // A badge a user cannot read is hidden, so no one opens a modal that only says they have no access.
  return (
    <FooterPortal>
      {canOpenAppMethods && (
        <Badge variant={"outline"} onClick={() => setIsAppMethodCRUDOpen(true)}>
          Application Methods
        </Badge>
      )}
      {canOpenEquipment && (
        <Badge variant={"outline"} onClick={() => setIsEquipmentCRUDOpen(true)}>
          Equipment
        </Badge>
      )}
      {canOpenPackages && (
        <Badge variant={"outline"} onClick={() => setIsPackageCRUDOpen(true)}>
          Equipment Packages
        </Badge>
      )}

      <Modal
        title="Application Methods"
        isOpen={isAppMethodCRUDOpen}
        onClose={() => setIsAppMethodCRUDOpen(false)}
        className={"w-full max-w-6xl h-[75vh]"}
      >
        <AppMethodCRUD />
      </Modal>

      <Modal
        title="Equipment"
        isOpen={isEquipmentCRUDOpen}
        onClose={() => setIsEquipmentCRUDOpen(false)}
        className={"w-full max-w-6xl h-[75vh]"}
      >
        <EquipmentCRUD />
      </Modal>

      <Modal
        title="Equipment Packages"
        isOpen={isPackageCRUDOpen}
        onClose={() => setIsPackageCRUDOpen(false)}
        className={"w-full max-w-6xl h-[75vh]"}
      >
        <EquipmentPackageCRUD />
      </Modal>
    </FooterPortal>
  );
}
