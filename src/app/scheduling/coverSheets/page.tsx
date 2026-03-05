"use client";
import { CoverSheetsConfigEditor } from "@/app/scheduling/coverSheets/_lib/config/CoverSheetsConfigEditor";
import { FooterPortal } from "@/components/FooterPortal";
import { useState } from "react";
import { Modal } from "@/components/Modal";
import { DollarSign, Hash, LandPlot, Settings } from "lucide-react";
import { Container } from "@/components/Containers";
import { useCoverSheets } from "@/app/scheduling/coverSheets/_lib/hooks/useCoverSheets";
import { useSelector } from "react-redux";
import { RadioGroup, RadioGroupItem } from "@/style/components/radio-group";
import { CoverSheetCard } from "@/app/scheduling/coverSheets/_lib/components/CoverSheetCard";
import { coverSheetsSelect } from "@/app/scheduling/coverSheets/_lib/selectors/coverSheetsSelect";
import Link from "next/link";
import { UnservDropZone } from "@/app/scheduling/_libShared/UnservDropZone";

type ViewState = "countSizeRev" | "servCodes" | "products";

export default function CoverSheetsPage() {
  useCoverSheets();
  const servicesByDateAndEmployee = useSelector(
    coverSheetsSelect.servicesByDateAndEmployee,
  );

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [view, setView] = useState<ViewState>("countSizeRev");

  return (
    <Container variant={"page"} className={"flex flex-col gap-4"}>
      <div className={"flex justify-between items-center"}>
        <div className={"text-2xl font-bold"}>Cover Sheets</div>
      </div>
      <UnservDropZone />
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
      <div className={"flex gap-4 flex-wrap"}>
        {[...servicesByDateAndEmployee.keys()].map((date) => {
          const employeeMap = servicesByDateAndEmployee.get(date)!;

          return (
            <Link
              key={date}
              href={`/scheduling/coverSheets/${date}`}
              className={"contents"}
            >
              <CoverSheetCard
                variant={view}
                date={date}
                employeeMap={employeeMap}
              />
            </Link>
          );
        })}
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
