"use client";
import { CoverSheetsConfigEditor } from "@/app/scheduling/coverSheets/_lib/config/CoverSheetsConfigEditor";
import { FooterPortal } from "@/components/FooterPortal";
import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { Settings } from "lucide-react";
import { Container } from "@/components/Containers";
import { useCoverSheets } from "@/app/scheduling/coverSheets/_lib/hooks/useCoverSheets";
import { useSelector } from "react-redux";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";

export default function CoverSheetsPage() {
  useCoverSheets();
  const services = useSelector(centralSelect.services);

  useEffect(() => {
    console.log("services", services);
  }, [services]);

  const [isConfigOpen, setIsConfigOpen] = useState(false);

  return (
    <Container variant={"page"}>
      <div>Cover Sheets</div>
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
