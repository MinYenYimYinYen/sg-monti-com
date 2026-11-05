import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import {
  QboConnectionStatus,
  QboConnectionTestResult,
  QboDisconnectResult,
} from "@/app/qbo/connection/types/QboConnectionTypes";

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
}
