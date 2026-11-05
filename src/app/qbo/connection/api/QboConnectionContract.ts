import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import {
  QboConnectionStatus,
  QboConnectionTestResult,
  QboDisconnectResult,
} from "@/app/qbo/connection/types/QboConnectionTypes";
import { QboDocNumberInspection } from "@/app/qbo/purchase/_lib/qboDocNumberInspectUtils";

export interface QboConnectionContract extends ApiContract {
  status: {
    params: Record<string, never>;
    result: DataResponse<QboConnectionStatus>;
  };
  startConnect: {
    params: Record<string, never>;
    result: DataResponse<{ authorizeUrl: string }>;
  };
  disconnect: {
    params: Record<string, never>;
    result: DataResponse<QboDisconnectResult>;
  };
  testConnection: {
    params: Record<string, never>;
    result: DataResponse<QboConnectionTestResult>;
  };
  // Read-only diagnostic for the DocNumber (Ref no.) design. Stores nothing.
  inspectDocNumber: {
    params: { docNumber: string };
    result: DataResponse<QboDocNumberInspection>;
  };
}
