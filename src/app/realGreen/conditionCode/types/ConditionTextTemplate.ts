import {ProgramCode} from "@/app/realGreen/programCode/ProgramCode";

export type ConditionUpsell = {
  progCodeId: string;
  progCode?: ProgramCode;
  upsellMessage: string;
  precludedProgCodeIds: string[];
  precludedProgCodes?: ProgramCode[];
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
