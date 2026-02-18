"use client";
import { CoverSheetsConfigEditor } from "@/app/scheduling/coverSheets/_lib/config/CoverSheetsConfigEditor";
import { FooterPortal } from "@/components/FooterPortal";
import { useState } from "react";
import { Modal } from "@/components/Modal";
import { Settings } from "lucide-react";
import { Container } from "@/components/Containers";

export default function CoverSheetsPage() {
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  return (
    <Container variant={"page"}>
      <div>Cover Sheets Config Editor</div>
      <FooterPortal>
        <Settings onClick={() => setIsConfigOpen(true)} className={"size-4"} />
        <Modal
          title={"Cover Sheets Config Editor"}
          className={"h-[75vh] w-[75vw]"}
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
        >
          <CoverSheetsConfigEditor />
        </Modal>
      </FooterPortal>
    </Container>
  );
}
