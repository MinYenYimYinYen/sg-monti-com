export type ConditionSetting = {
  conditionId: string;
  sendText: boolean;
  textTemplateId: string;
};

export const baseConditionSetting: ConditionSetting = {
  conditionId: "",
  sendText: false,
  textTemplateId: "",
};