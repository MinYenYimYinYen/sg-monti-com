import { DataResponse, SuccessResponse } from "@/lib/api/types/responses";
import { ApiContract } from "@/lib/api/types/ApiContract";
import { ProductUnitConfig } from "@/app/realGreen/product/_lib/types/ProductUnitConfigTypes";

export interface UnitConfigContract extends ApiContract {
  /**
   * Get all unit configurations
   */
  getAll: {
    params: {};
    result: DataResponse<{ configs: ProductUnitConfig[] }>;
  };

  /**
   * Save or update unit configuration for a product
   */
  saveConfig: {
    params: { config: ProductUnitConfig };
    result: DataResponse<{config: ProductUnitConfig}>;
  };
}
