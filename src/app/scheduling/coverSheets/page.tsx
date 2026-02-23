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
import { coverSheetsSelect } from "@/app/scheduling/coverSheets/_lib/selectors/coverSheetsSelect";
import { Card, CardDescription, CardTitle } from "@/style/components/card";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { CSVDropzone } from "@/components/dropZone/dropZone";
import { useCSV } from "@/app/csv/_lib/useCSV";

export default function CoverSheetsPage() {
  useCoverSheets();
  const { parseAssignments } = useCSV();
  const servicesByDate = useSelector(coverSheetsSelect.servicesByDate);
  const servicesByDateAndEmployee = useSelector(
    coverSheetsSelect.servicesByDateAndEmployee,
  );

  useEffect(() => {
    console.log("by date", servicesByDate);
    console.log("by date/employee", servicesByDateAndEmployee);
  }, [servicesByDate, servicesByDateAndEmployee]);

  const [isConfigOpen, setIsConfigOpen] = useState(false);

  return (
    <Container variant={"page"} className={"flex flex-col gap-4"}>
      <div className={"text-2xl font-bold"}>Cover Sheets</div>
      <section>
        <h2 className={"text-lg font-medium"}>Upload Unserviced Report</h2>
        <CSVDropzone onFileDrop={(file) => parseAssignments(file)} />
      </section>
      <div className={"flex gap-4 flex-wrap"}>
        {[...servicesByDate.keys()].map((date) => {
          const services = servicesByDate.get(date)!;

          return (
            <Card key={date}>
              <CardTitle>{prettyDate(date, "EEE, MMM d")}</CardTitle>
              <CardDescription>{services.length} services</CardDescription>
            </Card>
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
