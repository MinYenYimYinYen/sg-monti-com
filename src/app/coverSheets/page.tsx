"use client";
import { CoverSheetsConfigEditor } from "@/app/coverSheets/_lib/config/CoverSheetsConfigEditor";
import { FooterPortal } from "@/components/FooterPortal";
import { useState } from "react";
import { Modal } from "@/components/Modal";
import { Settings } from "lucide-react";

export default function CoverSheetsPage() {
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  return (
    <div>
      <div>Cover Sheets Config Editor</div>
      <FooterPortal>
        <Settings onClick={() => setIsConfigOpen(true)} className={"size-4"}/>
        <Modal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)}>
          <CoverSheetsConfigEditor />
        </Modal>
      </FooterPortal>
    </div>
  );
}
