import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { CapabilityBundleDoc } from "@/app/permission/capabilityBundle/CapabilityBundleTypes";
import { UserCapabilitiesDoc } from "@/app/permission/userCapabilities/UserCapabilitiesTypes";

export interface CapabilityBundleContract extends ApiContract {
  getAll: {
    params: Record<string, never>;
    result: DataResponse<CapabilityBundleDoc[]>;
  };
  /**
   * Superuser only. `capabilities` is plain strings because it is untrusted input: saveBundle
   * rejects any the registry does not know. The result carries the holders whose direct grants
   * were removed because the bundle now lists them, so the client can update its copy.
   */
  upsert: {
    params: { bundleKey: string; name: string; description?: string; capabilities: string[] };
    result: DataResponse<{ bundle: CapabilityBundleDoc; updatedUsers: UserCapabilitiesDoc[] }>;
  };
  /** Superuser only. Refused while any user holds the bundle. */
  remove: {
    params: { bundleKey: string };
    result: DataResponse<boolean>;
  };
}
