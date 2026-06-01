"use client";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { CSVDropzone } from "@/components/dropZone/dropZone";
import { parseGenLedger } from "@/app/csv/generalLedger/genLedgerParser";
import { genLedgerSanityChecks } from "@/app/javelin/_lib/genLedgerSanityChecks";
import { javelinActions } from "@/app/javelin/javelinSlice";
import { javelinSelect } from "@/app/javelin/javelinSelect";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { GenLedgerFile } from "@/app/javelin/JavelinTypes";

const FILENAME_REGEX = /^\d{4}-\d{2}-\d{2}\.csv$/;

export function GenLedgerDropZone() {
  const dispatch = useAppDispatch();
  const savedAccountMap = useSelector(javelinSelect.savedAccountMap);
  const genLedgerAccountMap = useSelector(globalSettingsSelect.genLedgerAccountMap);

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
        assembledFiles.push({
          fileName,
          date,
          rows: [],
          warnings,
          errors: parseResult.errors,
        });
        continue;
      }

      assembledFiles.push({
        fileName,
        date,
        rows: parseResult.data,
        warnings: [
          ...warnings,
          ...(parseResult.warnings ?? []),
        ],
        errors: [],
      });
    }

    dispatch(javelinActions.setFiles(assembledFiles));

    // Pre-populate liveAccountMap for all encountered accounts.
    // For known accounts (in savedAccountMap or GlobalSettings), use the stored entry.
    // For all accounts, auto-parse the account number from the CRM name if not already stored.
    const combinedMap = { ...genLedgerAccountMap, ...savedAccountMap };
    const seenAccounts = new Set<string>();

    for (const file of assembledFiles) {
      for (const row of file.rows) {
        if (!seenAccounts.has(row.account)) {
          seenAccounts.add(row.account);
          const storedEntry = combinedMap[row.account];
          const autoAccountNumber = row.account.split(" - ")[0].trim();

          if (storedEntry?.qbName) {
            // Known account — use stored entry, fill accountNumber if missing
            dispatch(
              javelinActions.setLiveAccountEntry({
                crmName: row.account,
                entry: {
                  ...storedEntry,
                  accountNumber: storedEntry.accountNumber ?? autoAccountNumber,
                },
              }),
            );
          }
          // Unknown accounts are left unmapped (user fills in qbName via AccountNameCell)
          // accountNumber will be seeded when the user saves the QB name
        }
      }
    }
  };

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-2">
        Files must be named <code>YYYY-MM-DD.csv</code> — the date becomes the journal entry date.
      </p>
      <CSVDropzone
        multiple={true}
        onFilesDrop={handleFilesDrop}
        className="h-32"
      />
    </div>
  );
}
