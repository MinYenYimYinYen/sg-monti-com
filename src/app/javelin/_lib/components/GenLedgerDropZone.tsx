"use client";
import { useAppDispatch } from "@/lib/hooks/redux";
import { CSVDropzone } from "@/components/dropZone/dropZone";
import { parseGenLedger } from "@/app/csv/generalLedger/genLedgerParser";
import { genLedgerSanityChecks } from "@/app/javelin/_lib/genLedgerSanityChecks";
import { javelinActions } from "@/app/javelin/javelinSlice";
import { GenLedgerFile } from "@/app/javelin/JavelinTypes";
import { splitZeroNetRows } from "@/app/javelin/_lib/genLedgerRows";

const FILENAME_REGEX = /^\d{4}-\d{2}-\d{2}\.csv$/;

export function GenLedgerDropZone() {
  const dispatch = useAppDispatch();

  const handleFilesDrop = async (files: File[]) => {
    const assembledFiles: GenLedgerFile[] = [];

    for (const file of files) {
      const fileName = file.name;

      if (!FILENAME_REGEX.test(fileName)) {
        assembledFiles.push({
          fileName,
          date: "",
          rows: [],
          warnings: [],
          errors: [
            `Invalid filename "${fileName}". Files must be named YYYY-MM-DD.csv (e.g. 2026-05-29.csv).`,
          ],
        });
        continue;
      }

      const date = fileName.slice(0, 10);
      const warnings = genLedgerSanityChecks
        .map((check) => check(date))
        .filter((msg): msg is string => msg !== null);

      const parseResult = await parseGenLedger(file);

      if (!parseResult.success) {
        assembledFiles.push({ fileName, date, rows: [], warnings, errors: parseResult.errors });
        continue;
      }

      // Zero-net accounts have no ledger line. Removing them here keeps the list consistent
      // with what the server will build.
      const { postingRows, zeroNetRows } = splitZeroNetRows(parseResult.data);
      const zeroNetWarnings =
        zeroNetRows.length > 0
          ? [`Excluded (nets to $0.00): ${zeroNetRows.map((row) => row.account).join(", ")}`]
          : [];

      assembledFiles.push({
        fileName,
        date,
        rows: postingRows,
        warnings: [...warnings, ...(parseResult.warnings ?? []), ...zeroNetWarnings],
        errors: [],
      });
    }

    dispatch(javelinActions.setFiles(assembledFiles));
  };

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-2">
        Files must be named <code>YYYY-MM-DD.csv</code>. The date becomes the journal entry date.
      </p>
      <CSVDropzone multiple={true} onFilesDrop={handleFilesDrop} className="h-32" />
    </div>
  );
}
