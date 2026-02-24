"use client";
import { CoverSheetsConfigEditor } from "@/app/scheduling/coverSheets/_lib/config/CoverSheetsConfigEditor";
import { FooterPortal } from "@/components/FooterPortal";
import { useState } from "react";
import { Modal } from "@/components/Modal";
import { DollarSign, Hash, LandPlot, Settings } from "lucide-react";
import { Container } from "@/components/Containers";
import { useCoverSheets } from "@/app/scheduling/coverSheets/_lib/hooks/useCoverSheets";
import { useSelector } from "react-redux";
import { CSVDropzone } from "@/components/dropZone/dropZone";
import { useCSV } from "@/app/csv/_lib/useCSV";
import { RadioGroup, RadioGroupItem } from "@/style/components/radio-group";
import { useViewport } from "@/lib/hooks/useViewport";
import { authSelect } from "@/app/auth/authSlice";
import { CardCountSizeRev } from "@/app/scheduling/coverSheets/_lib/components/CardCountSizeRev";
import { CardServCodes } from "@/app/scheduling/coverSheets/_lib/components/CardServCodes";
import { CardProducts } from "@/app/scheduling/coverSheets/_lib/components/CardProducts";

type ViewState = "countSizeRev" | "servCodes" | "products";

export default function CoverSheetsPage() {
  useCoverSheets();
  const { isNarrow } = useViewport();
  const role = useSelector(authSelect.role);
  const canUpload = ["admin", "office"].includes(role ?? "");
  const { parseAssignments } = useCSV();

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [view, setView] = useState<ViewState>("countSizeRev");

  return (
    <Container variant={"page"} className={"flex flex-col gap-4"}>
      <div className={"flex justify-between items-center"}>
        <div className={"text-2xl font-bold"}>Cover Sheets</div>
      </div>
      {canUpload && !isNarrow && (
        <section>
          <h2 className={"text-lg font-medium"}>Upload Unserviced Report</h2>
          <CSVDropzone onFileDrop={(file) => parseAssignments(file)} />
        </section>
      )}
      <RadioGroup
        variant={"button-group"}
        value={view}
        onValueChange={(v) => setView(v as ViewState)}
        className={"w-full md:w-auto"}
      >
        <RadioGroupItem
          value="countSizeRev"
          className="flex flex-1 md:flex-none justify-center"
        >
          <Hash className={"size-3.5"} />
          <LandPlot className={"size-3.5"} />
          <DollarSign className={"size-3.5"} />
        </RadioGroupItem>
        <RadioGroupItem
          value="servCodes"
          className={"text-xs flex-1 md:flex-none text-center"}
        >
          Service Codes
        </RadioGroupItem>
        <RadioGroupItem
          value="products"
          className={"text-xs flex-1 md:flex-none text-center"}
        >
          Products
        </RadioGroupItem>
      </RadioGroup>
      <div>
        {view === "countSizeRev" && <CardCountSizeRev />}
        {view === "servCodes" && <CardServCodes />}
        {view === "products" && <CardProducts />}
      </div>
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
