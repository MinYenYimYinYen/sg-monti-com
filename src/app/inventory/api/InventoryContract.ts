import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { InventoryCheckDoc } from "@/app/inventory/InventoryTypes";

export interface InventoryContract extends ApiContract {
  getInventoryChecks: {
    params: {};
    result: DataResponse<InventoryCheckDoc[]>;
  };
  saveInventoryCheck: {
    params: { check: InventoryCheckDoc };
    result: DataResponse<InventoryCheckDoc>;
  };
}
