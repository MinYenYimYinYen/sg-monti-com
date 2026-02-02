import { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";

export type ConditionUpsell = {
  progCodeId: string; // ConditionDocProps maintains array of progCodeIds (order matters)
  progCode?: ProgCode;
  upsellMessage: string;

  // this will still need a function. Depends on which progCodes the customer has.
  // If condition suggests 2 prog codes and customer has 1, then message should not
  // re-sell the one they already have.
  precludedProgCodeIds: string[]; // now ProgCode maintains its precluded Ids
  precludedProgCodes?: ProgCode[]; // now ProgCode maintains its precluded Ids
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
