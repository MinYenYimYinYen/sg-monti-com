import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { UserCapabilitiesDoc } from "@/app/permission/userCapabilities/UserCapabilitiesTypes";
import type { Capability } from "@/permission/PermissionTypes";
import type { UserSummary } from "@/permission/logic/userSummary";

export interface UserCapabilitiesContract extends ApiContract {
  /**
   * Every user, as a safe summary (no password hash or email), so the screens can show users who
   * have no capabilities document yet, such as a brand-new applied user.
   */
  listUsers: {
    params: Record<string, never>;
    result: DataResponse<UserSummary[]>;
  };
  /** Every user's assignments, for the admin UI. Users with no document are not listed. */
  getAll: {
    params: Record<string, never>;
    result: DataResponse<UserCapabilitiesDoc[]>;
  };
  /**
   * The caller's own resolved capabilities (bundles plus direct, flat), for <Can>. Public so an
   * applied user (no capabilities) gets an empty list instead of a refusal; the handler verifies
   * the cookie itself. A superuser gets `isSuperUser` and an empty list, since the bypass is not
   * a capability.
   */
  getMine: {
    params: Record<string, never>;
    result: DataResponse<{ capabilities: Capability[]; isSuperUser: boolean }>;
  };
  assignBundle: {
    params: { userName: string; bundleKey: string };
    result: DataResponse<UserCapabilitiesDoc>;
  };
  removeBundle: {
    params: { userName: string; bundleKey: string };
    result: DataResponse<UserCapabilitiesDoc>;
  };
  /** Adds one or more direct grants in a single write, so a capability and what it needs stay together. */
  addDirect: {
    params: { userName: string; capabilities: string[] };
    result: DataResponse<UserCapabilitiesDoc>;
  };
  removeDirect: {
    params: { userName: string; capability: string };
    result: DataResponse<UserCapabilitiesDoc>;
  };
}
