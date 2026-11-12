import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import type { Capability } from "@/permission/PermissionTypes";

/**
 * A named list of capabilities that users reference by key (office, tech, baseline...). Stored
 * exactly as the superuser picked it: nothing is expanded or implied. `bundleKey` is the natural
 * key and never changes; `name` is the display label.
 */
export type CapabilityBundleDoc = CreatedUpdated & {
  bundleKey: string;
  name: string;
  description?: string;
  capabilities: Capability[];
};
