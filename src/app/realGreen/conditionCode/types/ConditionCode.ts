import { ConditionTextTemplate } from "@/app/realGreen/conditionCode/types/ConditionTextTemplate";
import { ConditionSetting } from "@/app/realGreen/conditionCode/types/ConditionSetting";
import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { Grouper } from "@/lib/Grouper";

export type ConditionCodeRaw = {
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
  conditionCodeId: string;
  desc: string;
  available: boolean;
};

export type ConditionDocProps = CreatedUpdated & {
  conditionCodeId: string;
};

export type ConditionDoc = ConditionCore & ConditionDocProps;

export type ConditionProps = {};

export type Condition = ConditionDoc & ConditionProps;

export function remapCondition(raw: ConditionCodeRaw): ConditionCore {
  return {
    conditionCodeId: raw.id,
    desc: raw.description,
    available: raw.available,
  };
}


// export function extendConditionCodes({
//   remapped,
//   mongo,
// }: {
//   remapped: ConditionCodeCore[];
//   mongo: ConditionCodeDocProps[];
// }): ConditionCode[] {
//
// }
