import { FooterPortal } from "@/components/FooterPortal";
import { Badge } from "@/style/components/badge";
import { Modal } from "@/components/Modal";
import { AppMethodCRUD } from "@/app/appMethod/AppMethodCRUD";
import React, { useState } from "react";

export function ProductsFooter() {
  const [isAppMethodCRUDOpen, setIsAppMethodCRUDOpen] = useState(false);
  return (
    <FooterPortal>
      <Badge variant={"outline"} onClick={() => setIsAppMethodCRUDOpen(true)}>
        Application Methods
      </Badge>
      <Modal
        title="Application Methods"
        isOpen={isAppMethodCRUDOpen}
        onClose={() => setIsAppMethodCRUDOpen(false)}
        className={"w-full max-w-6xl h-[75vh]"}
      >
        <AppMethodCRUD />
      </Modal>
    </FooterPortal>
  );
}
