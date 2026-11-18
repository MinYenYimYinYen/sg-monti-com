"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useSelector } from "react-redux";
import { Button } from "@/style/components/button";
import { Label } from "@/style/components/label";
import { RadioGroup, RadioGroupItem } from "@/style/components/radio-group";
import { buildMnReturnFile } from "@/app/salesTax/_lib/buildMnReturnFile";
import { findMnReturnBlockers } from "@/app/salesTax/_lib/findMnReturnBlockers";
import { MN_RETURN_LOCATION, MnReturnAmendFlag } from "@/app/salesTax/_lib/mnReturnConst";
import { salesTaxUISelect } from "@/app/salesTax/salesTaxUISelect";
import { downloadTextFile } from "@/lib/misc/downloadTextFile";

type FileKind = { extension: "csv" | "txt"; mimeType: string };

const CSV: FileKind = { extension: "csv", mimeType: "text/csv" };
const TXT: FileKind = { extension: "txt", mimeType: "text/plain" };

/**
 * The upload file for the Minnesota Department of Revenue. The state's examples are comma delimited
 * and come as both .csv and .txt, so the same text is offered under either extension.
 */
export function MnReturnExportPanel() {
  const report = useSelector(salesTaxUISelect.mnTaxReport);
  const dateRange = useSelector(salesTaxUISelect.dateRange);

  const [amendFlag, setAmendFlag] = useState<MnReturnAmendFlag>("O");
  const [notice, setNotice] = useState<string | null>(null);

  const blockers = findMnReturnBlockers({ report, dateRange });
  const periodEnd = dateRange?.max ?? null;
  const fileText =
    blockers.length === 0 && report && periodEnd
      ? buildMnReturnFile({ report, periodEnd, amendFlag })
      : null;

  // Read at click time: the current date must not be read while rendering.
  const handleDownload = ({ extension, mimeType }: FileKind) => {
    if (!fileText || !periodEnd) return;
    const today = format(new Date(), "yyyy-MM-dd");
    if (today <= periodEnd) {
      setNotice(`The period ends ${periodEnd}. The state accepts the return once the month is over.`);
      return;
    }
    setNotice(null);
    downloadTextFile({
      text: fileText,
      fileName: `mn-sales-tax-${periodEnd.slice(0, 7)}.${extension}`,
      mimeType,
    });
  };

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Minnesota upload file</h2>
        <div className="flex items-center gap-3">
          <Label>Return</Label>
          <RadioGroup
            variant="button-group"
            value={amendFlag}
            onValueChange={(value) => setAmendFlag(value as MnReturnAmendFlag)}
          >
            <RadioGroupItem value="O">Original</RadioGroupItem>
            <RadioGroupItem value="A">Amend</RadioGroupItem>
          </RadioGroup>
        </div>
      </div>

      {blockers.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-secondary">
          {blockers.map((blocker) => (
            <li key={blocker}>{blocker}</li>
          ))}
        </ul>
      )}

      {fileText !== null && (
        <>
          <p className="text-xs text-muted-foreground">
            Location {MN_RETURN_LOCATION}, whole dollars. Tax due is computed from the taxable amount
            rounded to the dollar, as the state does, so it can differ by a dollar from the cents
            shown above.
            {amendFlag === "A" && " An amended return must carry the correct totals, not the changes."}
          </p>
          <pre className="overflow-x-auto rounded-md border border-border bg-background p-3 text-xs">
            {fileText}
          </pre>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={() => handleDownload(CSV)}>
              Download .csv
            </Button>
            <Button type="button" variant="outline" onClick={() => handleDownload(TXT)}>
              Download .txt
            </Button>
          </div>
          {notice && <p className="text-sm text-secondary">{notice}</p>}
        </>
      )}
    </section>
  );
}
