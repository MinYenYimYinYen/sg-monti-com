import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { Holiday } from "@/app/holiday/holidayTypes";

export interface HolidayContract extends ApiContract {
  getAll: {
    params: Record<string, never>;
    result: DataResponse<Holiday[]>;
  };
  upsert: {
    params: { doc: Holiday };
    result: DataResponse<Holiday>;
  };
  deleteOne: {
    params: { holidayId: string };
    result: DataResponse<Holiday>;
  };
}
