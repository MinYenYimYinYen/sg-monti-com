import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { RouteNote } from "@/app/routeNotes/RouteNoteTypes";

export interface RouteNoteContract extends ApiContract {
  getByDateRange: {
    params: { minDate: string; maxDate: string };
    result: DataResponse<RouteNote[]>;
  };
  upsert: {
    params: { doc: RouteNote };
    result: DataResponse<RouteNote>;
  };
  deleteOne: {
    params: { routeNoteId: string };
    result: DataResponse<RouteNote>;
  };
}
