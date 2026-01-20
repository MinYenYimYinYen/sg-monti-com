import {ProgCode} from "@/app/realGreen/progServ/_lib/types/ProgCode";

export type ConditionUpsell = {
  progCodeId: string;
  progCode?: ProgCode;
  upsellMessage: string;
  precludedProgCodeIds: string[];
  precludedProgCodes?: ProgCode[];
  dontTextIfPrecluded: boolean;
};

export type ConditionTextTemplate = {
  textTemplateId: string;
  variables: string[];
  message: string;

  conditionUpsells: ConditionUpsell[];
};

export const baseConditionUpsell: ConditionUpsell = {
  progCodeId: "",
  upsellMessage: "",
  precludedProgCodeIds: [],
  dontTextIfPrecluded: false,
  // precludedServCodes: [],
};

export const baseConditionTextTemplate: ConditionTextTemplate = {
  textTemplateId: "",
  variables: [],
  message: "",

  conditionUpsells: [],
};
