import { ConditionTextTemplate } from "@/app/realGreen/conditionCode/types/ConditionTextTemplate";
import { ConditionSetting } from "@/app/realGreen/conditionCode/types/ConditionSetting";
import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { Grouper } from "@/lib/Grouper";

export type RawConditionCode = {
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

export type RemappedConditionCode = {
  conditionCodeId: string;
  available: boolean;
};

export type MongoConditionCode = CreatedUpdated & {
  conditionCodeId: string;
  setting?: ConditionSetting;
  template?: ConditionTextTemplate;
};

export type ConditionCode = RemappedConditionCode & MongoConditionCode;

export function remapConditionCode(
  raw: RawConditionCode,
): RemappedConditionCode {
  return {
    conditionCodeId: raw.id,
    available: raw.available,
  };
}

export function extendConditionCode({
  remapped,
  mongo,
}: {
  remapped: RemappedConditionCode;
  mongo?: MongoConditionCode;
}): ConditionCode {
  return {
    ...remapped,
    createdAt: mongo?.createdAt || "",
    updatedAt: mongo?.updatedAt || "",
    setting: mongo?.setting,
    template: mongo?.template,
  };
}

export function extendConditionCodes({
  remapped,
  mongo,
}: {
  remapped: RemappedConditionCode[];
  mongo: MongoConditionCode[];
}): ConditionCode[] {
  const mongoMap = new Grouper(mongo).toUniqueMap((e) => e.conditionCodeId);
  return remapped.map((r) =>
    extendConditionCode({
      remapped: r,
      mongo: mongoMap.get(r.conditionCodeId),
    }),
  );
}
