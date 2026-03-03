import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

export type ConditionRaw = {
  id: string;
  description: string;
  letterID: string | null;
  available: boolean;
  categoryID: number;
  categoryDescription: string;
  customerTypeCustomerAction: string;
  upsellProgramType: number | null;
  isMobile: boolean;
  anyBranch: boolean;
  sendEmail: boolean;
  estimateText: string;
  discount: string;
  descriptionF: string;
  descriptionS: string;
  sortOrder: number;
  customerActionF: string;
  customerActionS: string;
  estimateTextf: string;
  estimateTexts: string;
  internalUse: boolean;
};

export type ConditionCore = {
  conditionId: string;
  desc: string;
  available: boolean;
};

export type ConditionDocProps = CreatedUpdated & {
  conditionId: string;
  upsellProgCodeIds: string[];
};

export type ConditionDoc = ConditionCore & ConditionDocProps;

export type ConditionProps = {
};

export type Condition = ConditionDoc & ConditionProps;


