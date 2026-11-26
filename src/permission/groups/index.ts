import type { GroupDefinition } from "@/permission/groupTypes";
import { accountingGroup } from "@/permission/groups/accounting";
import { aiAssistantGroup } from "@/permission/groups/aiAssistant";
import { customerContactGroup } from "@/permission/groups/customerContact";
import { knowledgeBaseTopicsGroup } from "@/permission/groups/knowledgeBaseTopics";
import { realGreenCustomersGroup } from "@/permission/groups/realGreenCustomers";
import { realGreenMetadataGroup } from "@/permission/groups/realGreenMetadata";
import { realGreenProductsGroup } from "@/permission/groups/realGreenProducts";
import { schedulingGroup } from "@/permission/groups/scheduling";
import { siteAdminGroup } from "@/permission/groups/siteAdmin";
import { studyGroup } from "@/permission/groups/study";

// The permission tree: every group, in the order the admin screens list them. Each group lives in
// its own file in this folder (defineGroup, see ../groupTypes.ts) and is added to this list.
// Resource keys are unique across all groups; the registry throws on a repeat when it loads.
export const permissionGroups = [
  realGreenMetadataGroup,
  realGreenProductsGroup,
  realGreenCustomersGroup,
  schedulingGroup,
  accountingGroup,
  customerContactGroup,
  knowledgeBaseTopicsGroup,
  studyGroup,
  aiAssistantGroup,
  siteAdminGroup,
] as const satisfies readonly GroupDefinition[];
