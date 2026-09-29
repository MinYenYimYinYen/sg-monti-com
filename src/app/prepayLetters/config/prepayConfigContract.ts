import type { ApiContract } from "@/lib/api/types/ApiContract";
import type { DataResponse } from "@/lib/api/types/responses";
import type { PrepayConfigDoc } from "./prepayConfigTypes";

export interface PrepayConfigContract extends ApiContract {
  /** Fetch all saved configs — visible to all authenticated users. */
  getConfigs: {
    params: Record<string, never>;
    result: DataResponse<PrepayConfigDoc[]>;
  };

  /**
   * Create or overwrite a config.
   * `configId` is generated server-side from `name + saId`.
   * On overwrite, the caller must be the owner or admin.
   */
  saveConfig: {
    params: {
      config: PrepayConfigDoc;
    };
    result: DataResponse<PrepayConfigDoc>;
  };

  /** Delete a config. Caller must be the owner or admin. */
  deleteConfig: {
    params: {
      configId: string;
    };
    result: DataResponse<null>;
  };
}
