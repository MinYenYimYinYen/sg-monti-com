import { FooterPortal } from "@/components/FooterPortal";
import { Badge } from "@/style/components/badge";
import { Modal } from "@/components/Modal";
import { AppMethodCRUD } from "@/app/appMethod/AppMethodCRUD";
import { EquipmentCRUD } from "@/app/equipment/EquipmentCRUD";
import { EquipmentPackageCRUD } from "@/app/equipment/equipmentPackage/EquipmentPackageCRUD";
import React, { useState } from "react";

export function ProductsFooter() {
  const [isAppMethodCRUDOpen, setIsAppMethodCRUDOpen] = useState(false);
  const [isEquipmentCRUDOpen, setIsEquipmentCRUDOpen] = useState(false);
  const [isPackageCRUDOpen, setIsPackageCRUDOpen] = useState(false);

  return (
    <FooterPortal>
      <Badge variant={"outline"} onClick={() => setIsAppMethodCRUDOpen(true)}>
        Application Methods
      </Badge>
      <Badge variant={"outline"} onClick={() => setIsEquipmentCRUDOpen(true)}>
        Equipment
      </Badge>
      <Badge variant={"outline"} onClick={() => setIsPackageCRUDOpen(true)}>
        Equipment Packages
      </Badge>

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
