export type DataFeatureDef = {
  key: string;
  label: string;
  description: string;
};

export const DATA_FEATURE_DEFS = [
  {
    key: "custIdSearch",
    label: "Customer Lookup",
    description:
      "Adds a customer ID input to the send view. Enables @-mention variables.",
  },
  {
    key: "season",
    label: "Season",
    description: "Enables @season variable.",
  },
] as const satisfies readonly DataFeatureDef[];

export type DataFeatureKey = (typeof DATA_FEATURE_DEFS)[number]["key"];
