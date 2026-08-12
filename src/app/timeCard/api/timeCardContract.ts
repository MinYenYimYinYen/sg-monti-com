import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { Punch } from "@/app/timeCard/TimeCardTypes";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { WriteError } from "mongodb";

export interface TimeCardContract extends ApiContract {
  importPunches: {
    params: { punches: Punch[] };
    result: DataResponse<{ imported: number; errors: WriteError[] | null }>;
  };
  getPunches: {
    params: { employeeIds?: string[]; dateRange?: TRange<string> };
    result: DataResponse<Punch[]>;
  };
}
