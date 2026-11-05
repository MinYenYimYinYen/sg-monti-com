import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { importRowActions } from "@/app/qbo/importCCTxn/rows/importRowSlice";
import { parseImportCsvFile } from "@/app/qbo/importCCTxn/_lib/importCsvParser";
import { ImportRowSkipReason } from "@/app/qbo/importCCTxn/types/ImportRowTypes";
import { ImportCsvRow } from "@/app/qbo/importCCTxn/types/ImportCCTxnTypes";

/**
 * Loads the open import rows when `autoLoad` is set and exposes actions only. The importer's
 * data is read with useSelector(importRowSelect...).
 */
export function useImportRow({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        importRowActions.getOpenRows({
          params: {},
          config: { loadingMsg: "Loading imported transactions...", force: true },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  // Parses in the browser, then asks the server what the import would do. A parse failure is
  // kept in state and shown to the user; nothing is sent to the server.
  const loadFile = async (file: File) => {
    const result = await parseImportCsvFile(file);
    if (!result.success) {
      dispatch(
        importRowActions.setFile({ stage: "errors", fileName: file.name, errors: result.errors }),
      );
      return;
    }
    dispatch(
      importRowActions.setFile({
        stage: "parsed",
        fileName: file.name,
        formatLabel: result.formatLabel,
        rows: result.rows,
      }),
    );
    dispatch(
      importRowActions.previewImport({
        params: { rows: result.rows },
        config: { loadingMsg: "Checking the file...", force: true },
      }),
    );
  };

  const refreshPreview = (rows: ImportCsvRow[]) =>
    dispatch(
      importRowActions.previewImport({
        params: { rows },
        config: { loadingMsg: "Checking the file...", force: true },
      }),
    );

  const commit = ({
    rows,
    fileName,
    duplicateRowNumbers,
  }: {
    rows: ImportCsvRow[];
    fileName: string;
    duplicateRowNumbers: number[];
  }) =>
    dispatch(
      importRowActions.commitImport({
        params: { rows, fileName, duplicateRowNumbers },
        config: { loadingMsg: "Importing transactions...", force: true },
      }),
    );

  const setSkip = ({
    rowId,
    skipReason,
  }: {
    rowId: string;
    skipReason: ImportRowSkipReason | null;
  }) =>
    dispatch(
      importRowActions.setRowSkip({
        params: { rowId, skipReason },
        config: { loadingMsg: "Saving..." },
      }),
    );

  // A null accountId clears the row's own choice, so it uses the merchant's default again.
  const setAccount = ({ rowId, accountId }: { rowId: string; accountId: string | null }) =>
    dispatch(
      importRowActions.setRowAccount({
        params: { rowId, accountId },
        config: { loadingMsg: "Saving..." },
      }),
    );

  const setConfirmedDuplicateRowNumbers = (rowNumbers: number[]) =>
    dispatch(importRowActions.setConfirmedDuplicateRowNumbers(rowNumbers));

  const reset = () => dispatch(importRowActions.resetImport());

  return {
    loadFile,
    refreshPreview,
    commit,
    setSkip,
    setAccount,
    setConfirmedDuplicateRowNumbers,
    reset,
  };
}
