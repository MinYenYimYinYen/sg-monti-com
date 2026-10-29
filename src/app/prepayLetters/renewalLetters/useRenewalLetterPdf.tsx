import { useStore } from "react-redux";
import { pdf } from "@react-pdf/renderer";
import { toast } from "react-toastify";
import type { AppState } from "@/store";
import { useAppDispatch } from "@/lib/hooks/redux";
import { useIsClient } from "@/lib/hooks/useIsClient";
import { AppError } from "@/lib/errors/AppError";
import { handleError } from "@/lib/errors/errorHandler";
import { FormBatchDocument } from "@/lib/pdf/FormBatchDocument";
import { FORM_DATA_TYPE_REGISTRY } from "@/app/formDataTypes/formDataTypeRegistry";
import { prepayConfigSelect } from "@/app/prepayLetters/config/prepayConfigSelect";
import type { DisplayBatch } from "./renewalBatchCombining";
import { renewalLettersSelect } from "./renewalLettersSelect";
import { IDLE_PDF_STATUS, renewalLettersActions } from "./renewalLettersSlice";
import { buildPdfFileNames, canPickFolder } from "./renewalPdfLogic";

// Minimal local types: the File System Access API is not in every TypeScript DOM lib.
type WritableFile = { write: (blob: Blob) => Promise<void>; close: () => Promise<void> };
type FolderHandle = {
  getFileHandle: (
    name: string,
    options: { create: boolean },
  ) => Promise<{ createWritable: () => Promise<WritableFile> }>;
};
type FolderPickerWindow = Window & {
  showDirectoryPicker?: (options: { mode: "readwrite" }) => Promise<FolderHandle>;
};

// Lets React paint the progress message before the main thread is busy rendering a PDF.
const nextPaint = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

function downloadWithAnchor({ blob, fileName }: { blob: Blob; fileName: string }) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  // Revoking in the same tick can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function writeToFolder({
  folder,
  blob,
  fileName,
}: {
  folder: FolderHandle;
  blob: Blob;
  fileName: string;
}) {
  const fileHandle = await folder.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

/**
 * Renders batch rows to PDFs, one file per row. Several rows go into a folder the user picks
 * once (Chromium), or fall back to one browser download per file. A single row is always a
 * plain download. Rendering runs on the main thread, so the tab freezes during each file.
 * Actions only: the template, config and progress are read from the store at call time.
 */
export function useRenewalLetterPdf() {
  const dispatch = useAppDispatch();
  const store = useStore<AppState>();
  const isClient = useIsClient();

  const downloadRows = async ({ rows }: { rows: DisplayBatch[] }) => {
    if (!isClient || rows.length === 0) return;
    const state = store.getState();
    if (renewalLettersSelect.isPdfRunning(state)) return;

    try {
      const template = renewalLettersSelect.selectedTemplate(state);
      const config = prepayConfigSelect.draft(state);
      if (!template || !config) {
        throw new AppError({
          message: "Select a form template and open a prepay config first.",
          type: "VALIDATION_ERROR",
        });
      }
      const dataType = template.dataType as keyof typeof FORM_DATA_TYPE_REGISTRY;
      const descriptor = FORM_DATA_TYPE_REGISTRY[dataType];
      if (!descriptor) {
        throw new AppError({
          message: `The template's form data type "${template.dataType}" is no longer registered.`,
          type: "VALIDATION_ERROR",
        });
      }

      const fileNames = buildPdfFileNames({
        season: config.season,
        rows,
        timestamp: new Date(),
      });
      const browserWindow = window as FolderPickerWindow;
      let folder: FolderHandle | null = null;
      if (rows.length > 1 && canPickFolder(browserWindow) && browserWindow.showDirectoryPicker) {
        try {
          folder = await browserWindow.showDirectoryPicker({ mode: "readwrite" });
        } catch (error) {
          // Closing the picker is a choice, not a failure.
          if (error instanceof DOMException && error.name === "AbortError") return;
          throw error;
        }
      }

      let savedCount = 0;
      const failedNames: string[] = [];

      for (const [rowIndex, row] of rows.entries()) {
        const fileName = fileNames[rowIndex];
        dispatch(
          renewalLettersActions.setPdfStatus({
            state: "running",
            currentFileName: fileName,
            savedCount,
            totalCount: rows.length,
          }),
        );
        await nextPaint();

        // One failed batch must not stop the rest, and must be named so it can be redone.
        try {
          const blob = await pdf(
            <FormBatchDocument
              template={template}
              dataItems={row.letters}
              contract={descriptor.contract}
            />,
          ).toBlob();
          if (folder) await writeToFolder({ folder, blob, fileName });
          else downloadWithAnchor({ blob, fileName });
          savedCount += 1;
        } catch (error) {
          console.error(`Renewal PDF failed: ${fileName}`, error);
          failedNames.push(fileName);
        }
      }

      if (failedNames.length > 0) {
        handleError(
          new AppError({
            message: `Saved ${savedCount} of ${rows.length}. Failed: ${failedNames.join(", ")}`,
            type: "UNKNOWN_ERROR",
          }),
        );
      } else {
        toast.success(
          rows.length === 1
            ? `Saved ${fileNames[0]}`
            : `Saved ${savedCount} PDFs${folder ? " to the chosen folder" : ""}`,
        );
      }
    } catch (error) {
      handleError(error);
    } finally {
      dispatch(renewalLettersActions.setPdfStatus(IDLE_PDF_STATUS));
    }
  };

  return { downloadRows, canPickFolder: isClient && canPickFolder(window) };
}
