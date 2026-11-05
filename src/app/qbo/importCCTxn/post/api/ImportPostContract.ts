import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import {
  BatchPreview,
  PostPreview,
  PostResult,
  PostRowsResult,
} from "@/app/qbo/importCCTxn/types/ImportRowTypes";

export interface ImportPostContract extends ApiContract {
  // A read: what would be sent, and what is wrong. Writes nothing.
  previewPost: {
    params: { rowId: string };
    result: DataResponse<PostPreview>;
  };
  // A read: what posting a date range would send. Writes nothing. The ready row ids it returns
  // are exactly what postRows should be given.
  previewBatch: {
    params: { startDate: string; endDate: string };
    result: DataResponse<BatchPreview>;
  };
  // The only write to QuickBooks. Posts in batches of 30 and stops after the first batch in which
  // any row did not post.
  postRows: {
    params: { rowIds: string[] };
    result: DataResponse<PostRowsResult>;
  };
  // A read of QuickBooks that settles an unknown row. Posts nothing.
  reconcileRow: {
    params: { rowId: string };
    result: DataResponse<PostResult>;
  };
}
