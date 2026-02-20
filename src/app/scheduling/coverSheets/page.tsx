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

export default function CoverSheetsPage() {
  useCoverSheets();
  const printedByDate = useSelector(coverSheetsSelect.printedByDate);

  useEffect(() => {
    console.log(printedByDate);
  }, [printedByDate]);

  const [isConfigOpen, setIsConfigOpen] = useState(false);

  return (
    <Container variant={"page"}>
      <div>Cover Sheets</div>
      <div className={"flex gap-4 flex-wrap"}>
        {[...printedByDate.keys()].map((date) => {
          const services = printedByDate.get(date)!;

          return (
            <Card key={date}>
              <CardTitle>
                {prettyDate(date, "EEE, MMM d")}
              </CardTitle>
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
