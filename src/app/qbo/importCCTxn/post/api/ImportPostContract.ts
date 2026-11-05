import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { PostPreview, PostResult } from "@/app/qbo/importCCTxn/types/ImportRowTypes";

export interface ImportPostContract extends ApiContract {
  // A read: what would be sent, and what is wrong. Writes nothing.
  previewPost: {
    params: { rowId: string };
    result: DataResponse<PostPreview>;
  };
  // The only write to QuickBooks.
  postRows: {
    params: { rowIds: string[] };
    result: DataResponse<PostResult[]>;
  };
  // A read of QuickBooks that settles an unknown row. Posts nothing.
  reconcileRow: {
    params: { rowId: string };
    result: DataResponse<PostResult>;
  };
}
