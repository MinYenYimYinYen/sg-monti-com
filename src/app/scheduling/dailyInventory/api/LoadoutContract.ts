import { ApiContract } from "@/lib/api/types/ApiContract";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { DataResponse } from "@/lib/api/types/responses";
import { LoadoutDoc } from "@/app/loadout/LoadoutTypes";

export type LoadoutKey = { employeeId: string; routeDate: string };

export interface LoadoutContract extends ApiContract {
  getLoadouts: {
    params: { dateRange: TRange<string> }
    result: DataResponse<LoadoutDoc[]>
  }

  getLoadout: {
    params: { employeeId: string; routeDate: string }
    result: DataResponse<LoadoutDoc | null>
  }

  upsertLoadout: {
    params: { loadout: LoadoutDoc }
    result: DataResponse<LoadoutDoc>
  }

  getLoadoutKeys: {
    params: { dateRange: TRange<string> }
    result: DataResponse<LoadoutKey[]>
  }
}
