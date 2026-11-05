import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { ImportCsvRow } from "@/app/qbo/importCCTxn/types/ImportCCTxnTypes";
import {
  ImportCommitResult,
  ImportPreview,
  ImportRow,
  ImportRowSkipReason,
} from "@/app/qbo/importCCTxn/types/ImportRowTypes";

export interface ImportRowContract extends ApiContract {
  previewImport: {
    params: { rows: ImportCsvRow[] };
    result: DataResponse<ImportPreview>;
  };
  commitImport: {
    params: { rows: ImportCsvRow[]; fileName: string; duplicateRowNumbers: number[] };
    result: DataResponse<ImportCommitResult>;
  };
  getOpenRows: {
    params: Record<string, never>;
    result: DataResponse<ImportRow[]>;
  };
  setRowSkip: {
    params: { rowId: string; skipReason: ImportRowSkipReason | null };
    result: DataResponse<ImportRow>;
  };
}
